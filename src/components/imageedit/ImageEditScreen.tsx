import { useState, useRef, useEffect, useMemo } from "react"
import { View, StyleSheet, Platform, useWindowDimensions, Text, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  Canvas,
  Group,
  Image as SkiaImage,
  Path,
  ColorMatrix,
  useCanvasRef,
  useImage,
  matchFont,
  Paragraph,
  Skia,RoundedRect,
} from "@shopify/react-native-skia"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { buildColorMatrix } from "./ColorMatrices"
import { initialEditState, EditHistory, initialHistory } from "@/types/ImageEditor"
import type { EditState, EditTool, CropRect } from "@/types/ImageEditor"
import { exportImage } from "@/utils/exportImage"
import { CropOverlay } from "./Cropoverlay"
import { TextTouchLayer } from "./TexttouchLayer"
import { TextInputModal } from "./Textinputmodal"
import { DrawTouchLayer } from "./Drawtouchlayer"
import { EditorToolbar } from "./EditToolbar"
import { useTheme } from "@/hooks/useTheme"
import SoundSearchModal, { type SelectedSound } from "../createpost/SoundModal"
import { Radius } from "@/constants/colors"
const ACTIVE_TEXT_OPACITY = 0.3
type Props = {
  imageUris: string[]
  onCancel: () => void
  // The second argument is optional, so existing callers of the form
  // (uris) => ... keep working. It is the sound the user picked, or null.
  onDone: (finalUris: string[], idd?: SelectedSound | null) => void
  isMessageScreen?: boolean
}

const TOOLBAR_ESTIMATE = 260 // rough height reserved for the bottom toolbar
const TOP_BAR_HEIGHT = 40 // always rendered now, because it holds the sound button

