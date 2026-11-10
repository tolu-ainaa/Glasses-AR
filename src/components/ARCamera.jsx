import { useRef, useEffect, useCallback, useState } from 'react'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { GlassesRenderer, GLASSES_STYLES } from '../utils/GlassesRenderer'
import Controls from './Controls'
import GlassesPicker from './GlassesPicker'

export default function ARCamera({ onCapture, latestCapture, onOpenGallery }) {
  const videoRef   = useRef(null)
  const overlayRef = useRef(null)
  const rendererRef  = useRef(null)
  const rafRef       = useRef(null)
  const recordingRef = useRef(null) // { recorder, canvas, ctx }

  // Keep a ref in sync with state so the renderer useEffect can read it
  // without adding styleId to its dependency array (which would rebuild the renderer)
  const [styleId, setStyleId]   = useState(GLASSES_STYLES[0].id)
  const styleIdRef = useRef(GLASSES_STYLES[0].id)
  const [thumbnails, setThumbnails] = useState(null)

  const [cameraError, setCameraError]   = useState(null)
  const [isReady, setIsReady]           = useState(false)
  const [isRecording, setIsRecording]   = useState(false)

  const { detect, isLoaded } = useMediaPipe()

  // ── Camera ──────────────────────────────────────────────────────────
  useEffect(() => {
    let stream
    let cancelled = false   // guards against React StrictMode double-mount

    ;(async () => {
      try {
        // Try preferred constraints first
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
        } catch (e) {
          // Some browsers/devices reject ideal constraints — retry with bare video
          if (e.name === 'OverconstrainedError' || e.name === 'NotFoundError') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          } else {
            throw e
          }
        }

        // If cleanup already ran (StrictMode second-mount teardown), bail out
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        if (!cancelled) setIsReady(true)
      } catch (e) {
        if (cancelled) return  // AbortError from intentional cleanup — not a real error
        const msg =
          e.name === 'NotAllowedError'  ? 'Camera permission blocked — allow access in your browser settings and reload.' :
          e.name === 'NotReadableError' ? 'Camera is in use by another app or tab — close it and retry.' :
          e.name === 'SecurityError'    ? 'Camera requires a secure context — use localhost or HTTPS.' :
          `Camera error: ${e.name}${e.message ? ` — ${e.message}` : ''}`
        setCameraError(msg)
      }
    })()

    return () => {
      cancelled = true
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── Style changes ─────────────────────────────────────────────────────
  const handleStyleChange = useCallback((id) => {
    styleIdRef.current = id
    setStyleId(id)
    rendererRef.current?.setStyle(id)
  }, [])

  // ── Three.js renderer ────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return

    const canvas = overlayRef.current
    const video  = videoRef.current

    rendererRef.current = new GlassesRenderer(canvas, { onThumbnails: setThumbnails })
    // Apply whichever style is active at mount time
    rendererRef.current.setStyle(styleIdRef.current)

    const syncSize = () => {
      const w = canvas.clientWidth  * (window.devicePixelRatio || 1)
      const h = canvas.clientHeight * (window.devicePixelRatio || 1)
      // store logical (CSS) size for coordinate math
      canvas.dataset.cssW = canvas.clientWidth
      canvas.dataset.cssH = canvas.clientHeight
      rendererRef.current?.resize(canvas.clientWidth, canvas.clientHeight)
    }

    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)
    syncSize()

    video.addEventListener('loadedmetadata', syncSize)

    return () => {
      ro.disconnect()
      video.removeEventListener('loadedmetadata', syncSize)
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [isReady])

  // ── rAF loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !isLoaded) return

    const loop = (time) => {
      rafRef.current = requestAnimationFrame(loop)

      const video    = videoRef.current
      const canvas   = overlayRef.current
      const renderer = rendererRef.current

      if (!video || !canvas || !renderer || video.readyState < 2) return

      const result    = detect(video, time)
      const landmarks = result?.faceLandmarks?.[0] ?? null

      const cW = canvas.clientWidth
      const cH = canvas.clientHeight

      renderer.update(landmarks, video.videoWidth, video.videoHeight, cW, cH, time)

      // Composite to recording canvas if active
      const rec = recordingRef.current
      if (rec) {
        const { ctx, canvas: rc } = rec
        ctx.save()
        // mirror to match selfie display
        ctx.translate(rc.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, rc.width, rc.height)
        ctx.restore()
        // overlay canvas is already in un-mirrored Three.js space;
        // mirror it too so the recording matches what the user saw
        ctx.save()
        ctx.translate(rc.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(canvas, 0, 0, rc.width, rc.height)
        ctx.restore()
      }
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isReady, isLoaded, detect])

  // ── Photo capture ────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video   = videoRef.current
    const overlay = overlayRef.current
    if (!video || !overlay) return

    const out = document.createElement('canvas')
    out.width  = video.videoWidth
    out.height = video.videoHeight
    const ctx  = out.getContext('2d')

    // Draw mirrored video
    ctx.save()
    ctx.translate(out.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.restore()

    // Draw mirrored Three.js overlay (scaled to video resolution)
    ctx.save()
    ctx.translate(out.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(overlay, 0, 0, out.width, out.height)
    ctx.restore()

    out.toBlob(
      blob => onCapture?.({ type: 'photo', url: URL.createObjectURL(blob), blob }),
      'image/jpeg',
      0.92
    )
  }, [onCapture])

  // ── Video recording ──────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (recordingRef.current) {
      recordingRef.current.recorder.stop()
      recordingRef.current = null
      setIsRecording(false)
      return
    }

    const video = videoRef.current
    if (!video) return

    const rc  = document.createElement('canvas')
    rc.width  = video.videoWidth
    rc.height = video.videoHeight
    const ctx = rc.getContext('2d')

    const stream   = rc.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks   = []

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      onCapture?.({ type: 'video', url: URL.createObjectURL(blob), blob })
    }

    recorder.start()
    recordingRef.current = { recorder, canvas: rc, ctx }
    setIsRecording(true)
  }, [onCapture])

  // ── Render ───────────────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="status-overlay">
        <p>{cameraError}</p>
        <button className="retry-btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="ar-camera">
      <video ref={videoRef} className="video-feed" playsInline muted autoPlay />
      <canvas ref={overlayRef} className="overlay-canvas" />

      {(!isReady || !isLoaded) && (
        <div className="status-overlay">
          <div className="spinner" />
          <p>{!isReady ? 'Starting camera…' : 'Loading face detection…'}</p>
        </div>
      )}

      <GlassesPicker current={styleId} onChange={handleStyleChange} thumbnails={thumbnails} />

      <Controls
        onPhoto={capturePhoto}
        onRecord={toggleRecording}
        isRecording={isRecording}
        disabled={!isLoaded || !isReady}
        latestCapture={latestCapture}
        onOpenGallery={onOpenGallery}
      />
    </div>
  )
}
