export const SYMBOL_KEYS = ['circle', 'star', 'heart', 'diamond', 'triangle'] as const
export type SymbolKey = (typeof SYMBOL_KEYS)[number]

export const REEL_COUNT = 3
export const VISIBLE_ROWS = 3
export const STRIP_LEN = 24

export const DESIGN_W = 720
export const DESIGN_H = 960

export const WIN_BIAS = 0.42

/** Coins awarded on a center-line win. */
export const WIN_COIN_REWARD = 1000

/** Compact cabinet like Coin Master — ~55–65% of design width. */
export const FRAME_SCALE = 0.85

/** Inset inside measured hole so symbols clear frame chrome / lights. */
export const WINDOW_PAD = 12

export const SPIN_BTN_WIDTH_RATIO = 0.4
export const SPIN_BTN_GAP = 18
