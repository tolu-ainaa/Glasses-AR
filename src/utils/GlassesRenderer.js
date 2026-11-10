import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// ── Materials ─────────────────────────────────────────────────────────────────
//
// The overlay canvas is composited over the <video> by the browser, so lenses
// can't sample the video for real refraction. Instead lenses use premultiplied
// "glass" blending: the colour the shader outputs (mostly environment
// reflections) is *added*, while `opacity` controls how much of the video behind
// is dimmed. That gives sunglasses that darken the eyes and still catch glare.

const glassBlending = (m) => {
  m.blending = THREE.CustomBlending
  m.blendEquation = THREE.AddEquation
  m.blendSrc = THREE.OneFactor
  m.blendDst = THREE.OneMinusSrcAlphaFactor
  m.blendSrcAlpha = THREE.OneFactor
  m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor
  return m
}

const MATERIALS = {
  // Lenses
  lensClear:   () => lens({ color: 0x000000, opacity: 0.06 }),
  lensSmoke:   () => lens({ color: 0x0c0d10, opacity: 0.82 }),
  lensG15:     () => lens({ color: 0x0d150e, opacity: 0.84 }),
  lensBrown:   () => lens({ color: 0x1e1008, opacity: 0.72 }),
  lensRose:    () => lens({ color: 0x24050c, opacity: 0.45 }),
  lensMirror:  () => lens({ color: 0x1d6dff, opacity: 0.9, metalness: 0.9, roughness: 0.04, iridescence: 0.6 }),
  lensIrid:    () => lens({ color: 0x030303, opacity: 0.9, iridescence: 0.7 }),
  // Frames
  acetateBlack: () => acetate(0x0a0a0c),
  acetateRed:   () => acetate(0x8c0f1f),
  acetateTort:  () => acetate(0x3a1d0e, 0.35),
  acetateWhite: () => acetate(0xf2f2f0),
  plasticNeon:  () => new THREE.MeshPhysicalMaterial({ color: 0x39ff6a, emissive: 0x0c5a1c, roughness: 0.35, clearcoat: 0.6 }),
  matteBlack:   () => new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.65, metalness: 0 }),
  gold:         () => metal(0xe0b85a, 0.22),
  silver:       () => metal(0xd9dadc, 0.18),
  gunmetal:     () => metal(0x45484e, 0.3),
}

function lens({ color, opacity, metalness = 0, roughness = 0.03, iridescence = 0 }) {
  return glassBlending(new THREE.MeshPhysicalMaterial({
    color, opacity, metalness, roughness, iridescence,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [180, 420],
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.6,
  }))
}

function acetate(color, roughness = 0.28) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.06,
    envMapIntensity: 1.1,
  })
}

function metal(color, roughness) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, envMapIntensity: 1.3 })
}

// ── Style definitions ─────────────────────────────────────────────────────────
//
// width   – frame width as a multiple of the distance between eye centres
//           (real frames are ~2.2× the inter-pupil distance)
// yOffset – vertical nudge as a fraction of eye-distance (+up, -down)
// depth   – how far in front of the eyes the frame sits (fraction of eye-distance)
// rotateY – fix-up for models authored facing a different direction (radians)
// materials – material name in the GLB → preset from MATERIALS above
// credit  – attribution shown in the README / credits

const CC0_PACK = 'Low-poly Glasses Pack (CC0) — opengameart.org/content/lowpoly-glasses-pack'

