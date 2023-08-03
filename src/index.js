import Loader from './Loader'
import ViewerCore from './core/ViewerCore'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'

init()

async function init() {
  const volumeMeta = await Loader.getVolumeMeta()
  const segmentMeta = await Loader.getSegmentMeta()

  const viewer = new ViewerCore({ volumeMeta, segmentMeta })

  update(viewer)
}

function update(viewer) {
  updateViewer(viewer)
  updateGUI(viewer)
}

function updateViewer(viewer) {
  const { mode, layers } = viewer.params

  if (mode === 'segment') { modeA(viewer) }
  if (mode === 'volume') { modeB(viewer) }
  if (mode === 'volume-segment') { modeC(viewer) }
}

let gui

function updateGUI(viewer) {
  const { mode, volumeMeta } = viewer.params

  if (gui) { gui.destroy() }
  gui = new GUI()
  gui.add(viewer.params, 'mode', ['segment', 'volume', 'volume-segment']).onChange(() => update(viewer))

  if (mode === 'segment') { return }
  if (mode === 'volume') {
    gui.add(viewer.params.layers, 'select', viewer.params.layers.options).name('layers').onChange(() => update(viewer))
  }
  if (mode === 'volume-segment') {
    gui.add(viewer.params, 'surface', 0.001, 0.5).onChange(viewer.render)
  }
}

// segment mode
function modeA(viewer) {
  viewer.clear()
  const segment = viewer.updateSegment()

  segment.then(() => viewer.render())
    .then(() => { console.log(`segment ${viewer.params.layers.select} is loaded`) })
}

// volume mode
function modeB(viewer) {
  viewer.clear()
  const volume = viewer.updateVolume()

  volume.then(() => viewer.render())
    .then(() => { console.log(`volume ${viewer.params.layers.select} is loaded`) })
}

// volume-segment mode
function modeC(viewer) {
  viewer.clear()
  const volume = viewer.updateVolume()
  const segment = viewer.updateSegment()

  Promise.all([volume, segment])
    .then(() => viewer.clipSegment())
    .then(() => viewer.updateSegmentSDF())
    .then(() => viewer.render())
    .then(() => { console.log(`volume-segment ${viewer.params.layers.select} is loaded`) })
}
