import * as THREE from 'three'
import textureViridis from './textures/cm_viridis.png'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { NRRDLoader } from 'three/examples/jsm/loaders/NRRDLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VolumeMaterial } from './VolumeMaterial.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export default class ViewerCore {
  constructor() {
    this.renderer = null
    this.scene = null
    this.camera = null
    this.mode = null

    this.mesh = null
    this.volumeTex = null
    this.volumeMeta = null
    this.volumeTarget = null
    this.segmentMeta = null

    this.render = this.render.bind(this)
    this.canvas = document.querySelector('.webgl')
    this.inverseBoundsMatrix = new THREE.Matrix4()
    this.cmtextures = { viridis: new THREE.TextureLoader().load(textureViridis) }

    this.volumePass = new FullScreenQuad(new VolumeMaterial())

    this.init()
  }

  async init() {
    // renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    // scene setup
    this.scene = new THREE.Scene()

    // camera setup
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50)
    this.camera.position.copy(new THREE.Vector3(0.4, -0.4, -1.0).multiplyScalar(1.5))
    this.camera.up.set(0, -1, 0)
    this.camera.far = 5
    this.camera.updateProjectionMatrix()

    window.addEventListener(
      'resize',
      () => {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.render()
      },
      false
    );

    const controls = new OrbitControls(this.camera, this.canvas)
    controls.addEventListener('change', this.render)
  }

  clear() {
    if (this.volumeTex) { this.volumeTex.dispose() }

    if (this.mesh) {
      this.mesh.geometry.dispose()
      this.mesh.material.dispose()
      this.scene.remove(this.mesh)
    }  
  }

  async updateVolume(id) {
    if (!this.volumeMeta) { this.volumeMeta = await fetch('volume/meta.json').then((res) => res.json()) }

    this.volumeTarget = this.volumeMeta.nrrd[id]
    this.clip = this.volumeTarget.clip
    this.nrrd = this.volumeTarget.shape

    const matrix = new THREE.Matrix4()
    const center = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scaling = new THREE.Vector3()
    const s = 1 / Math.max(this.nrrd.w, this.nrrd.h, this.nrrd.d)

    scaling.set(this.nrrd.w * s, this.nrrd.h * s, this.nrrd.d * s)
    matrix.compose(center, quat, scaling)
    this.inverseBoundsMatrix.copy(matrix).invert()

    await new NRRDLoader()
      .loadAsync('volume/' + this.volumeTarget.id + '.nrrd')
      .then((volume) => {
        this.volumeTex = new THREE.Data3DTexture(volume.data, volume.xLength, volume.yLength, volume.zLength)

        this.volumeTex.format = THREE.RedFormat
        this.volumeTex.type = THREE.FloatType
        this.volumeTex.minFilter = THREE.LinearFilter
        this.volumeTex.magFilter = THREE.LinearFilter
        this.volumeTex.unpackAlignment = 1
        this.volumeTex.needsUpdate = true

        const material = this.volumePass.material
        material.uniforms.voldata.value = this.volumeTex
        material.uniforms.size.value.set(volume.xLength, volume.yLength, volume.zLength)
      })
  }

  async updateSegment(id) {
    if (!this.volumeMeta) { this.volumeMeta = await fetch("volume/meta.json").then((res) => res.json()) }
    if (!this.segmentMeta) { this.segmentMeta = await fetch('segment/meta.json').then((res) => res.json()) }

    const volumeTarget = this.volumeMeta.nrrd[id]
    const clip = volumeTarget.clip
    const nrrd = volumeTarget.shape

    // select necessary segment to list
    const segmentList = []

    for (let i = 0; i < this.segmentMeta.obj.length; i++) {
      const segmentTarget = this.segmentMeta.obj[i]
      const c0 = volumeTarget.clip
      const c1 = segmentTarget.clip

      if (c0.x + c0.w >= c1.x && c1.x + c1.w >= c0.x) {
        if (c0.y + c0.h >= c1.y && c1.y + c1.h >= c0.y) {
          if (c0.z + c0.d >= c1.z && c1.z + c1.d >= c0.z) {
            segmentList.push(segmentTarget.id)
          }
        }
      }
    }

    // segment loading
    const promiseList = []
    const geometryList = []

    for (let i = 0; i < segmentList.length; i++) {
      const loading = new OBJLoader()
        .loadAsync('segment/' + segmentList[i] + '.obj')
        .then((object) => { geometryList.push(object.children[0].geometry) })

      promiseList.push(loading)
    }
    await Promise.all(promiseList)

    // turn all segment into single geometry
    const geometry = BufferGeometryUtils.mergeGeometries(geometryList, true)
    const material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.scale.set(1/clip.w, 1/clip.w, 1/clip.w)
    this.scene.add(this.mesh)

    // clear the original geometry
    for (let i = 0; i < geometryList.length; i ++) { geometryList[i].dispose() }
  }

  render(mode) {
    if (typeof mode === 'string') this.mode = mode
    if (!this.renderer) return

    if (this.mode === 'segment') {

      this.renderer.render(this.scene, this.camera)

    } else if (this.mode === 'volume') {
      this.camera.updateMatrixWorld()

      const texture = this.cmtextures.viridis
      if (texture) this.volumePass.material.uniforms.cmdata.value = texture

      this.volumePass.material.uniforms.clim.value.set(0.5, 0.9)
      this.volumePass.material.uniforms.renderstyle.value = 0 // 0: MIP, 1: ISO
      this.volumePass.material.uniforms.renderthreshold.value = 0.15 // For ISO renderstyle
      this.volumePass.material.uniforms.projectionInverse.value.copy(this.camera.projectionMatrixInverse)
      this.volumePass.material.uniforms.sdfTransformInverse.value.copy(new THREE.Matrix4()).invert().premultiply(this.inverseBoundsMatrix).multiply(this.camera.matrixWorld)
      this.volumePass.render(this.renderer)
    }
  }
}
