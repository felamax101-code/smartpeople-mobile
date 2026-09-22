import { useRef, useEffect } from "react"
import { View, PanResponder, StyleSheet } from "react-native"
import type { TextLayer } from "@/types/ImageEditor"

type Props = {
  enabled: boolean
  layers: TextLayer[]
  onTapEmpty: (x: number, y: number) => void
  onMoveLayer: (id: string, x: number, y: number) => void
  onMoveEnd?: () => void
}

const HIT_RADIUS = 40

export function TextTouchLayer({ enabled, layers, onTapEmpty, onMoveLayer, onMoveEnd }: Props) {
  const draggingId = useRef<string | null>(null)
  const startTouch = useRef({ x: 0, y: 0 })
  const startLayerPos = useRef({ x: 0, y: 0 })

  // See DrawTouchLayer for why: PanResponder.create runs once at mount and
  // its callbacks close over that render's props. Without this ref, hit
  // testing would keep using the layer positions from mount, and
  // onTapEmpty/onMoveLayer would call whatever those props were on mount.
  const latest = useRef({ layers, onTapEmpty, onMoveLayer, onMoveEnd })
  useEffect(() => {
    latest.current = { layers, onTapEmpty, onMoveLayer, onMoveEnd }
  }, [layers, onTapEmpty, onMoveLayer, onMoveEnd])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        const hit = latest.current.layers.find(
          (l) => Math.hypot(l.x - locationX, l.y - locationY) < HIT_RADIUS
        )
        if (hit) {
          draggingId.current = hit.id
          startTouch.current = { x: locationX, y: locationY }
          startLayerPos.current = { x: hit.x, y: hit.y }
        } else {
          draggingId.current = null
        }
      },
      onPanResponderMove: (evt) => {
        if (!draggingId.current) return
        const { locationX, locationY } = evt.nativeEvent
        const dx = locationX - startTouch.current.x
        const dy = locationY - startTouch.current.y
        latest.current.onMoveLayer(
          draggingId.current,
          startLayerPos.current.x + dx,
          startLayerPos.current.y + dy
        )
      },
      onPanResponderRelease: (evt) => {
        if (draggingId.current) {
          latest.current.onMoveEnd?.()
        } else {
          const { locationX, locationY } = evt.nativeEvent
          latest.current.onTapEmpty(locationX, locationY)
        }
        draggingId.current = null
      },
    })
  ).current

  if (!enabled) return null

  return <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
}