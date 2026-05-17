/* global THREE */

global.THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')
require('three/examples/js/controls/OrbitControls')

const { Viewer, Entity } = require('../viewer')

const io = require('socket.io-client')
const _qs = new URLSearchParams(window.location.search)
const _server = _qs.get('server') || 'http://localhost:3000'
const socket = io(_server, { path: '/socket.io' })

let firstPositionUpdate = true

const renderer = new THREE.WebGLRenderer()
renderer.setPixelRatio(window.devicePixelRatio || 1)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const viewer = new Viewer(renderer)

let controls = new THREE.OrbitControls(viewer.camera, renderer.domElement)
controls.maxDistance = 30;

socket.on('config', (cfg) => {
  if (cfg?.maxCameraDistance != null && controls) controls.maxDistance = cfg.maxCameraDistance
})

const _orbitSpherical = new THREE.Spherical()
const _orbitOffset = new THREE.Vector3()
const PHI_EPS = 0.01
const BEHIND_SNAP_DELTA = Math.PI / 4
let lastBotYawRender = null
viewer.gamepadService.onCameraOrbit = ({ yaw, pitch }) => {
  if (!controls) return
  _orbitOffset.copy(controls.object.position).sub(controls.target)
  _orbitSpherical.setFromVector3(_orbitOffset)
  _orbitSpherical.theta -= yaw
  _orbitSpherical.phi = Math.max(PHI_EPS, Math.min(Math.PI - PHI_EPS, _orbitSpherical.phi - pitch))
  if (yaw !== 0 && lastBotYawRender != null) {
    let diff = _orbitSpherical.theta - lastBotYawRender
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    if (Math.abs(diff) > BEHIND_SNAP_DELTA) _orbitSpherical.theta = lastBotYawRender
  }
  _orbitOffset.setFromSpherical(_orbitSpherical)
  controls.object.position.copy(controls.target).add(_orbitOffset)
  controls.object.lookAt(controls.target)
  controls.update()
}

function animate() {
  window.requestAnimationFrame(animate)
  if (controls) controls.update()
  viewer.update()
  renderer.render(viewer.scene, viewer.camera)
}
animate()

window.addEventListener('resize', () => {
  viewer.camera.aspect = window.innerWidth / window.innerHeight
  viewer.camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

socket.on('version', (version) => {
  if (!viewer.setVersion(version)) {
    return false
  }

  firstPositionUpdate = true
  viewer.listen(socket)

  let botMesh
  let targetTween
  socket.on('position', ({ pos, addMesh, yaw, pitch }) => {
    if (yaw !== undefined && pitch !== undefined) {
      if (controls) {
        controls.dispose()
        controls = null
      }
      viewer.setFirstPersonCamera(pos, yaw, pitch)
      return
    }
    if (yaw !== undefined) lastBotYawRender = yaw
    if (pos.y > 0 && firstPositionUpdate) {
      controls.target.set(pos.x, pos.y, pos.z)
      viewer.camera.position.set(pos.x, pos.y + 20, pos.z + 20)
      controls.update()
      firstPositionUpdate = false
    } else if (controls) {
      if (targetTween) targetTween.stop()
      targetTween = new TWEEN.Tween(controls.target).to({ x: pos.x, y: pos.y, z: pos.z }, 50).start()
    }

    if (addMesh) {
      if (!botMesh) {
        botMesh = new Entity('1.16.4', 'player', viewer.scene).mesh
        viewer.scene.add(botMesh)
      }
      new TWEEN.Tween(botMesh.position).to({ x: pos.x, y: pos.y, z: pos.z }, 50).start()

      const da = (yaw - botMesh.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(botMesh.rotation).to({ y: botMesh.rotation.y + dy }, 50).start()
    }
  })
})
