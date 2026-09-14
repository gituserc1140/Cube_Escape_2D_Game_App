import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js";

function circleIntersectsBox(x, z, radius, box) {
  const nearestX = Math.max(box.minX, Math.min(x, box.maxX));
  const nearestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
  const distanceX = x - nearestX;
  const distanceZ = z - nearestZ;
  return distanceX * distanceX + distanceZ * distanceZ < radius * radius;
}

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3();
    this.radius = 0.5;
    this.eyeHeight = 1.7;
    this.moveSpeed = 7.8;
    this.lookSensitivity = 0.0028;
    this.pitch = 0;
    this.yaw = 0;
    this.updateCamera();
  }

  reset(startPosition) {
    this.position.copy(startPosition);
    this.position.y = this.eyeHeight;
    this.pitch = 0;
    this.yaw = Math.PI;
    this.updateCamera();
  }

  update(deltaTime, inputState, collisionBoxes) {
    this.yaw -= inputState.look.x * this.lookSensitivity;
    this.pitch -= inputState.look.y * this.lookSensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.2, 1.2);

    const movement = new THREE.Vector3(inputState.move.x, 0, inputState.move.y);

    if (movement.lengthSq() > 1) {
      movement.normalize();
    }

    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const velocity = forward.multiplyScalar(movement.z).add(right.multiplyScalar(movement.x));

    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(this.moveSpeed * deltaTime);
      this.tryMoveAxis("x", velocity.x, collisionBoxes);
      this.tryMoveAxis("z", velocity.z, collisionBoxes);
    }

    this.updateCamera();
  }

  tryMoveAxis(axis, amount, collisionBoxes) {
    if (amount === 0) {
      return;
    }

    const nextX = axis === "x" ? this.position.x + amount : this.position.x;
    const nextZ = axis === "z" ? this.position.z + amount : this.position.z;
    const blocked = collisionBoxes.some((box) => circleIntersectsBox(nextX, nextZ, this.radius, box));

    if (!blocked) {
      this.position[axis] += amount;
    }
  }

  updateCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
