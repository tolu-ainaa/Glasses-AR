import { GLASSES_STYLES } from '../utils/GlassesRenderer'

export default function GlassesPicker({ current, onChange, thumbnails }) {
  return (
    <div className="glasses-picker">
      <div className="picker-scroll">
        {GLASSES_STYLES.map(style => {
          const thumb = thumbnails?.[style.id]
          const [a, b = a] = style.swatch
          return (
            <button
              key={style.id}
              className={`picker-chip${current === style.id ? ' active' : ''}`}
              onClick={() => onChange(style.id)}
              aria-pressed={current === style.id}
            >
              {thumb
                ? <img className="chip-thumb" src={thumb} alt="" />
                : <span className="chip-dot" style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />}
              <span className="chip-label">{style.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
