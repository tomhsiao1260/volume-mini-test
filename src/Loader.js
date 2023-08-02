import { NRRDLoader } from 'three/examples/jsm/loaders/NRRDLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

export default class Loader {
  constructor() {
  }

  getVolumeMeta() { return fetch('volume/meta.json').then((res) => res.json()) }

  getSegmentMeta() { return fetch('segment/meta.json').then((res) => res.json()) }

  getVolumeData(filename) { return new NRRDLoader().loadAsync('volume/' + filename) }

  getSegmentData(filename) { return new OBJLoader().loadAsync('segment/' + filename) }
}
