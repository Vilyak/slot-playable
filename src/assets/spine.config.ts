/**
 * Declarative Spine asset registry.
 * Empty for single-file playable (no external fetch).
 */
export type SpineAssetEntry = {
  skeleton: string
  atlas: string
  scale: number
  defaultAnimation?: string
}

export const SpineAssetConfig: Record<string, SpineAssetEntry> = {}

export type SpineSkeletonId = string

export function spineSkeletonAlias(id: SpineSkeletonId): string {
  return `${id}:skeleton`
}

export function spineAtlasAlias(id: SpineSkeletonId): string {
  return `${id}:atlas`
}
