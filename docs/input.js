export class InputController {
  constructor({ upButton, downButton, leftButton, rightButton }) {
    this.keys = new Set();
    this.pressedDirections = new Set();
    this.pointerDirections = new Map();
    this.active = false;
    this.buttons = {
      up: upButton,
      down: downButton,
      left: leftButton,
      right: rightButton,
    };
    this.buttonDirections = new Map(
      Object.entries(this.buttons)
        .filter(([, button]) => Boolean(button))
        .map(([direction, button]) => [button, direction])
    );

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
      this.releasePointer();
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
        this.pointerDirections.set(event.pointerId, direction);
        this.syncPressedDirections();
        button.setPointerCapture?.(event.pointerId);
      };

      const move = (event) => {
        if (!this.pointerDirections.has(event.pointerId)) {
          return;
        }

        event.preventDefault();
        const hoveredButton = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".touch-button");
        const hoveredDirection = this.buttonDirections.get(hoveredButton);

        if (hoveredDirection) {
          this.pointerDirections.set(event.pointerId, hoveredDirection);
        } else {
          this.pointerDirections.set(event.pointerId, null);
        }

        this.syncPressedDirections();
      };

      const deactivate = (event) => {
        if (event?.pointerId !== undefined && !this.pointerDirections.has(event.pointerId)) {
          return;
        }

        event?.preventDefault?.();
        if (event?.pointerId !== undefined) {
          this.pointerDirections.delete(event.pointerId);
        }
        this.syncPressedDirections();
      };

      button.addEventListener("pointerdown", activate);
      button.addEventListener("pointermove", move);
      button.addEventListener("pointerup", deactivate);
      button.addEventListener("pointercancel", deactivate);
      button.addEventListener("lostpointercapture", deactivate);
    });
  }

  syncPressedDirections() {
    this.pressedDirections = new Set(
      [...this.pointerDirections.values()].filter((direction) => Boolean(direction))
    );
    Object.entries(this.buttons).forEach(([buttonDirection, button]) => {
      button?.classList.toggle("pressed", this.pressedDirections.has(buttonDirection));
    });
  }

  clearPressedDirections() {
    this.pressedDirections.clear();
    Object.values(this.buttons).forEach((button) => button?.classList.remove("pressed"));
  }

  releasePointer() {
    this.pointerDirections.clear();
    this.clearPressedDirections();
  }

  setActive(active) {
    this.active = active;

    if (!active) {
      this.keys.clear();
      this.releasePointer();
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
