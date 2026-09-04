import { createListenerMiddleware } from '@reduxjs/toolkit'

/** Playable game events are handled inside SlotService; keep middleware for future CTA hooks. */
export const listenerMiddleware = createListenerMiddleware()
