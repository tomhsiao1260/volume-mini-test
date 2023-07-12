import ViewerCore from "./core/ViewerCore"

let id = 0
const viewer = new ViewerCore()

// init setup
viewer.init()
    .then(() => viewer.updateID(id))
    .then(() => { console.log(`id ${id} is loaded (first load)`) })

// press space for the next
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        id ++
        viewer.updateID(id).then(() => { console.log(`id ${id} is loaded`) })
    }
})