import { stepPosition } from "./maze.js";

export class Player {
  constructor() {
    this.position = { x: 0, y: 0 };
    this.stepInterval = 0.14;
    this.stepCooldown = 0;
  }

  reset(startPosition) {
    this.position = { ...startPosition };
    this.stepCooldown = 0;
  }

  update(deltaTime, inputState, world) {
    this.stepCooldown = Math.max(0, this.stepCooldown - deltaTime);
    const directionKey = this.resolveDirection(inputState.move);

    if (!directionKey || this.stepCooldown > 0) {
      return false;
    }

    const nextPosition = stepPosition(world, this.position.x, this.position.y, directionKey);
    const moved = nextPosition.x !== this.position.x || nextPosition.y !== this.position.y;
    this.position = nextPosition;
    this.stepCooldown = this.stepInterval;
    return moved;
  }

  resolveDirection(move) {
    if (!move.x && !move.y) {
      return null;
    }

    if (Math.abs(move.x) > Math.abs(move.y)) {
      return move.x > 0 ? "E" : "W";
    }

    return move.y > 0 ? "S" : "N";
  }
}
