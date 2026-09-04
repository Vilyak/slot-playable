import { useSelector } from 'react-redux'
import type { RootState } from '@/ui/store/store'
import { EmbeddedImages } from '@/assets/generated'
import './PlayableHud.css'

export function PlayableHud() {
  const spinning = useSelector((state: RootState) => state.playable.spinning)
  const coins = useSelector((state: RootState) => state.playable.coins)
  const coinSrc = 'coinHud' in EmbeddedImages ? EmbeddedImages.coinHud : undefined

  return (
    <div className="phud">
      <div id="coin-counter" className="phud__coins">
        {coinSrc ? (
          <img className="phud__coin-icon" src={coinSrc} alt="" draggable={false} />
        ) : (
          <span className="phud__coin-fallback">●</span>
        )}
        <span className="phud__coin-value">{coins.toLocaleString('en-US')}</span>
      </div>
      <div className="phud__hint">{spinning ? 'Good luck…' : 'Tap SPIN!'}</div>
    </div>
  )
}
