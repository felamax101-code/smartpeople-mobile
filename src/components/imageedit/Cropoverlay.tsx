import { useRef, useState, useEffect, useMemo } from "react"
import { View, PanResponder, StyleSheet, type PanResponderInstance } from "react-native"
import type { CropRect } from "@/types/ImageEditor"


type Bounds = { x: number; y: number; width: number; height: number }

type Props = {
  containerWidth: number
  containerHeight: number
  value: CropRect | null
  onChange: (rect: CropRect) => void
  onChangeEnd?: (rect: CropRect) => void
  bounds:Bounds
}

const HANDLE_HIT = 10
const MIN_SIZE = 60

// Which handle codes affect which edges. 'l'/'r'/'t'/'b' = single edge,
// combinations ('tl','tr','bl','br') = corner, both edges at once.
type Handle = "move" | "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br"

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// Pure function: given the rect as it was when the touch *started*, plus
// the cumulative gesture delta, compute the new rect. Never reads the
// live/current rect — that's what caused the runaway drift.
function applyHandle(
  handle: Handle,
  start: CropRect,
  dx: number,
  dy: number,
  b:Bounds
): CropRect {
  const minX = b.x, maxX = b.x + b.width
  const minY = b.y, maxY = b.y + b.height

  if (handle === "move") {
    return {
      ...start,
      x: clamp(start.x + dx, minX, maxX - start.width),
      y: clamp(start.y + dy, minY, maxY - start.height),
    }
  }

  let { x, y, width, height } = start
  if (handle.includes("l")) {
    const newX = clamp(start.x + dx, minX, start.x + start.width - MIN_SIZE)
    width = start.x + start.width - newX
    x = newX
  }
  if (handle.includes("r")) {
    width = clamp(start.width + dx, MIN_SIZE, maxX - start.x)
  }
  if (handle.includes("t")) {
    const newY = clamp(start.y + dy, minY, start.y + start.height - MIN_SIZE)
    height = start.y + start.height - newY
    y = newY
  }
  if (handle.includes("b")) {
    height = clamp(start.height + dy, MIN_SIZE, maxY - start.y)
  }
  return { x, y, width, height }
}

export function CropOverlay({ containerWidth, containerHeight, value, onChange, onChangeEnd,bounds }: Props) {
 
  const fullRect = useMemo<CropRect>(
  () => ({ x: 0, y: 0, width: containerWidth, height: containerHeight }),
  [containerWidth, containerHeight]
)
const [rect, setRect] = useState<CropRect>(value ?? bounds)

useEffect(() => {
  setRect(value ?? bounds)
}, [value, bounds.x, bounds.y, bounds.width, bounds.height])
  // snapshot of the rect taken at the moment a touch begins — every move
  // event during that gesture computes from this fixed value, never from
  // the live `rect` state, so deltas don't compound.
  const startRect = useRef<CropRect>(rect)
  // Mirrors `rect` on every render so onPanResponderRelease (inside the
  // memoized responder) always reads the latest value instead of whatever
  // `rect` was when the responder object was created.
  const rectRef = useRef(rect)
  rectRef.current = rect

  // The PanResponders below are memoized (only recreated if container size
  // changes), so their callbacks close over whatever onChange/onChangeEnd
  // were at creation time. Routing through a ref that updates every render
  // means they always call the current version — same fix as
  // DrawTouchLayer/TextTouchLayer, applied here before it could bite us.
  const callbacksRef = useRef({ onChange, onChangeEnd })
  useEffect(() => {
    callbacksRef.current = { onChange, onChangeEnd }
  }, [onChange, onChangeEnd])

  useEffect(() => {
    if (value) setRect(value)
  }, [value])

  const commit = (next: CropRect) => {
    setRect(next)
    callbacksRef.current.onChange(next)
  }

  const makeResponder = (handle: Handle): PanResponderInstance =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRect.current = rectRef.current
      },
      onPanResponderMove: (_, gesture) => {
        commit(
          applyHandle(handle, startRect.current, gesture.dx, gesture.dy,bounds)
        )
      },
      onPanResponderRelease: () => {
        callbacksRef.current.onChangeEnd?.(rectRef.current)
      },
    })

  // Memoized so we're not recreating 9 PanResponders every render —
  // only when the container size actually changes.
  const responders = useMemo(
    () => ({
      move: makeResponder("move"),
      t: makeResponder("t"),
      b: makeResponder("b"),
      l: makeResponder("l"),
      r: makeResponder("r"),
      tl: makeResponder("tl"),
      tr: makeResponder("tr"),
      bl: makeResponder("bl"),
      br: makeResponder("br"),
    }),
    [bounds.x, bounds.y, bounds.width, bounds.height]
  )

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: rect.y }]} />
        <View style={[styles.dim, { top: rect.y, left: 0, width: rect.x, height: rect.height }]} />
        <View
          style={[
            styles.dim,
            { top: rect.y, left: rect.x + rect.width, right: 0, height: rect.height },
          ]}
        />
        <View style={[styles.dim, { top: rect.y + rect.height, left: 0, right: 0, bottom: 0 }]} />
      </View>

      <View
        {...responders.move.panHandlers}
        style={[styles.box, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]}
      >
        {/* edges — thin strips along each side, don't overlap corners */}
        <View
          {...responders.t.panHandlers}
          style={[styles.edgeH, { top: -HANDLE_HIT / 2, left: HANDLE_HIT, right: HANDLE_HIT }]}
        />
        <View
          {...responders.b.panHandlers}
          style={[styles.edgeH, { bottom: -HANDLE_HIT / 2, left: HANDLE_HIT, right: HANDLE_HIT }]}
        />
        <View
          {...responders.l.panHandlers}
          style={[styles.edgeV, { left: -HANDLE_HIT / 2, top: HANDLE_HIT, bottom: HANDLE_HIT }]}
        />
        <View
          {...responders.r.panHandlers}
          style={[styles.edgeV, { right: -HANDLE_HIT / 2, top: HANDLE_HIT, bottom: HANDLE_HIT }]}
        />

        {/* corners */}
        <View {...responders.tl.panHandlers} style={[styles.corner, styles.cornerTL]} />
        <View {...responders.tr.panHandlers} style={[styles.corner, styles.cornerTR]} />
        <View {...responders.bl.panHandlers} style={[styles.corner, styles.cornerBL]} />
        <View {...responders.br.panHandlers} style={[styles.corner, styles.cornerBR]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dim: { position: "absolute", backgroundColor: "rgba(0,0,0,0.55)" },
  box: { position: "absolute", borderWidth: 2, borderColor: "#fff" },
  edgeH: { position: "absolute", height: HANDLE_HIT },
  edgeV: { position: "absolute", width: HANDLE_HIT },
  corner: {
    position: "absolute",
    width: HANDLE_HIT,
    height: HANDLE_HIT,
    borderRadius: HANDLE_HIT / 2,
    backgroundColor: "#fff",
  },
  cornerTL: { left: -HANDLE_HIT / 2, top: -HANDLE_HIT / 2 },
  cornerTR: { right: -HANDLE_HIT / 2, top: -HANDLE_HIT / 2 },
  cornerBL: { left: -HANDLE_HIT / 2, bottom: -HANDLE_HIT / 2 },
  cornerBR: { right: -HANDLE_HIT / 2, bottom: -HANDLE_HIT / 2 },
})