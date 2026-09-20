
import { useRef, useCallback } from "react"
import { Animated } from "react-native"

// shake animation — plays when user enters wrong code
export const useShakeAnimation = () => {
  const shakeAnim = useRef(new Animated.Value(0)).current

  const shake = useCallback(() => {
    // reset to center
    shakeAnim.setValue(0)

    // sequence of left/right movements
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  // apply to component: style={{ transform: [{ translateX: shakeAnim }] }}
  return { shakeAnim, shake }
}












