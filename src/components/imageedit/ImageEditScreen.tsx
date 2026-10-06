import { useState, useRef, useEffect, useMemo } from "react"
import { View, StyleSheet, Platform, useWindowDimensions, BackHandler, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  Canvas,
  Group,
  Image as SkiaImage,
  Path,
  Text as SkiaText,
  ColorMatrix,
  useCanvasRef,
  useImage,
  matchFont,
  Paragraph, Skia

} from "@shopify/react-native-skia"

import { buildColorMatrix } from "./ColorMatrices"
import { initialEditState, EditHistory, initialHistory } from "@/types/ImageEditor"
import type { EditState, EditTool, CropRect } from "@/types/ImageEditor"
import { exportImage } from "@/utils/exportImage"
import { CropOverlay } from "./Cropoverlay"
import { TextTouchLayer } from "./TexttouchLayer"
import { TextInputModal } from "./Textinputmodal"
import { DrawTouchLayer } from "./Drawtouchlayer"
import { EditorToolbar } from "./EditToolbar"



type Props = {
  imageUris: string[]
  onCancel: () => void
  onDone: (finalUris: string[]) => void
}

const TOOLBAR_ESTIMATE = 260 // rough height reserved for the bottom toolbar
const COUNTER_BAR_HEIGHT = 32

