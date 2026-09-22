import { useRef, useEffect } from "react"
import { View, PanResponder, StyleSheet } from "react-native"

type Props = {
  enabled: boolean
  onStrokeUpdate: (svgPath: string) => void
  onStrokeEnd: (svgPath: string) => void
}

// Simple single-touch freehand drawing (no pinch/multi-touch, per the
// "keep it simple" call). Builds an SVG path string as the finger moves.
export function DrawTouchLayer({ enabled, onStrokeUpdate, onStrokeEnd }: Props) {
  const pathRef = useRef("")

  // PanResponder.create runs once (inside useRef below) and its callbacks
  // close over whatever props existed at that first render. If a prop like
  // onStrokeEnd changes on a later render (e.g. because it closes over a
  // newly-picked draw color), the PanResponder would keep calling the OLD
  // version forever. Routing through a ref that's updated every render
  // fixes that — the PanResponder's callbacks read callbacksRef.current,
  // which is always fresh, instead of the prop value from mount time.
  const callbacksRef = useRef({ onStrokeUpdate, onStrokeEnd })
  useEffect(() => {
    callbacksRef.current = { onStrokeUpdate, onStrokeEnd }
  }, [onStrokeUpdate, onStrokeEnd])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: () => enabled,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        pathRef.current = `M ${locationX} ${locationY}`
        callbacksRef.current.onStrokeUpdate(pathRef.current)
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        pathRef.current += ` L ${locationX} ${locationY}`
        callbacksRef.current.onStrokeUpdate(pathRef.current)
      },
      onPanResponderRelease: () => {
        callbacksRef.current.onStrokeEnd(pathRef.current)
        pathRef.current = ""
      },
    })
  ).current

  if (!enabled) return null

  return <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
}