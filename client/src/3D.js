import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import Ammo from "../lib/ammo.js";

const physicsConfig = {
  margin: 0.05,
};

const ammo = await Ammo();

export function run() {
  const { render, stats } = init();
  animate({ render, stats });
}

function init() {
  const { render, scene, stats } = initGraphics();
  initPhysics();
  initObjects({ scene });

  return { render, stats };
}

function initGraphics() {
  const container = document.getElementById("container");
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eeeeee");

  camera.position.set(-14, 8, 16);

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.update();

  const textureLoader = new THREE.TextureLoader();

  const ambientLight = new THREE.AmbientLight(0x707070);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(-10, 18, 5);
  light.castShadow = true;
  const d = 14;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;

  light.shadow.camera.near = 2;
  light.shadow.camera.far = 50;

  light.shadow.mapSize.x = 1024;
  light.shadow.mapSize.y = 1024;

  scene.add(light);

  const stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild(stats.domElement);

  window.addEventListener("resize", () => onWindowResize({ renderer, camera }));

  return { render: () => renderer.render(scene, camera), scene, stats };
}

function initPhysics() {
  const collisionConfiguration = new ammo.btDefaultCollisionConfiguration();
}

function onWindowResize({ renderer, camera }) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initObjects({ scene }) {
  const ground = createGround();
  scene.add(ground);
}

function createGround() {
  const pos = new THREE.Vector3(0, -0.5, 0);
  const quat = new THREE.Quaternion(0, 0, 0, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
  const ground = createParalellepipedWithPhysics({ sx: 40, sy: 1, sz: 40, mass: 0, pos, quat, material });
  ground.receiveShadow = true;
  return ground;
}

function createParalellepipedWithPhysics({ sx, sy, sz, mass, pos, quat, material }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
  const shape = new ammo.btBoxShape(new ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
  shape.setMargin(physicsConfig.margin);

  createRigidBody({ mesh, physicsShape: shape, mass, pos, quat });

  return mesh;
}

function createRigidBody({ mesh, physicsShape, mass, pos, quat, vel, angVel }) {
  pos ? mesh.position.copy(pos) : (pos = mesh.position);
}

function animate({ render, stats }) {
  requestAnimationFrame(() => animate({ render, stats }));
  render();
  stats.update();
}
