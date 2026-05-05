export type BrandMarkGlyphMetrics = {
  fontSize: number
  offsetX: number
  offsetY: number
  paddingInline: number
}

export function getBrandMarkGlyphMetrics(size: number): BrandMarkGlyphMetrics {
  return {
    fontSize: Math.max(18, Math.round(size * 0.66)),
    offsetX: Math.max(1, Math.round(size * 0.04)),
    offsetY: -1,
    paddingInline: Math.max(2, Math.round(size * 0.05)),
  }
}
