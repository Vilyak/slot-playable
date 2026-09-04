import type { EnhancedStore, UnknownAction } from '@reduxjs/toolkit'

type AppStore = EnhancedStore<unknown, UnknownAction>

let boundStore: AppStore | null = null

export function bindStore(store: AppStore): void {
  boundStore = store
}

export function getStore(): AppStore {
  if (!boundStore) {
    throw new Error('Redux store is not bound')
  }
  return boundStore
}
