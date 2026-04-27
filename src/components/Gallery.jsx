import { useState } from 'react'

export default function Gallery({ items, onClose, onDelete }) {
  const [selected, setSelected] = useState(null)

  function handleDownload(item) {
    const a = document.createElement('a')
    a.href = item.url
    a.download = item.type === 'photo' ? 'glasses-ar.jpg' : 'glasses-ar.webm'
    a.click()
  }

  return (
    <div className="gallery-overlay">
      <div className="gallery-header">
        <h2>Gallery ({items.length})</h2>
        <button className="btn-close" onClick={onClose}>&#215;</button>
      </div>

      {items.length === 0 ? (
        <p className="gallery-empty">No captures yet</p>
      ) : (
        <div className="gallery-grid">
          {items.map((item, i) => (
            <div key={i} className="gallery-item" onClick={() => setSelected(item)}>
              {item.type === 'photo'
                ? <img src={item.url} alt={`Capture ${i + 1}`} />
                : <video src={item.url} muted playsInline loop />
              }
              {item.type === 'video' && <span className="video-badge">VID</span>}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          {selected.type === 'photo'
            ? <img src={selected.url} alt="Selected capture" onClick={e => e.stopPropagation()} />
            : <video src={selected.url} controls autoPlay loop onClick={e => e.stopPropagation()} />
          }
          <div className="lightbox-actions" onClick={e => e.stopPropagation()}>
            <button className="btn-action" onClick={() => handleDownload(selected)}>
              Save
            </button>
            <button className="btn-action danger" onClick={() => { onDelete(selected); setSelected(null) }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