export function ImageEditScreen({ imageUris, onCancel, onDone, isMessageScreen }: Props) {
  const canvasRef = useCanvasRef()
  const [currentIndex, setCurrentIndex] = useState(0)
  const imageUri = imageUris[currentIndex]
  const [songModalVisisble, setsongModalVisisble] = useState<boolean>(false)
  const skImage = useImage(imageUri)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const theme = useTheme()
  const canvasWidth = screenWidth
  const canvasHeight = screenHeight - TOOLBAR_ESTIMATE - TOP_BAR_HEIGHT
  const [activeTextId, setActiveTextId] = useState<string | null>(null)
  const [edits, setEdits] = useState<EditState>(initialEditState)
  const [history, setHistory] = useState<EditHistory>(initialHistory)
  const [activeTool, setActiveTool] = useState<EditTool>(null)
  const [drawColor, setDrawColor] = useState("#ffffff")
  const [textColor, setTextColor] = useState("#ffffff")
  const [currentStroke, setCurrentStroke] = useState<string | null>(null)
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null)
  const [exporting, setExporting] = useState(false)

  /* ------------------------------ sound playback ------------------------------ */

  // One sound for the whole post. It is not part of the per-image state above,
  // so moving between images (goTo) never touches it and playback never restarts.
  const [selectedSound, setSelectedSound] = useState<SelectedSound | null>(null)
  const soundSource = useMemo(
    () => (selectedSound ? { uri: selectedSound.url } : null),
    [selectedSound?.id, selectedSound?.url]
  )
  const player = useAudioPlayer(soundSource)
  const soundStatus = useAudioPlayerStatus(player)
  const playerRef = useRef(player)
  playerRef.current = player

  const pauseSound = () => {
    try {
      playerRef.current.pause()
    } catch {
      // already released
    }
  }

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => { })
  }, [])

  // Start (and keep) looping as soon as the chosen sound has loaded.
  useEffect(() => {
    if (selectedSound && soundStatus.isLoaded) {
      player.loop = true
      player.play()
    }
  }, [selectedSound?.id, soundStatus.isLoaded, player])
  useEffect(() => {
    if (songModalVisisble) pauseSound()
    else if (selectedSound && soundStatus.isLoaded) playerRef.current.play()
  }, [songModalVisisble])
  // Never leave audio running when the editor goes away.
  useEffect(() => {
    return () => pauseSound()
  }, [])

  const removeSound = () => {
    pauseSound()
    setSelectedSound(null)
  }

  const handleCancel = () => {
    pauseSound()
    onCancel()
  }

  /* ------------------------------- per-image state ------------------------------ */

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
      const p = Skia.ParagraphBuilder.Make({ textAlign: 0 })
        .pushStyle({
          color: Skia.Color(t.color),
          fontSize: t.fontSize,
          fontFamilies: textFamilies,
          fontStyle: { weight: 700 },
        })
        .addText(t.text)
        .pop()
        .build()
      p.layout(canvasWidth) // needed before measuring
      return {
        id: t.id,
        x: t.x,
        y: t.y,
        fontSize: t.fontSize,
        paragraph: p,
        width: p.getLongestLine(),
        height: p.getHeight(),
      }
    }),
  [edits.textLayers, canvasWidth]
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
        pauseSound()
        onDone(exportedUris.current as string[], selectedSound)
      } else {
        goTo(currentIndex + 1)
      }
    } finally {
      setExporting(false)
    }
  }
  // Live size while pinching: not committed (handleTextMoveEnd commits once on release)
  const handleResizeTextLayer = (id: string, fontSize: number) => {
    setEdits((e) => ({
      ...e,
      textLayers: e.textLayers.map((l) => (l.id === id ? { ...l, fontSize } : l)),
    }))
  }

  const handleDeleteTextLayer = (id: string) => {
    commitEdits({ ...edits, textLayers: edits.textLayers.filter((l) => l.id !== id) })
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
      {/* always shown, so a single-image post can add a sound too */}
      <View style={styles.topBar}>
        <Text style={styles.counterText}>
          {imageUris.length > 1 ? `Editing ${currentIndex + 1} of ${imageUris.length}` : ""}
        </Text>

        <View style={styles.soundWrap}>
          {!isMessageScreen && <TouchableOpacity
            style={[styles.soundBtn, { backgroundColor: theme.primary }]}
            onPress={() => setsongModalVisisble(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={selectedSound ? `Change sound, current: ${selectedSound.title}` : "Add sound"}
          >
            <Text style={styles.soundBtnText} numberOfLines={1}>
              {selectedSound ? selectedSound.title : "Add sound"}
            </Text>
          </TouchableOpacity>}

          {selectedSound && (
            <TouchableOpacity
              onPress={removeSound}
              hitSlop={10}
              style={styles.removeBtn}
              accessibilityRole="button"
              accessibilityLabel="Remove sound"
            >
              <Text style={styles.removeText}>x</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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

            {paragraphs.map((p) => {
  const active = p.id === activeTextId
  const top = p.y - p.fontSize
  return (
    <Group key={p.id}>
      {active && (
        <>
          <RoundedRect
            x={p.x - 8}
            y={top - 6}
            width={p.width + 16}
            height={p.height + 12}
            r={8}
            color="rgba(255,255,255,0.18)"
          />
          <RoundedRect
            x={p.x - 8}
            y={top - 6}
            width={p.width + 16}
            height={p.height + 12}
            r={8}
            color="rgba(255,255,255,0.9)"
            style="stroke"
            strokeWidth={1.5}
          />
        </>
      )}
      <Group opacity={active ? ACTIVE_TEXT_OPACITY : 1}>
        <Paragraph paragraph={p.paragraph} x={p.x} y={top} width={canvasWidth} />
      </Group>
    </Group>
  )
})}
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
            onResizeLayer={handleResizeTextLayer}
            onDeleteLayer={handleDeleteTextLayer}
            onActiveChange={setActiveTextId}
          />
        )}
      </View>

      <EditorToolbar
        edits={edits}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onChange={commitEdits}
        onCancel={handleCancel}
        onDone={handleDone}
        doneLabel={imageUris.length > 1 && !isLastImage ? "Next" : isLastImage && isMessageScreen ? "Send" : "Done"}
        onPrevious={imageUris.length > 1 && !isFirstImage ? handlePrevious : undefined}
        drawColor={drawColor}
        onDrawColorChange={setDrawColor}
        textColor={textColor}
        onTextColorChange={setTextColor}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isMessageScreen={isMessageScreen}
      />

      <TextInputModal
        visible={!!pendingTextPos}
        onSubmit={handleTextSubmit}
        onCancel={() => setPendingTextPos(null)}
      />
      <SoundSearchModal
        isVisible={songModalVisisble}
        onClose={() => setsongModalVisisble(false)}
        onSelect={(sound) => setSelectedSound(sound)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loading: { flex: 1 },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  counterText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
  soundWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#726d6d", borderRadius: Radius.md },
  soundBtn: {
    maxWidth: 190,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  soundBtnText: { fontWeight: "700", color: "#fff" },
  removeBtn: { paddingHorizontal: 4 },
  removeText: { color: "#fff", fontSize: 20, fontWeight: "300" },
})