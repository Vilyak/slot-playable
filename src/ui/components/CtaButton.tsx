import './CtaButton.css'

const PLAY_URL = 'https://play.google.com/store/apps'

export function CtaButton() {
  return (
    <button
      type="button"
      className="cta"
      onClick={() => {
        window.open(PLAY_URL, '_blank', 'noopener,noreferrer')
      }}
    >
      Play Now
    </button>
  )
}
