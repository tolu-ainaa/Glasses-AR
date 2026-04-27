export default function Controls({ onPhoto, onRecord, isRecording, disabled, latestCapture, onOpenGallery }) {
  return (
    <>
      {isRecording && (
        <div className="rec-indicator">REC</div>
      )}

      <div className="controls">
        {/* Gallery thumbnail / open button */}
        {latestCapture ? (
          <button className="btn-gallery" onClick={onOpenGallery} aria-label="Open gallery">
            {latestCapture.type === 'photo'
              ? <img src={latestCapture.url} alt="latest capture" />
              : <video src={latestCapture.url} muted playsInline />
            }
          </button>
        ) : (
          <button className="btn-gallery-empty" onClick={onOpenGallery} aria-label="Open gallery">
            &#9707;
          </button>
        )}

        {/* Shutter */}
        <button
          className="btn-shutter"
          onClick={onPhoto}
          disabled={disabled || isRecording}
          aria-label="Take photo"
        />

        {/* Record */}
        <button
          className={`btn-record${isRecording ? ' recording' : ''}`}
          onClick={onRecord}
          disabled={disabled}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span className="dot" />
        </button>
      </div>
    </>
  )
}
