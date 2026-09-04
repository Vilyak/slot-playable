import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { PlayableHud } from '@/ui/components/PlayableHud'
import { PropertyPopup } from '@/ui/components/PropertyPopup'
import type { RootState } from '@/ui/store/store'
import {
  resolveAssetService,
  resolveGameApplication,
  resolveGameLoop,
  resolveSceneRoot,
  resolveSlotService,
} from '@/di/container'
import './App.css'

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showPopup = useSelector((state: RootState) => state.playable.phase === 'won')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false

    const start = async () => {
      try {
        const game = resolveGameApplication()
        const assets = resolveAssetService()
        const scene = resolveSceneRoot()
        const slot = resolveSlotService()
        const loop = resolveGameLoop()

        await game.init(host)
        await assets.loadAll()
        scene.mount()
        await slot.init()
        if (cancelled) return
        loop.start()
        setReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start game')
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      resolveGameLoop().stop()
    }
  }, [])

  return (
    <div className="app">
      <div ref={hostRef} id="game-root" className="game-root" />
      {ready && <PlayableHud />}
      {showPopup && <PropertyPopup />}
      {error && <div className="app__error">{error}</div>}
    </div>
  )
}
