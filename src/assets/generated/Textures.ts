export const Textures = {
  slot: {
    btnSpin: "btn_spin",
    coin: "coin",
    confetti0: "confetti_0",
    confetti1: "confetti_1",
    confetti2: "confetti_2",
    confetti3: "confetti_3",
    confetti4: "confetti_4",
    machineFrame: "machine_frame",
    reelPanel: "reel_panel",
    symbolCircle: "symbol_circle",
    symbolDiamond: "symbol_diamond",
    symbolHeart: "symbol_heart",
    symbolStar: "symbol_star",
    symbolTriangle: "symbol_triangle",
  },
} as const

export type TextureAtlas = keyof typeof Textures
