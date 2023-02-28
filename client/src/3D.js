import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import Ammo from "../lib/ammo.js";

const physicsConfig = {
  margin: 0.05,
  gravity: -9.81,
};

const ammo = await Ammo();

export function run() {
  const { render, stats, physicsWorld, meshes, transformAux } = init();
  animate({ render, stats, physicsWorld, meshes, clock: new THREE.Clock(), transformAux });
}

function init() {
  const meshes = [];

  const { render, scene, stats, camera } = initGraphics();

  const { physicsWorld, transformAux } = initPhysics();
  const initialMeshes = initObjects({ scene, physicsWorld });

  meshes.push(...initialMeshes);

  initInput({ scene, camera, meshes, physicsWorld });

  return { render, stats, physicsWorld, meshes, transformAux };
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

  return { render: () => renderer.render(scene, camera), scene, stats, camera };
}

function initPhysics() {
  const collisionConfiguration = new ammo.btDefaultCollisionConfiguration();
  const dispatcher = new ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new ammo.btDbvtBroadphase();
  const solver = new ammo.btSequentialImpulseConstraintSolver();
  const physicsWorld = new ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
  physicsWorld.setGravity(new ammo.btVector3(0, physicsConfig.gravity, 0));

  const transformAux = new ammo.btTransform();

  return { physicsWorld, transformAux };
}

function onWindowResize({ renderer, camera }) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initObjects({ scene, physicsWorld }) {
  const meshes = [];
  const { mesh: groundMesh, body: groundBody } = createGround();
  meshes.push(groundMesh);
  scene.add(groundMesh);
  physicsWorld.addRigidBody(groundBody);
  return meshes;
}

function createGround() {
  const pos = new THREE.Vector3(0, -0.5, 0);
  const quat = new THREE.Quaternion(0, 0, 0, 1);
  const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
  const { mesh, body } = createParalellepipedWithPhysics({ sx: 40, sy: 1, sz: 40, mass: 0, pos, quat, material });
  mesh.receiveShadow = true;
  return { mesh, body };
}

function createParalellepipedWithPhysics({ sx, sy, sz, mass, pos, quat, material }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
  const shape = new ammo.btBoxShape(new ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
  shape.setMargin(physicsConfig.margin);

  const body = createRigidBody({ mesh, physicsShape: shape, mass, pos, quat });

  return { mesh, body };
}

function createRigidBody({ mesh, physicsShape, mass, pos, quat, vel, angVel }) {
  pos ? mesh.position.copy(pos) : (pos = mesh.position);
  quat ? mesh.quaternion.copy(quat) : (quat = mesh.quaternion);

  const transform = new ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  const motionState = new ammo.btDefaultMotionState(transform);

  const localInertia = new ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
  const body = new ammo.btRigidBody(rbInfo);

  body.setFriction(0.5);

  if (vel) body.setLinearVelocity(new ammo.btVector3(vel.x, vel.y, vel.z));
  if (angVel) body.setAngularVelocity(new ammo.btVector3(angVel.x, angVel.y, angVel.z));

  mesh.userData.physicsBody = body;
  mesh.userData.collided = false;

  // If the object has mass, it's movable and deactivation is disabled
  if (mass > 0) body.setActivationState(4);

  return body;
}

function initInput({ scene, camera, meshes, physicsWorld }) {
  window.addEventListener("mousedown", (event) => {
    const { ballMesh, ballBody } = throwBall({ event, scene, camera, meshes, physicsWorld });
    scene.add(ballMesh);
    meshes.push(ballMesh);
    physicsWorld.addRigidBody(ballBody);
  });
}

function throwBall({ event, scene, camera, meshes, physicsWorld }) {
  const mouseCoords = new THREE.Vector2();

  mouseCoords.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouseCoords, camera);

  // Creates a ball and throws it
  const ballMass = 35;
  const ballRadius = 0.4;

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius, 56, 40),
    new THREE.MeshPhongMaterial({ color: "#fff" })
  );
  ball.castShadow = true;
  ball.receiveShadow = true;

  const ballShape = new ammo.btSphereShape(ballRadius);
  ballShape.setMargin(physicsConfig.margin);
  const pos = new THREE.Vector3().copy(raycaster.ray.direction);
  pos.add(raycaster.ray.origin);
  const quat = new THREE.Quaternion(0, 0, 0, 1);
  const ballBody = createRigidBody({ mesh: ball, physicsShape: ballShape, mass: ballMass, pos, quat });

  pos.copy(raycaster.ray.direction);
  pos.multiplyScalar(24);
  ballBody.setLinearVelocity(new ammo.btVector3(pos.x, pos.y, pos.z));

  return { ballMesh: ball, ballBody };
}

function animate({ render, stats, physicsWorld, clock, meshes, transformAux }) {
  requestAnimationFrame(() => animate({ render, stats, physicsWorld, clock, meshes, transformAux }));
  const deltaTime = clock.getDelta();
  updatePhysics({ deltaTime, physicsWorld, meshes, transformAux });
  render();
  stats.update();
}

function updatePhysics({ deltaTime, physicsWorld, meshes, transformAux }) {
  physicsWorld.stepSimulation(deltaTime, 10);

  meshes.forEach((mesh) => {
    const objPhys = mesh.userData.physicsBody;
    const ms = objPhys.getMotionState();

    if (ms) {
      ms.getWorldTransform(transformAux);
      const p = transformAux.getOrigin();
      const q = transformAux.getRotation();
      mesh.position.set(p.x(), p.y(), p.z());
      mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());

      mesh.userData.collided = false;
    }
  });
}
