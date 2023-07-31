import ViewerCore from './core/ViewerCore'

const viewer = new ViewerCore()
modeB(viewer, 0)

document.addEventListener('keydown', function(event) {
    if (event.code === 'Digit0') { modeB(viewer, 0) }
    if (event.code === 'Digit1') { modeB(viewer, 1) }
    if (event.code === 'Digit2') { modeB(viewer, 2) }
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
