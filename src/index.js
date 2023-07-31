import ViewerCore from './core/ViewerCore'

const viewer = new ViewerCore()
modeC(viewer, 0)

document.addEventListener('keydown', function(event) {
    if (event.code === 'Digit0') { modeA(viewer, 0) }
    if (event.code === 'Digit1') { modeB(viewer, 0) }
    if (event.code === 'Digit2') { modeC(viewer, 0) }
})

function modeA(viewer, id) {
    viewer.clear()
    const volume = viewer.updateVolume(id)

    volume.then(() => viewer.render('volume'))
        .then(() => { console.log(`volume ${id} is loaded`) })
}

function modeB(viewer, id) {
    viewer.clear()
    const segment = viewer.updateSegment(id)

    segment.then(() => viewer.render('segment'))
        .then(() => { console.log(`segment ${id} is loaded`) })
}

function modeC(viewer, id) {
    viewer.clear()
    const volume = viewer.updateVolume(id)
    const segment = viewer.updateSegment(id)

    Promise.all([volume, segment])
        .then(() => viewer.clipSegment(id))
        .then(() => viewer.updateSegmentSDF(id))
        .then(() => viewer.render('volume-segment'))
        .then(() => { console.log(`volume-segment ${id} is loaded`) })
}
