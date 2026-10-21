import { useRef, useEffect, useState } from "react"
import { View, Text, PanResponder, StyleSheet, type LayoutChangeEvent } from "react-native"
import type { TextLayer } from "@/types/ImageEditor"

type Props = {
  enabled: boolean
  layers: TextLayer[]
  onTapEmpty: (x: number, y: number) => void
  onMoveLayer: (id: string, x: number, y: number) => void
  onMoveEnd?: () => void
  /** live font size while pinching (not committed to history) */
  onResizeLayer: (id: string, fontSize: number) => void
  /** called once when a layer is dropped on the trash */
  onDeleteLayer: (id: string) => void
  /** id of the layer the finger is currently holding, or null */
  onActiveChange?: (id: string | null) => void
}

const GRAB_SLOP = 30 // extra px around a text box that still counts as a hit
const MIN_FONT = 12
const MAX_FONT = 160
const TAP_MOVE_TOLERANCE = 8

const TRASH_SIZE = 56
const TRASH_SIZE_ACTIVE = 76
const TRASH_SLOP_IDLE = 30 // finger must be this close (beyond the icon radius) to "enter" the trash
const TRASH_SLOP_HOVER = 70 // once inside, the zone grows so the finger doesn't flicker out
const TRASH_BOTTOM_OFFSET = 90

type Touch = { locationX: number; locationY: number; pageX: number; pageY: number }

// Approximate bounds: text layer x/y is the left baseline, and the Paragraph
// is drawn at y - fontSize (top). Width is estimated from the longest line.
function hitTest(layers: TextLayer[], x: number, y: number, slop: number) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    const lines = l.text.split("\n")
    const longest = Math.max(...lines.map((s) => s.length), 1)
    const left = l.x
    const top = l.y - l.fontSize
    const right = l.x + longest * l.fontSize * 0.6
    const bottom = top + lines.length * l.fontSize * 1.25
    if (x >= left - slop && x <= right + slop && y >= top - slop && y <= bottom + slop) {
      return l // top-most layer wins
    }
  }
  return undefined
}

const pinchDistance = (a: Touch, b: Touch) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)

