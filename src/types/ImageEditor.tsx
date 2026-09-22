export type FilterId = "none" | "grayscale" | "sepia" | "invert" | "warm" | "cool"

export type DrawPath = {
  id: string
  svgPath: string
  color: string
  strokeWidth: number
}

export type TextLayer = {
  id: string
  text: string
  x: number
  y: number
  color: string
  fontSize: number
}

export type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

export type EditTool = "crop" | "rotate" | "filter" | "contrast" | "draw" | "text" | null

// Single source of truth for everything applied to the image.
// This is what exportImage() reads to produce the final flattened output,
// and it's the object you'll extend later (e.g. `audioTrack: AudioTrack | null`)
// when you add song attachment — nothing else in this file needs to change.
export type EditState = {
  rotation: number // 0 | 90 | 180 | 270
  cropRect: CropRect | null // null = full image, in image-space pixels
  filter: FilterId
  contrast: number // -1 to 1
  drawPaths: DrawPath[]
  textLayers: TextLayer[]
}

export const initialEditState: EditState = {
  rotation: 0,
  cropRect: null,
  filter: "none",
  contrast: 0,
  drawPaths: [],
  textLayers: [],
}

export type EditHistory = {
  stack: EditState[]
  pointer: number
}

export const initialHistory: EditHistory = { stack: [initialEditState], pointer: 0 }