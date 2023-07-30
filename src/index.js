import ViewerCore from "./core/ViewerCore"

const viewer = new ViewerCore()
modeA(viewer, 0)

document.addEventListener('keydown', function(event) {
    if (event.code === 'Digit0') { modeA(viewer, 0) }
    if (event.code === 'Digit1') { modeA(viewer, 1) }
    if (event.code === 'Digit2') { modeA(viewer, 2) }
})

function modeA(viewer, id) {
    viewer.clear()

    viewer.mode = 'volume'
    const volume = viewer.updateVolume(id)

    volume.then(() => viewer.render())
        .then(() => { console.log(`id ${id} is loaded`) })
}