export function TextTouchLayer({
  enabled,
  layers,
  onTapEmpty,
  onMoveLayer,
  onMoveEnd,
  onResizeLayer,
  onDeleteLayer,
  onActiveChange,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [showTrash, setShowTrash] = useState(false)
  const [overTrash, setOverTrash] = useState(false)

  const sizeRef = useRef(size)
  sizeRef.current = size

  const draggingId = useRef<string | null>(null)
  const lastId = useRef<string | null>(null) // last touched layer, so a pinch on empty space still works
  const startTouch = useRef({ x: 0, y: 0 })
  const startLayerPos = useRef({ x: 0, y: 0 })
  const tapStart = useRef({ x: 0, y: 0 })
  const moved = useRef(false)
  const didPinch = useRef(false)
  const pinching = useRef(false)
  const pinchStartDist = useRef(1)
  const pinchStartFont = useRef(28)
  const overTrashRef = useRef(false)

  // See DrawTouchLayer: PanResponder.create runs once, so read props via a ref.
  const latest = useRef({ layers, onTapEmpty, onMoveLayer, onMoveEnd, onResizeLayer, onDeleteLayer, onActiveChange })
  useEffect(() => {
    latest.current = { layers, onTapEmpty, onMoveLayer, onMoveEnd, onResizeLayer, onDeleteLayer, onActiveChange }
  }, [layers, onTapEmpty, onMoveLayer, onMoveEnd, onResizeLayer, onDeleteLayer, onActiveChange])

  const trashCenter = () => ({
    x: sizeRef.current.width / 2,
    y: sizeRef.current.height - TRASH_BOTTOM_OFFSET,
  })

  const isInTrash = (x: number, y: number, alreadyOver: boolean) => {
    const c = trashCenter()
    const radius = (alreadyOver ? TRASH_SIZE_ACTIVE : TRASH_SIZE) / 2
    const slop = alreadyOver ? TRASH_SLOP_HOVER : TRASH_SLOP_IDLE
    return Math.hypot(x - c.x, y - c.y) < radius + slop
  }

  const setOver = (value: boolean) => {
    if (overTrashRef.current === value) return
    overTrashRef.current = value
    setOverTrash(value)
  }

  const beginDrag = (layer: TextLayer, t: Touch) => {
    draggingId.current = layer.id
    lastId.current = layer.id
    startTouch.current = { x: t.locationX, y: t.locationY }
    startLayerPos.current = { x: layer.x, y: layer.y }
    latest.current.onActiveChange?.(layer.id)
    setShowTrash(true)
  }

  const finish = (cancelled: boolean) => {
    const id = draggingId.current
    if (id) {
      if (!cancelled && overTrashRef.current && !pinching.current) {
        latest.current.onDeleteLayer(id)
      } else {
        latest.current.onMoveEnd?.() // commits move and/or resize in one history step
      }
    } else if (!cancelled && !moved.current && !didPinch.current) {
      latest.current.onTapEmpty(tapStart.current.x, tapStart.current.y)
    }
    draggingId.current = null
    pinching.current = false
    didPinch.current = false
    moved.current = false
    setOver(false)
    setShowTrash(false)
    latest.current.onActiveChange?.(null)
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onPanResponderGrant: (evt) => {
        const t = evt.nativeEvent.touches[0] as unknown as Touch
        tapStart.current = { x: t.locationX, y: t.locationY }
        moved.current = false
        didPinch.current = false
        pinching.current = false
        const hit = hitTest(latest.current.layers, t.locationX, t.locationY, GRAB_SLOP)
        if (hit) beginDrag(hit, t)
        else draggingId.current = null
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches as unknown as Touch[]

        /* ------------------------------ two fingers: resize ----------------------------- */
        if (touches.length >= 2) {
          if (!pinching.current) {
            let layer = draggingId.current
              ? latest.current.layers.find((l) => l.id === draggingId.current)
              : undefined
            if (!layer) {
              layer =
                hitTest(latest.current.layers, touches[0].locationX, touches[0].locationY, GRAB_SLOP) ??
                hitTest(latest.current.layers, touches[1].locationX, touches[1].locationY, GRAB_SLOP) ??
                latest.current.layers.find((l) => l.id === lastId.current)
            }
            if (!layer) return
            pinching.current = true
            didPinch.current = true
            draggingId.current = layer.id
            lastId.current = layer.id
            pinchStartDist.current = Math.max(pinchDistance(touches[0], touches[1]), 1)
            pinchStartFont.current = layer.fontSize
            setOver(false)
            setShowTrash(false) // no trash while pinching
            latest.current.onActiveChange?.(layer.id)
            return
          }
          const ratio = pinchDistance(touches[0], touches[1]) / pinchStartDist.current
          const next = Math.min(MAX_FONT, Math.max(MIN_FONT, pinchStartFont.current * ratio))
          latest.current.onResizeLayer(draggingId.current!, next)
          return
        }

        /* --------------------------------- one finger: drag ------------------------------ */
        const t = touches[0]
        if (!t) return

        if (Math.hypot(t.locationX - tapStart.current.x, t.locationY - tapStart.current.y) > TAP_MOVE_TOLERANCE) {
          moved.current = true
        }
        if (!draggingId.current) return

        // went from two fingers back to one: re-anchor so the text doesn't jump
        if (pinching.current) {
          pinching.current = false
          const layer = latest.current.layers.find((l) => l.id === draggingId.current)
          if (layer) {
            startTouch.current = { x: t.locationX, y: t.locationY }
            startLayerPos.current = { x: layer.x, y: layer.y }
          }
          setShowTrash(true)
          return
        }

        // Once grabbed, the drag is locked to this layer's id, so the finger can
        // wander anywhere without losing it.
        latest.current.onMoveLayer(
          draggingId.current,
          startLayerPos.current.x + (t.locationX - startTouch.current.x),
          startLayerPos.current.y + (t.locationY - startTouch.current.y)
        )
        setOver(isInTrash(t.locationX, t.locationY, overTrashRef.current))
      },
      onPanResponderRelease: () => finish(false),
      onPanResponderTerminate: () => finish(true),
    })
  ).current

  if (!enabled) return null

  const c = trashCenter()
  const trashSize = overTrash ? TRASH_SIZE_ACTIVE : TRASH_SIZE

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)}
      {...panResponder.panHandlers}
    >
      {showTrash && size.width > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.trash,
            {
              width: trashSize,
              height: trashSize,
              borderRadius: trashSize / 2,
              left: c.x - trashSize / 2,
              top: c.y - trashSize / 2,
              backgroundColor: overTrash ? "rgba(255,59,48,0.95)" : "rgba(0,0,0,0.55)",
            },
          ]}
        >
          <Text style={{ fontSize: overTrash ? 34 : 26 }}>🗑️</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  trash: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
})