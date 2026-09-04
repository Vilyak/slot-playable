import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type PlayablePhase = 'playing' | 'won'

type PlayableState = {
  phase: PlayablePhase
  spinning: boolean
  winCount: number
  lastWon: boolean
  coins: number
}

const initialState: PlayableState = {
  phase: 'playing',
  spinning: false,
  winCount: 0,
  lastWon: false,
  coins: 0,
}

const playableSlice = createSlice({
  name: 'playable',
  initialState,
  reducers: {
    spinStarted(state) {
      state.spinning = true
      state.lastWon = false
    },
    spinEnded(state, action: PayloadAction<{ won: boolean }>) {
      state.spinning = false
      state.lastWon = action.payload.won
      if (action.payload.won) {
        state.winCount += 1
      }
    },
    addCoins(state, action: PayloadAction<number>) {
      state.coins += action.payload
    },
    gameWon(state) {
      state.phase = 'won'
    },
  },
})

export const { spinStarted, spinEnded, addCoins, gameWon } = playableSlice.actions
export const playableReducer = playableSlice.reducer