export function ImageEditScreen({ imageUris, onCancel, onDone }: Props) {
  const canvasRef = useCanvasRef()
  const [currentIndex, setCurrentIndex] = useState(0)
  const imageUri = imageUris[currentIndex]
  const skImage = useImage(imageUri)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()

  const canvasWidth = screenWidth
  const canvasHeight = screenHeight - TOOLBAR_ESTIMATE - (imageUris.length > 1 ? COUNTER_BAR_HEIGHT : 0)

  const [edits, setEdits] = useState<EditState>(initialEditState)
  const [history, setHistory] = useState<EditHistory>(initialHistory)
  const [activeTool, setActiveTool] = useState<EditTool>(null)
  const [drawColor, setDrawColor] = useState("#ffffff")
  const [textColor, setTextColor] = useState("#ffffff")
  const [currentStroke, setCurrentStroke] = useState<string | null>(null)
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null)
  const [exporting, setExporting] = useState(false)

  // Per-image state, indexed by position (not append-only) so moving
  // backward with Previous and re-exporting after further edits doesn't
  // corrupt the final ordering. Refs, not state — switching images updates
  // `edits` (the reactive one) directly via goTo(), these are just storage.
  const perImageEdits = useRef<EditState[]>(imageUris.map(() => initialEditState))
  const perImageHistory = useRef<EditHistory[]>(imageUris.map(() => initialHistory))
  const exportedUris = useRef<(string | null)[]>(imageUris.map(() => null))

  // Jump to a given image index, saving the outgoing image's edit state
  // (and undo history) and restoring the target image's — so Previous
  // doesn't lose work, and undo/redo stays scoped per image.
  const goTo = (nextIndex: number) => {
    perImageEdits.current[currentIndex] = edits
    perImageHistory.current[currentIndex] = history
    setCurrentIndex(nextIndex)
    setEdits(perImageEdits.current[nextIndex])
    setHistory(perImageHistory.current[nextIndex])
    setActiveTool(null)
    setCurrentStroke(null)
    setPendingTextPos(null)
  }

  // The one place a "committed" edit is applied: updates the live edits
  // AND pushes a new undo/redo step. Anything the user should be able to
  // undo (a finished stroke, adding text, rotate, filter, contrast, a
  // finished crop drag) goes through this — not setEdits directly.
  // If the user had undone and then makes a new edit, future (redo) states
  // are discarded, same as any standard undo stack.
  const commitEdits = (nextState: EditState) => {
    setEdits(nextState)
    setHistory((h) => {
      const truncated = h.stack.slice(0, h.pointer + 1)
      const stack = [...truncated, nextState]
      return { stack, pointer: stack.length - 1 }
    })
  }

  const canUndo = history.pointer > 0
  const canRedo = history.pointer < history.stack.length - 1

  const handleUndo = () => {
    if (!canUndo) return
    const pointer = history.pointer - 1
    setEdits(history.stack[pointer])
    setHistory((h) => ({ ...h, pointer }))
  }
  const textFamilies = Platform.select({
    ios: ["Helvetica", "Apple Color Emoji"],
    default: ["sans-serif", "Roboto", "Noto Color Emoji"],
  })!

  const paragraphs = useMemo(
    () =>
      edits.textLayers.map((t) => {
        const p = Skia.ParagraphBuilder.Make({ textAlign: 0 /* TextAlign.Left */ })
          .pushStyle({
            color: Skia.Color(t.color),
            fontSize: t.fontSize,
            fontFamilies: textFamilies,
            fontStyle: { weight: 700 },
          })
          .addText(t.text)
          .pop()
          .build()
        return { id: t.id, x: t.x, y: t.y, fontSize: t.fontSize, paragraph: p }
      }),
    [edits.textLayers]
  )
  const handleRedo = () => {
    if (!canRedo) return
    const pointer = history.pointer + 1
    setEdits(history.stack[pointer])
    setHistory((h) => ({ ...h, pointer }))
  }

  const font = matchFont({
    fontFamily: Platform.select({ ios: "Helvetica", android: "sans-serif", default: "sans-serif" }),
    fontSize: 28,
    fontWeight: "bold",
  })

  if (__DEV__ && !font) {
    console.warn(
      "ImageEditScreen: matchFont returned null — text layers won't render. Check the font family is installed on this device/simulator."
    )
  }

  const colorMatrix = buildColorMatrix(edits.filter, edits.contrast)

  const handleDrawEnd = (svgPath: string) => {
    if (svgPath) {
      commitEdits({
        ...edits,
        drawPaths: [
          ...edits.drawPaths,
          { id: String(Date.now()), svgPath, color: drawColor, strokeWidth: 5 },
        ],
      })
    }
    setCurrentStroke(null)
  }

  const handleTextSubmit = (text: string) => {
    if (text && pendingTextPos) {
      commitEdits({
        ...edits,
        textLayers: [
          ...edits.textLayers,
          {
            id: String(Date.now()),
            text,
            x: pendingTextPos.x,
            y: pendingTextPos.y,
            color: textColor,
            fontSize: 28,
          },
        ],
      })
    }
    setPendingTextPos(null)
  }

  // Live position while dragging — NOT committed to history (would flood
  // the undo stack with every pixel of movement). handleTextMoveEnd below
  // commits once, when the finger lifts.
  const handleMoveTextLayer = (id: string, x: number, y: number) => {
    setEdits((e) => ({
      ...e,
      textLayers: e.textLayers.map((l) => (l.id === id ? { ...l, x, y } : l)),
    }))
  }

  const handleTextMoveEnd = () => {
    commitEdits(edits)
  }

  // Live rect while dragging — NOT committed to history, same reasoning
  // as text-drag above. handleCropCommit below fires once on release, and
  // takes the final rect directly rather than trusting `edits.cropRect`
  // might have caught up yet.
  const handleCropChange = (rect: CropRect) => {
    setEdits((e) => ({ ...e, cropRect: rect }))
  }

  const handleCropCommit = (rect: CropRect) => {
    commitEdits({ ...edits, cropRect: rect })
  }

  const isLastImage = currentIndex === imageUris.length - 1
  const isFirstImage = currentIndex === 0

  const handleDone = async () => {
    try {
      setExporting(true)
      const uri = await exportImage(canvasRef, edits, { width: canvasWidth, height: canvasHeight })
      exportedUris.current[currentIndex] = uri
      perImageEdits.current[currentIndex] = edits

      if (isLastImage) {
        onDone(exportedUris.current as string[])
      } else {
        goTo(currentIndex + 1)
      }
    } finally {
      setExporting(false)
    }
  }

  const handlePrevious = () => {
    if (!isFirstImage) goTo(currentIndex - 1)
  }

  if (!skImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading} />
      </SafeAreaView>
    )
  }

  // Fit the image inside the canvas, preserving aspect ratio.
  const imgW = skImage.width()
  const imgH = skImage.height()
  const scale = Math.min(canvasWidth / imgW, canvasHeight / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  const offsetX = (canvasWidth - drawW) / 2
  const offsetY = (canvasHeight - drawH) / 2

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {imageUris.length > 1 && (
        <View style={styles.counterBar}>
          <Text style={styles.counterText}>
            Editing {currentIndex + 1} of {imageUris.length}
          </Text>
        </View>
      )}
      <View style={{ width: canvasWidth, height: canvasHeight }}>
        <Canvas ref={canvasRef} style={{ width: canvasWidth, height: canvasHeight }}>
          <Group
            transform={[
              { translateX: canvasWidth / 2 },
              { translateY: canvasHeight / 2 },
              { rotate: (edits.rotation * Math.PI) / 180 },
              { translateX: -canvasWidth / 2 },
              { translateY: -canvasHeight / 2 },
            ]}
          >
            <SkiaImage
              image={skImage}
              x={offsetX}
              y={offsetY}
              width={drawW}
              height={drawH}
              fit="contain"
            >
              <ColorMatrix matrix={colorMatrix} />
            </SkiaImage>

            {edits.drawPaths.map((p) => (
              <Path
                key={p.id}
                path={p.svgPath}
                color={p.color}
                style="stroke"
                strokeWidth={p.strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
            {currentStroke && (
              <Path
                path={currentStroke}
                color={drawColor}
                style="stroke"
                strokeWidth={5}
                strokeCap="round"
                strokeJoin="round"
              />
            )}

            {paragraphs.map((p) => (
              <Paragraph
                key={p.id}
                paragraph={p.paragraph}
                x={p.x}
                y={p.y - p.fontSize}   // Paragraph y = top; SkiaText y = baseline
                width={canvasWidth}
              />
            ))}
          </Group>
        </Canvas>

        {/* touch overlays — only one is mounted at a time, matching activeTool */}
        {activeTool === "crop" && (
          <CropOverlay
            containerWidth={canvasWidth}
            containerHeight={canvasHeight}
            value={edits.cropRect}
            onChange={handleCropChange}
            onChangeEnd={handleCropCommit}
          />
        )}
        {activeTool === "draw" && (
          <DrawTouchLayer
            enabled
            onStrokeUpdate={setCurrentStroke}
            onStrokeEnd={handleDrawEnd}
          />
        )}
        {activeTool === "text" && (
          <TextTouchLayer
            enabled
            layers={edits.textLayers}
            onTapEmpty={(x, y) => setPendingTextPos({ x, y })}
            onMoveLayer={handleMoveTextLayer}
            onMoveEnd={handleTextMoveEnd}
          />
        )}
      </View>

      <EditorToolbar
        edits={edits}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onChange={commitEdits}
        onCancel={onCancel}
        onDone={handleDone}
        doneLabel={imageUris.length > 1 && !isLastImage ? "Next" : "Done"}
        onPrevious={imageUris.length > 1 && !isFirstImage ? handlePrevious : undefined}
        drawColor={drawColor}
        onDrawColorChange={setDrawColor}
        textColor={textColor}
        onTextColorChange={setTextColor}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <TextInputModal
        visible={!!pendingTextPos}
        onSubmit={handleTextSubmit}
        onCancel={() => setPendingTextPos(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loading: { flex: 1 },
  counterBar: {
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
})