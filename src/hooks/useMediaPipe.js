import { useState, useEffect, useCallback, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export function useMediaPipe() {
  const [isLoaded, setIsLoaded] = useState(false)
  const landmarkerRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const lastResultRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        })

        if (!cancelled) {
          landmarkerRef.current = landmarker
          setIsLoaded(true)
        } else {
          landmarker.close()
        }
      } catch (err) {
        console.error('MediaPipe init failed:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  // Call once per animation frame — returns cached result if video hasn't advanced
  const detect = useCallback((videoElement, timestampMs) => {
    const landmarker = landmarkerRef.current
    if (!landmarker || videoElement.readyState < 2) return null

    if (videoElement.currentTime === lastVideoTimeRef.current) {
      return lastResultRef.current
    }

    lastVideoTimeRef.current = videoElement.currentTime
    lastResultRef.current = landmarker.detectForVideo(videoElement, timestampMs)
    return lastResultRef.current
  }, [])

  return { detect, isLoaded }
}
