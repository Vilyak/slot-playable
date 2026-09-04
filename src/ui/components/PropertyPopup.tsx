import { EmbeddedImages } from '@/assets/generated'
import './PropertyPopup.css'

const PLAY_URL = 'https://play.google.com/store/apps'

const PROPERTIES = [
  { key: 'property0' as const, label: 'Candy Cottage', cost: 1000 },
  { key: 'property1' as const, label: 'Sugar Castle', cost: 1000 },
  { key: 'property2' as const, label: 'Sweet Shop', cost: 1000 },
]

function openStore() {
  window.open(PLAY_URL, '_blank', 'noopener,noreferrer')
}

export function PropertyPopup() {
  const imgs = EmbeddedImages as Record<string, string>
  const handSrc = imgs.handPointer
  const coinSrc = imgs.coinHud

  return (
    <div className="ppop" role="dialog" aria-label="Buy property" onClick={openStore}>
      <div className="ppop__card" onClick={openStore}>
        <h2 className="ppop__title">Buy Property!</h2>
        <p className="ppop__sub">Spend your coins on a sweet new home</p>
        <div className="ppop__grid">
          {PROPERTIES.map((p, i) => (
            <button key={p.key} type="button" className="ppop__item" onClick={openStore}>
              {imgs[p.key] ? (
                <img className="ppop__art" src={imgs[p.key]} alt="" draggable={false} />
              ) : (
                <div className="ppop__art ppop__art--fallback" />
              )}
              <span className="ppop__label">{p.label}</span>
              <span className="ppop__cost">
                {coinSrc ? <img src={coinSrc} alt="" draggable={false} /> : null}
                {p.cost.toLocaleString('en-US')}
              </span>
              {i === 0 && handSrc ? (
                <img className="ppop__hand" src={handSrc} alt="" draggable={false} />
              ) : null}
            </button>
          ))}
        </div>
        <button type="button" className="ppop__cta" onClick={openStore}>
          Get it on Google Play
        </button>
      </div>
    </div>
  )
}
