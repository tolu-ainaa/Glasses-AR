import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// ── Style definitions ─────────────────────────────────────────────────────────

export const GLASSES_STYLES = [
  {
    id: 'hypno',
    label: 'Hypno',
    swatchColor: '#ffffff',
    model: '/models/hypno.glb',
    scale:   2.0,   // ← tune this if glasses appear too small/large (1.0 = auto-fit)
    yOffset: 0.0,   // vertical nudge as a fraction of eye-distance (+up, -down)
    zOffset: 0.0,   // depth nudge as a fraction of eye-distance (+toward camera)
  },
  {
    id: 'groucho',
    label: 'Groucho',
    swatchColor: '#1a1a1a',
    model: '/models/Groucho.glb',
    scale:   2.3,   // ← tune this if glasses appear too small/large (1.0 = auto-fit)
    yOffset: -0.25, // Groucho piece hangs lower (nose + moustache below eyes)
    zOffset: 0.0,
  },
]

// ── Renderer ──────────────────────────────────────────────────────────────────

export class GlassesRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.scene  = new THREE.Scene()

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true, // keeps the last frame in the buffer so drawImage() captures it
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = null
    this._models = {}          // id → { group: THREE.Group, modelWidth: number }
    this._styleId = null
    this._modelsLoaded = false
    this._pendingStyle = GLASSES_STYLES[0].id

    this._setupLighting()
    this._setupCamera(canvas.width || 640, canvas.height || 480)
    this._loadModels()
  }

  // ── Lighting ────────────────────────────────────────────────────────────────

  _setupLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2))

    const key = new THREE.DirectionalLight(0xffffff, 1.0)
    key.position.set(0.5, 1, 1.5)
    this.scene.add(key)

    const fill = new THREE.DirectionalLight(0xffffff, 0.4)
    fill.position.set(-1, 0.5, 0.5)
    this.scene.add(fill)
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  _setupCamera(w, h) {
    this.camera = new THREE.OrthographicCamera(
      -w / 2,  w / 2,
       h / 2, -h / 2,
      -2000, 2000
    )
    this.camera.position.z = 500
    this.renderer.setSize(w, h, false)
  }

  // ── Model loading ────────────────────────────────────────────────────────────

  async _loadModels() {
    const loader = new GLTFLoader()

    const load = (style) => new Promise((resolve) => {
      loader.load(
        style.model,
        (gltf) => {
          const inner = gltf.scene

          // Auto-center: translate model so its bounding box center is at origin
          const box    = new THREE.Box3().setFromObject(inner)
          const size   = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          inner.position.sub(center)

          // Outer group is what update() moves/scales/rotates
          const outer = new THREE.Group()
          outer.add(inner)
          outer.visible = false
          this.scene.add(outer)

          // modelWidth drives the scale calculation in update()
          this._models[style.id] = { group: outer, modelWidth: size.x }
          resolve()
        },
        undefined,
        (err) => {
          console.error(`[GlassesRenderer] Failed to load ${style.model}:`, err)
          resolve() // don't block the other model
        }
      )
    })

    await Promise.all(GLASSES_STYLES.map(load))

    this._modelsLoaded = true
    this.setStyle(this._pendingStyle)
  }

  // ── Style swap ───────────────────────────────────────────────────────────────

  setStyle(id) {
    this._pendingStyle = id
    if (!this._modelsLoaded) return

    Object.values(this._models).forEach(({ group }) => { group.visible = false })

    if (this._models[id]) {
      this._models[id].group.visible = true
    }
    this._styleId = id
  }

  // ── Resize ───────────────────────────────────────────────────────────────────

  resize(width, height) {
    this.renderer.setSize(width, height, false)
    this.camera.left   = -width / 2
    this.camera.right  =  width / 2
    this.camera.top    =  height / 2
    this.camera.bottom = -height / 2
    this.camera.updateProjectionMatrix()
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────

  update(landmarks, videoW, videoH, cW, cH) {
    const modelData = this._models[this._styleId]

    if (!modelData) {
      this.renderer.render(this.scene, this.camera)
      return
    }

    const { group, modelWidth } = modelData

    if (!landmarks || landmarks.length < 468) {
      group.visible = false
      this.renderer.render(this.scene, this.camera)
      return
    }

    group.visible = true

    // Map normalized landmark → world coords (accounts for object-fit:cover crop)
    const scale = Math.max(cW / videoW, cH / videoH)
    const offX  = (cW - videoW * scale) / 2
    const offY  = (cH - videoH * scale) / 2

    const toWorld = (lmk) => ({
      x:  lmk.x * videoW * scale + offX - cW / 2,
      y: -(lmk.y * videoH * scale + offY - cH / 2),
      z:  lmk.z * scale * cW,
    })

    const lOuter = toWorld(landmarks[33])
    const rOuter = toWorld(landmarks[263])
    const lInner = toWorld(landmarks[133])
    const rInner = toWorld(landmarks[362])

    const lEye  = { x: (lOuter.x + lInner.x) / 2, y: (lOuter.y + lInner.y) / 2, z: (lOuter.z + lInner.z) / 2 }
    const rEye  = { x: (rOuter.x + rInner.x) / 2, y: (rOuter.y + rInner.y) / 2, z: (rOuter.z + rInner.z) / 2 }
    const nose  = toWorld(landmarks[168])

    // Pivot between eyes, nudged toward nose bridge
    const cx = (lEye.x + rEye.x) / 2
    const cy = (lEye.y + rEye.y) / 2 * 0.6 + nose.y * 0.4
    const cz = (lEye.z + rEye.z) / 2

    const eyeDist = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y)
    const angle   = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x)

    const styleDef = GLASSES_STYLES.find(s => s.id === this._styleId) ?? GLASSES_STYLES[0]

    // Scale so the model's natural width matches the detected eye distance,
    // then multiply by the per-style scale override
    const s = (eyeDist / modelWidth) * (styleDef.scale ?? 1.0)

    group.position.set(
      cx,
      cy + (styleDef.yOffset ?? 0) * eyeDist,
      cz + (styleDef.zOffset ?? 0) * eyeDist
    )
    group.rotation.z = angle
    group.scale.setScalar(s)

    this.renderer.render(this.scene, this.camera)
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  dispose() {
    Object.values(this._models).forEach(({ group }) => {
      this.scene.remove(group)
      group.traverse(obj => {
        obj.geometry?.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach(m => m?.dispose())
      })
    })
    this.renderer.dispose()
  }
}
