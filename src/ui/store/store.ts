import { configureStore } from '@reduxjs/toolkit'
import { playableReducer } from '@/ui/store/playableSlice'
import { listenerMiddleware } from '@/ui/store/listenerMiddleware'
import { bindStore } from '@/ui/store/storeHolder'

export const store = configureStore({
  reducer: {
    playable: playableReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
})

bindStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
