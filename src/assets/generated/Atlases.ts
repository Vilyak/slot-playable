export const Atlases = {
  slot: "/assets/slot.json",
} as const

export type AtlasName = keyof typeof Atlases
