import { GLASSES_STYLES } from '../utils/GlassesRenderer'

export default function GlassesPicker({ current, onChange }) {
  return (
    <div className="glasses-picker">
      <div className="picker-scroll">
        {GLASSES_STYLES.map(style => (
          <button
            key={style.id}
            className={`picker-chip${current === style.id ? ' active' : ''}`}
            onClick={() => onChange(style.id)}
          >
            <span
              className="chip-dot"
              style={{
                background: style.swatchColor,
                border: style.swatchColor === '#ffffff' ? '1px solid rgba(255,255,255,0.5)' : 'none',
              }}
            />
            {style.label}
          </button>
        ))}
      </div>
    </div>
  )
}
