import Ammo from "../lib/ammo.js";

const ammo = await Ammo();

init();

function init() {
  console.log(ammo);
  const collisionConfiguration = new ammo.btDefaultCollisionConfiguration();
  console.log(collisionConfiguration);
}

function initGraphics() {}

function initPhysics() {}
