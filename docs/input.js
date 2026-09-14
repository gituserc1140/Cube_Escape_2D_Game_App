export class InputController {
  constructor({ upButton, downButton, leftButton, rightButton }) {
    this.keys = new Set();
    this.pressedDirections = new Set();
    this.active = false;
    this.buttons = {
      up: upButton,
      down: downButton,
      left: leftButton,
      right: rightButton,
    };

    this.bindKeyboard();
    this.bindTouchControls();
  }

  bindKeyboard() {
    const supportedKeys = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];

    window.addEventListener("keydown", (event) => {
      if (!this.active || !supportedKeys.includes(event.code)) {
        return;
      }

      event.preventDefault();
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.clearPressedDirections();
    });
  }

  bindTouchControls() {
    Object.entries(this.buttons).forEach(([direction, button]) => {
      if (!button) {
        return;
      }

      const activate = (event) => {
        if (!this.active) {
          return;
        }

        event.preventDefault();
        this.pressedDirections.add(direction);
        button.classList.add("pressed");
        button.setPointerCapture?.(event.pointerId);
      };

      const deactivate = (event) => {
        event?.preventDefault?.();
        this.pressedDirections.delete(direction);
        button.classList.remove("pressed");
      };

      button.addEventListener("pointerdown", activate);
      button.addEventListener("pointerup", deactivate);
      button.addEventListener("pointercancel", deactivate);
      button.addEventListener("lostpointercapture", deactivate);
    });
  }

  clearPressedDirections() {
    this.pressedDirections.clear();
    Object.values(this.buttons).forEach((button) => button?.classList.remove("pressed"));
  }

  setActive(active) {
    this.active = active;

    if (!active) {
      this.keys.clear();
      this.clearPressedDirections();
    }
  }

  consumeFrameState() {
    const move = { x: 0, y: 0 };

    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft") || this.pressedDirections.has("left")) {
      move.x -= 1;
    }

    if (this.keys.has("KeyD") || this.keys.has("ArrowRight") || this.pressedDirections.has("right")) {
      move.x += 1;
    }

    if (this.keys.has("KeyW") || this.keys.has("ArrowUp") || this.pressedDirections.has("up")) {
      move.y -= 1;
    }

    if (this.keys.has("KeyS") || this.keys.has("ArrowDown") || this.pressedDirections.has("down")) {
      move.y += 1;
    }

    return { move };
  }
}
