import * as THREE from 'three'
import textureViridis from './textures/cm_viridis.png'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { NRRDLoader } from 'three/examples/jsm/loaders/NRRDLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VolumeMaterial } from './VolumeMaterial.js'

let renderer, scene, camera
let volumePass, volumeTex, volumeMeta, volumeTarget, nrrd, clip

const inverseBoundsMatrix = new THREE.Matrix4()
const cmtextures = { viridis: new THREE.TextureLoader().load( textureViridis ) }

init()

async function init() {
    // renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    document.body.appendChild(renderer.domElement)

    // scene setup
    scene = new THREE.Scene()

    // camera setup
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        50
    )
    camera.position.set(0.4, -0.4, -1.0)
    camera.up.set(0, -1, 0)
    camera.far = 5
    camera.updateProjectionMatrix()

    window.addEventListener(
        'resize',
        function () {
          camera.aspect = window.innerWidth / window.innerHeight
          camera.updateProjectionMatrix()
          renderer.setSize(window.innerWidth, window.innerHeight)
        },
        false
    )

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.addEventListener( 'change', render )

    // volume pass to render the volume data
    volumePass = new FullScreenQuad(new VolumeMaterial())

    volumeMeta = await fetch('volume/meta.json').then((res) => res.json())
    volumeTarget = volumeMeta.nrrd[0]
    clip = volumeTarget.clip
    nrrd = volumeTarget.shape

    const matrix = new THREE.Matrix4()
    const center = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scaling = new THREE.Vector3()
    const s = 1 / Math.max(nrrd.w, nrrd.h, nrrd.d)

    scaling.set(nrrd.w * s, nrrd.h * s, nrrd.d * s)
    matrix.compose(center, quat, scaling)
    inverseBoundsMatrix.copy(matrix).invert()

    const voxel = await new NRRDLoader()
        .loadAsync('volume/' + volumeTarget.id + '.nrrd')
        .then((volume) => {   
            volumeTex = new THREE.Data3DTexture( volume.data, volume.xLength, volume.yLength, volume.zLength )

            volumeTex.format = THREE.RedFormat
            volumeTex.type = THREE.FloatType
            volumeTex.minFilter = THREE.LinearFilter
            volumeTex.magFilter = THREE.LinearFilter
            volumeTex.unpackAlignment = 1
            volumeTex.needsUpdate = true

            const material = volumePass.material
            material.uniforms.voldata.value = volumeTex
            material.uniforms.size.value.set( volume.xLength, volume.yLength, volume.zLength )
        })

    render()
}

function render() {
    if (!renderer) return

    camera.updateMatrixWorld()

    const texture = cmtextures.viridis
    if (texture) volumePass.material.uniforms.cmdata.value = texture

    volumePass.material.uniforms.clim.value.set( 0.5, 0.9 )
    volumePass.material.uniforms.renderstyle.value = 0 // 0: MIP, 1: ISO
    volumePass.material.uniforms.renderthreshold.value = 0.15 // For ISO renderstyle
    volumePass.material.uniforms.projectionInverse.value.copy( camera.projectionMatrixInverse )
    volumePass.material.uniforms.sdfTransformInverse.value.copy( new THREE.Matrix4() ).invert().premultiply( inverseBoundsMatrix ).multiply( camera.matrixWorld )
    volumePass.render( renderer )
}
