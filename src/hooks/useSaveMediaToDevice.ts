import * as FileSystem from "expo-file-system/legacy"
import * as MediaLibrary from "expo-media-library/legacy"
//Needs migration to the new API for download
export async function saveMediaToDevice(
  remoteUrl: string,
  filename: string,
  onProgress?: (progress: number) => void,
  onPermissionDenied?: () => void
) {
  const { status } = await MediaLibrary.requestPermissionsAsync(true)
  if (status !== "granted") {
    onPermissionDenied?.()
    throw new Error("Media library permission denied")
  }

  const localUri = FileSystem.cacheDirectory + filename

  const downloadResumable = FileSystem.createDownloadResumable(
    remoteUrl,
    localUri,
    {},
    (downloadProgress) => {
      const progress =
        downloadProgress.totalBytesWritten /
        downloadProgress.totalBytesExpectedToWrite
      onProgress?.(progress)
    }
  )

  const result = await downloadResumable.downloadAsync()
  if (!result) {
    throw new Error("Download failed or was cancelled")
  }

  const asset = await MediaLibrary.createAssetAsync(result.uri)
  return asset
}