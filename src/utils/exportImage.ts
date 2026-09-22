import { File, Paths } from "expo-file-system"
import { Skia, useCanvasRef, ImageFormat } from "@shopify/react-native-skia"
import type { EditState } from "@/types/ImageEditor"

// Typed off the hook's own return value instead of an internal exported
// type name (e.g. SkiaDomView), which has moved/renamed between Skia
// versions and isn't reliably exported from every version.
type CanvasRef = ReturnType<typeof useCanvasRef>

// Snapshots whatever is currently drawn on the Skia canvas (image + filter +
// contrast + drawing + text, all already composited) and writes it to a
// temp file. Returns the file URI.
//
// If edits.cropRect is set, the crop is applied here as a second pass:
// the full canvas is snapshotted, then only the cropRect region is redrawn
// onto a correctly-sized offscreen surface, so the exported file is
// actually trimmed to the crop — not just visually clipped.
//
// `maxWidth` (optional) does the size-based half of compression: if the
// result is wider than this, it's downscaled — same offscreen-surface
// technique as the crop step, so no extra image-manipulation library is
// needed just for resizing. `quality` (JPEG 0–100) does the other half.
// Resize is usually the bigger file-size win of the two, since most of a
// phone photo's weight is resolution, not JPEG quality.
export async function exportImage(
  canvasRef: CanvasRef,
  edits: EditState,
  canvasSize: { width: number; height: number },
  options?: { quality?: number; maxWidth?: number }
): Promise<string> {
  const quality = options?.quality ?? 90
  const maxWidth = options?.maxWidth ?? 1440
  const canvas = canvasRef.current
  if (!canvas) {
    throw new Error("exportImage: canvas ref is not attached")
  }

  let snapshot = canvas.makeImageSnapshot()
  if (!snapshot) {
    throw new Error("exportImage: failed to snapshot canvas")
  }

  const { cropRect } = edits

  if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
    // The canvas snapshot is in device pixels; cropRect was measured in
    // logical layout points (same space as canvasSize, the container view).
    // These rarely match 1:1 — scale by the *actual* ratio rather than
    // assuming a fixed pixel density, since that assumption is what broke this.
    const scaleX = snapshot.width() / canvasSize.width
    const scaleY = snapshot.height() / canvasSize.height

    const pxRect = {
      x: cropRect.x * scaleX,
      y: cropRect.y * scaleY,
      width: cropRect.width * scaleX,
      height: cropRect.height * scaleY,
    }

    const surface = Skia.Surface.Make(Math.round(pxRect.width), Math.round(pxRect.height))
    if (!surface) {
      throw new Error("exportImage: failed to create crop surface")
    }
    const offscreenCanvas = surface.getCanvas()
    const src = Skia.XYWHRect(pxRect.x, pxRect.y, pxRect.width, pxRect.height)
    const dst = Skia.XYWHRect(0, 0, pxRect.width, pxRect.height)
    offscreenCanvas.drawImageRect(snapshot, src, dst, Skia.Paint())
    surface.flush()
    snapshot = surface.makeImageSnapshot()
  }

  if (maxWidth && snapshot.width() > maxWidth) {
    const scale = maxWidth / snapshot.width()
    const targetWidth = maxWidth
    const targetHeight = Math.round(snapshot.height() * scale)

    const surface = Skia.Surface.Make(targetWidth, targetHeight)
    if (!surface) {
      throw new Error("exportImage: failed to create resize surface")
    }
    const offscreenCanvas = surface.getCanvas()
    const src = Skia.XYWHRect(0, 0, snapshot.width(), snapshot.height())
    const dst = Skia.XYWHRect(0, 0, targetWidth, targetHeight)
    offscreenCanvas.drawImageRect(snapshot, src, dst, Skia.Paint())
    surface.flush()
    snapshot = surface.makeImageSnapshot()
  }

  const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, quality)

  const fileName = `edited-${Date.now()}.jpg`
  const file = new File(Paths.cache, fileName)
  file.create()
  file.write(bytes)

  return file.uri
}