export const GLASSES_STYLES = [
  {
    id: 'aviator', label: 'Aviator', swatch: ['#e0b85a', '#2a3a2c'],
    model: '/models/aviator.glb', width: 2.25,
    materials: { 'Glass': 'lensG15', 'Gray': 'gold', 'Material.002': 'acetateBlack' },
    credit: CC0_PACK,
  },
  {
    id: 'wayfarer', label: 'Wayfarer', swatch: ['#0a0a0c', '#1a261b'],
    model: '/models/wayfarer.glb', width: 2.2,
    materials: { 'Material.032': 'lensG15', 'Material.033': 'acetateBlack' },
    credit: CC0_PACK,
  },
  {
    id: 'sport', label: 'Sport', swatch: ['#ffffff', '#1d6dff'],
    model: '/models/khronos_sunglasses.glb', width: 2.2,
    // Khronos' lenses use transmission, which can't see the video behind the
    // canvas — swap them for our blended glass.
    materials: { 'lens_exterior': 'lensIrid', 'lens_interior': 'hide', 'nose_pads': 'lensClear' },
    credit: '"Sunglasses Khronos" © The Khronos Group (CC-BY 4.0) — github.com/KhronosGroup/glTF-Sample-Assets',
  },
  {
    id: 'round_wire', label: 'Round Wire', swatch: ['#e0b85a', '#ffffff'],
    model: '/models/round_wire.glb', width: 2.05,
    materials: { 'Glass': 'lensClear', 'Gold': 'gold', 'black': 'acetateTort' },
    credit: CC0_PACK,
  },
  {
    id: 'browline', label: 'Browline', swatch: ['#3a1d0e', '#d9dadc'],
    model: '/models/browline.glb', width: 2.2,
    materials: { 'Material.016': 'lensClear', 'Material.017': 'acetateTort' },
    credit: CC0_PACK,
  },
  {
    id: 'cat_eye', label: 'Cat Eye', swatch: ['#8c0f1f', '#4a0c1c'],
    model: '/models/cat_eye.glb', width: 2.35,
    materials: { 'Material.020': 'lensRose', 'Material.003': 'acetateRed' },
    credit: CC0_PACK,
  },
  {
    id: 'shield', label: 'Shield', swatch: ['#111113', '#1d6dff'],
    model: '/models/shield.glb', width: 2.25,
    materials: { 'Material.008': 'lensMirror', 'black': 'matteBlack' },
    credit: CC0_PACK,
  },
  {
    id: 'pixel', label: 'Pixel', swatch: ['#000000', '#ffffff'],
    model: '/models/pixel.glb', width: 2.2,
    materials: { 'black': 'matteBlack', 'Material.013': 'acetateWhite' },
    credit: CC0_PACK,
  },
  {
    id: 'shutter', label: 'Shutter', swatch: ['#39ff6a', '#0a0a0c'],
    model: '/models/shutter.glb', width: 2.15,
    materials: { 'Base': 'plasticNeon', 'black': 'acetateBlack' },
    credit: CC0_PACK,
  },
  // Original models
  { id: 'round_rim', label: 'Round',   swatch: ['#c8a84b'], model: '/models/round_rim.glb', width: 2.3 },
  { id: 'hypno',     label: 'Hypno',   swatch: ['#ffffff'], model: '/models/hypno.glb',     width: 2.0 },
  { id: 'groucho',   label: 'Groucho', swatch: ['#1a1a1a'], model: '/models/Groucho.glb',   width: 2.3, yOffset: -0.25 },
]

// ── Landmark smoothing (One-Euro filter) ──────────────────────────────────────
// Low jitter when the head is still, low lag when it moves quickly.

class OneEuro {
  constructor(minCutoff = 1.2, beta = 0.012, dCutoff = 1.0) {
    Object.assign(this, { minCutoff, beta, dCutoff, x: null, dx: 0 })
  }
  static alpha(cutoff, dt) { const r = 2 * Math.PI * cutoff * dt; return r / (r + 1) }
  filter(v, dt) {
    if (this.x === null) { this.x = v; return v }
    const dv = (v - this.x) / dt
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (dv - this.dx)
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx)
    this.x += OneEuro.alpha(cutoff, dt) * (v - this.x)
    return this.x
  }
}

// Landmark indices used for pose
const LMK = { lOuter: 33, lInner: 133, rOuter: 263, rInner: 362, top: 10, chin: 152 }

// ── Renderer ──────────────────────────────────────────────────────────────────

export class GlassesRenderer {
  constructor(canvas, { onThumbnails } = {}) {
    this.canvas = canvas
    this.scene  = new THREE.Scene()
    this.onThumbnails = onThumbnails

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true, // keeps the last frame in the buffer so drawImage() captures it
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping

    this.camera = null
    this._models = {}          // id → { group, modelWidth }
    this._styleId = null
    this._modelsLoaded = false
    this._pendingStyle = GLASSES_STYLES[0].id
    this._filters = {}
    this._lastTime = 0

    this._setupLighting()
    this._setupOccluder()
    this._setupCamera(canvas.clientWidth || 640, canvas.clientHeight || 480)
    this._loadModels()
  }

  // ── Lighting ────────────────────────────────────────────────────────────────

