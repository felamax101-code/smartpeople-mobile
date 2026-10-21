// utils/pickCommentImage.ts
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import { PickedImage } from "@/types"
export const pickCommentImage = async (): Promise<PickedImage | null> => {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
  })
  if (res.canceled) return null
  const asset = res.assets[0]
  const out = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width, 1080) } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  )
  return { uri: out.uri, width: out.width, height: out.height, mimeType: "image/jpeg" }
}