import React, { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import { router, useLocalSearchParams } from "expo-router"
import { useTheme } from "@/hooks/useTheme"

export default function PickLocationScreen() {
  const theme = useTheme()
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>()

  const [coords, setCoords] = useState({
    latitude: params.lat ? Number(params.lat) : 0.5143,
    longitude: params.lng ? Number(params.lng) : 35.2698,
  })

  const confirm = () => {
    router.replace({
      pathname: "/sp/createpost", // adjust to your actual route name for SellScreen
      params: { pickedLat: coords.latitude, pickedLng: coords.longitude },
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.headerBtn, { color: theme.textPrimary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Pin exact location</Text>
        <TouchableOpacity onPress={confirm}>
          <Text style={[styles.headerBtn, { color: theme.primary }]}>Confirm</Text>
        </TouchableOpacity>
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          ...coords,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={(e) => setCoords(e.nativeEvent.coordinate)}
      >
        <Marker
          coordinate={coords}
          draggable
          onDragEnd={(e) => setCoords(e.nativeEvent.coordinate)}
        />
      </MapView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { fontSize: 16, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "700" },
})