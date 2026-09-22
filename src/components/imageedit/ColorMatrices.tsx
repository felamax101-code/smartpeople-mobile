import type { FilterId } from "@/types/ImageEditor"
// Each is a 4x5 Skia color matrix (row-major, RGBA + offset column).
const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]

const FILTER_MATRICES: Record<FilterId, number[]> = {
  none: IDENTITY,
  grayscale: [
    0.33, 0.33, 0.33, 0, 0,
    0.33, 0.33, 0.33, 0, 0,
    0.33, 0.33, 0.33, 0, 0,
    0, 0, 0, 1, 0,
  ],
  sepia: [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ],
  invert: [
    -1, 0, 0, 0, 255,
    0, -1, 0, 0, 255,
    0, 0, -1, 0, 255,
    0, 0, 0, 1, 0,
  ],
  warm: [
    1.15, 0, 0, 0, 10,
    0, 1.05, 0, 0, 0,
    0, 0, 0.9, 0, 0,
    0, 0, 0, 1, 0,
  ],
  cool: [
    0.9, 0, 0, 0, 0,
    0, 1.0, 0, 0, 0,
    0, 0, 1.15, 0, 10,
    0, 0, 0, 1, 0,
  ],
}

// contrast: -1 .. 1  ->  standard contrast matrix around the midpoint (127.5)
function contrastMatrix(contrast: number): number[] {
  const c = 1 + Math.max(-1, Math.min(1, contrast))
  const t = (1 - c) * 127.5
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
  ]
}

// Multiply two 4x5 color matrices (treated as 4x4 linear part + offset column).
function multiply(a: number[], b: number[]): number[] {
  const result = new Array(20).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += a[row * 5 + k] * b[k * 5 + col]
      }
      if (col === 4) sum += a[row * 5 + 4]
      result[row * 5 + col] = sum
    }
  }
  return result
}

// Combines the selected filter preset with the contrast adjustment into
// a single matrix so both apply in one pass on the Skia <ColorMatrix>.
export function buildColorMatrix(filter: FilterId, contrast: number): number[] {
  const filterM = FILTER_MATRICES[filter] ?? IDENTITY
  if (contrast === 0) return filterM
  return multiply(contrastMatrix(contrast), filterM)
}

export const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "grayscale", label: "B&W" },
  { id: "sepia", label: "Sepia" },
  { id: "invert", label: "Invert" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
]