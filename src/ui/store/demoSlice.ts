import { createSlice } from '@reduxjs/toolkit'

type DemoState = {
  bunnyCount: number
  spineboyCount: number
  cameraFollowEnabled: boolean
  cameraZoom: number
}

const initialState: DemoState = {
  bunnyCount: 0,
  spineboyCount: 0,
  cameraFollowEnabled: false,
  cameraZoom: 1,
}

const demoSlice = createSlice({
  name: 'demo',
  initialState,
  reducers: {
    addBunny() {},
    bunnySpawned(state) {
      state.bunnyCount += 1
    },
    addSpineboy() {},
    spineboySpawned(state) {
      state.spineboyCount += 1
    },
    toggleCameraFollow(state) {
      state.cameraFollowEnabled = !state.cameraFollowEnabled
    },
    cameraZoomIn(state) {
      state.cameraZoom = Math.min(3, Number((state.cameraZoom + 0.1).toFixed(2)))
    },
    cameraZoomOut(state) {
      state.cameraZoom = Math.max(0.4, Number((state.cameraZoom - 0.1).toFixed(2)))
    },
  },
})

export const {
  addBunny,
  bunnySpawned,
  addSpineboy,
  spineboySpawned,
  toggleCameraFollow,
  cameraZoomIn,
  cameraZoomOut,
} = demoSlice.actions
export const demoReducer = demoSlice.reducer
