
import { useState, useEffect } from "react"
import * as Location from "expo-location"

export interface LocationData {
  lat: number
  lng: number
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // request permission
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        setError("Location permission denied")
        return
      }

      // get current position
      // accuracy: Balanced → good enough for marketplace, faster than High
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    } catch (err) {
      setError("Could not get location")
    } finally {
      setIsLoading(false)
    }
  }

  // auto-request on mount
  useEffect(() => {
    requestLocation()
  }, [])

  return { location, isLoading, error, requestLocation }
}