  _setupLighting() {
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this._envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environment = this._envTexture
    pmrem.dispose()

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.6))

    const key = new THREE.DirectionalLight(0xffffff, 1.4)
    key.position.set(0.4, 1, 1.2)
    this.scene.add(key)
  }

  // ── Head occluder ───────────────────────────────────────────────────────────
  // An invisible, depth-only ellipsoid roughly the shape of a head. It hides
  // the far temple arm when you turn your head, which sells the effect.

  _setupOccluder() {
    const mat = new THREE.MeshBasicMaterial({ colorWrite: false })
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat)
    // In units of eye-distance (E ≈ 6.3 cm): ~13 cm wide, ~19 cm tall, ~22 cm deep.
    // Kept slightly narrower than the frames so the near arm stays visible.
    head.scale.set(1.0, 1.5, 1.75)
    head.position.set(0, 0.2, -1.85)
    head.renderOrder = -1

    this._head = new THREE.Group()
    this._head.add(head)
    this._head.visible = false
    this.scene.add(this._head)
  }

  setDebugOccluder(on) {
    const m = this._head.children[0].material
    m.colorWrite = on
    m.color.set(0xff00ff)
    m.opacity = 0.4
    m.transparent = on
    m.needsUpdate = true
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  _setupCamera(w, h) {
    this.camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -5000, 5000)
    this.camera.position.z = 1000
    this.renderer.setSize(w, h, false)
  }

  // ── Model loading ────────────────────────────────────────────────────────────

  async _loadModels() {
    const loader = new GLTFLoader()

    const load = async (style) => {
      try {
        const gltf  = await loader.loadAsync(style.model)
        const inner = gltf.scene
        if (style.rotateY) inner.rotation.y = style.rotateY
        this._applyMaterials(inner, style)
        inner.updateMatrixWorld(true)

        // Normalise: centre horizontally, put the front of the frame at z = 0,
        // and centre vertically on the *front* of the frame (not the temples).
        const box  = new THREE.Box3().setFromObject(inner)
        const size = box.getSize(new THREE.Vector3())
        const band = box.max.z - size.x * 0.15
        const front = new THREE.Box3()
        const v = new THREE.Vector3()
        inner.traverse(o => {
          if (!o.isMesh || !o.visible) return
          const pos = o.geometry.attributes.position
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
            if (v.z >= band) front.expandByPoint(v)
          }
        })
        const fc = front.isEmpty() ? box.getCenter(new THREE.Vector3()) : front.getCenter(new THREE.Vector3())
        inner.position.sub(new THREE.Vector3(fc.x, fc.y, box.max.z))

        const outer = new THREE.Group()
        outer.add(inner)
        outer.visible = false
        this.scene.add(outer)

        this._models[style.id] = { group: outer, modelWidth: size.x }
      } catch (err) {
        console.error(`[GlassesRenderer] Failed to load ${style.model}:`, err)
      }
    }

    await Promise.all(GLASSES_STYLES.map(load))
    if (this._disposed) return

    this._modelsLoaded = true
    this._renderThumbnails()
    this.setStyle(this._pendingStyle)
  }

  _applyMaterials(root, style) {
    const map = style.materials ?? {}
    root.traverse(o => {
      if (!o.isMesh) return
      const name = o.material?.name
      const preset = map[name]
      if (preset === 'hide') { o.visible = false; return }
      if (preset && MATERIALS[preset]) {
        o.material.dispose()
        o.material = MATERIALS[preset]()
        o.material.name = name
      } else if (o.material?.transmission > 0) {
        // Generic fallback for any transmissive material
        o.material.dispose()
        o.material = MATERIALS.lensSmoke()
      }
    })
  }

  // ── Picker thumbnails ────────────────────────────────────────────────────────
  // Renders each model once at a ¾ angle and hands back data URLs.

  _renderThumbnails() {
    if (!this.onThumbnails) return
    const r = this.renderer
    const prevSize = r.getSize(new THREE.Vector2())
    const prevRatio = r.getPixelRatio()
    const W = 120, H = 72

    r.setPixelRatio(2)
    r.setSize(W, H, false)
    const cam = new THREE.PerspectiveCamera(28, W / H, 0.01, 100)
    cam.position.set(1.15, 0.35, 3.1)
    cam.lookAt(0, -0.05, -0.35)

    this._head.visible = false
    const all = Object.values(this._models)
    all.forEach(m => { m.group.visible = false })

    const thumbs = {}
    for (const [id, { group, modelWidth }] of Object.entries(this._models)) {
      group.visible = true
      group.position.set(0, 0, 0)
      group.quaternion.identity()
      group.scale.setScalar(2 / modelWidth)
      r.render(this.scene, cam)
      thumbs[id] = r.domElement.toDataURL('image/png')
      group.visible = false
    }

    r.setPixelRatio(prevRatio)
    r.setSize(prevSize.x, prevSize.y, false)
    r.clear()
    this.onThumbnails(thumbs)
  }

  // ── Style swap ───────────────────────────────────────────────────────────────

  setStyle(id) {
    this._pendingStyle = id
    if (!this._modelsLoaded) return
    Object.values(this._models).forEach(({ group }) => { group.visible = false })
    this._styleId = this._models[id] ? id : Object.keys(this._models)[0]
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

  _smooth(key, vec, dt) {
    let f = this._filters[key]
    if (!f) f = this._filters[key] = [new OneEuro(), new OneEuro(), new OneEuro()]
    vec.set(f[0].filter(vec.x, dt), f[1].filter(vec.y, dt), f[2].filter(vec.z, dt))
    return vec
  }

  update(landmarks, videoW, videoH, cW, cH, time = performance.now()) {
    const modelData = this._models[this._styleId]
    const dt = Math.min(Math.max((time - this._lastTime) / 1000, 1 / 120), 0.25)
    this._lastTime = time

    if (!modelData || !landmarks || landmarks.length < 468) {
      if (modelData) modelData.group.visible = false
      this._head.visible = false
      this._filters = {} // start fresh when the face comes back
      this.renderer.render(this.scene, this.camera)
      return
    }

    const { group, modelWidth } = modelData

    // Normalised landmark → world px (accounts for object-fit: cover crop).
    // MediaPipe z is negative toward the camera, in roughly x-scale units.
    const k    = Math.max(cW / videoW, cH / videoH)
    const offX = (cW - videoW * k) / 2
    const offY = (cH - videoH * k) / 2
    const P = (i) => {
      const l = landmarks[i]
      return new THREE.Vector3(
        l.x * videoW * k + offX - cW / 2,
        -(l.y * videoH * k + offY - cH / 2),
        -l.z * videoW * k,
      )
    }

    const lEye = this._smooth('l', P(LMK.lOuter).add(P(LMK.lInner)).multiplyScalar(0.5), dt)
    const rEye = this._smooth('r', P(LMK.rOuter).add(P(LMK.rInner)).multiplyScalar(0.5), dt)
    const top  = this._smooth('t', P(LMK.top), dt)
    const chin = this._smooth('c', P(LMK.chin), dt)

    // Head orientation from eye line + chin→forehead line
    const xAxis = new THREE.Vector3().subVectors(rEye, lEye)
    const eyeDist = xAxis.length()
    xAxis.normalize()
    const yAxis = new THREE.Vector3().subVectors(top, chin).normalize()
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
    yAxis.crossVectors(zAxis, xAxis)

    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
    // The chin→forehead line leans back ~10°; tip the frame forward to sit level.
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.17))

    const anchor = lEye.clone().add(rEye).multiplyScalar(0.5)

    // Head occluder follows the raw head pose
    this._head.visible = true
    this._head.position.copy(anchor)
    this._head.quaternion.copy(q)
    this._head.scale.setScalar(eyeDist)

    // Glasses
    const styleDef = GLASSES_STYLES.find(s => s.id === this._styleId) ?? GLASSES_STYLES[0]
    const yOff  = (styleDef.yOffset ?? 0) * eyeDist
    const depth = (styleDef.depth ?? 0.3) * eyeDist
    const up    = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const fwd   = new THREE.Vector3(0, 0, 1).applyQuaternion(q)

    group.visible = true
    group.position.copy(anchor).addScaledVector(up, yOff).addScaledVector(fwd, depth)
    group.quaternion.copy(q)
    group.scale.setScalar((eyeDist * (styleDef.width ?? 2.2)) / modelWidth)

    this.renderer.render(this.scene, this.camera)
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  dispose() {
    this._disposed = true
    this.scene.traverse(obj => {
      obj.geometry?.dispose()
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach(m => m?.dispose())
    })
    this._envTexture?.dispose()
    this.renderer.dispose()
  }
}
