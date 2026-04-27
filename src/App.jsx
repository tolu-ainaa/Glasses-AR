import { useState, useCallback } from 'react'
import ARCamera from './components/ARCamera'
import Gallery from './components/Gallery'

export default function App() {
  const [captures, setCaptures]       = useState([])
  const [showGallery, setShowGallery] = useState(false)

  const handleCapture = useCallback((item) => {
    setCaptures(prev => [item, ...prev])
  }, [])

  const handleDelete = useCallback((item) => {
    setCaptures(prev => prev.filter(c => c !== item))
    URL.revokeObjectURL(item.url)
  }, [])

  return (
    <div className="app">
      <ARCamera
        onCapture={handleCapture}
        latestCapture={captures[0] ?? null}
        onOpenGallery={() => setShowGallery(true)}
      />

      {showGallery && (
        <Gallery
          items={captures}
          onClose={() => setShowGallery(false)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
