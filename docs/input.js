function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Unify keyboard, mouse drag, joystick, and touch-look input into one frame state.
export class InputController {
  constructor({ canvas, joystickZone, joystickBase, joystickKnob, lookPad }) {
    this.canvas = canvas;
    this.joystickZone = joystickZone;
    this.joystickBase = joystickBase;
    this.joystickKnob = joystickKnob;
    this.lookPad = lookPad;

    this.keys = new Set();
    this.lookDelta = { x: 0, y: 0 };
    this.joystickVector = { x: 0, y: 0 };
    this.lookPointerId = null;
    this.joystickPointerId = null;
    this.lastLookPoint = null;
    this.joystickStart = null;
    this.joystickRadius = 42;
    this.keyboardLookSpeed = 4;
    this.active = false;

    this.bindKeyboard();
    this.bindMouseLook();
    this.bindTouchControls();
  }

  bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (!this.active) {
        return;
      }

      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.resetTouchInput();
    });
  }

  bindMouseLook() {
    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.active || event.pointerType === "touch") {
        return;
      }

      this.lookPointerId = event.pointerId;
      this.lastLookPoint = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookPointerId || !this.lastLookPoint) {
        return;
      }

      this.lookDelta.x += event.clientX - this.lastLookPoint.x;
      this.lookDelta.y += event.clientY - this.lastLookPoint.y;
      this.lastLookPoint = { x: event.clientX, y: event.clientY };
    });

    const releasePointer = (event) => {
      if (event.pointerId === this.lookPointerId) {
        this.lookPointerId = null;
        this.lastLookPoint = null;
      }
    };

    this.canvas.addEventListener("pointerup", releasePointer);
    this.canvas.addEventListener("pointercancel", releasePointer);
  }

  bindTouchControls() {
    this.joystickZone.addEventListener("pointerdown", (event) => {
      if (!this.active || event.pointerType !== "touch") {
        return;
      }

      event.preventDefault();
      this.joystickPointerId = event.pointerId;
      this.joystickStart = { x: event.clientX, y: event.clientY };
      this.joystickZone.setPointerCapture(event.pointerId);
      this.updateJoystick(event.clientX, event.clientY);
    });

    this.joystickZone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.joystickPointerId) {
        return;
      }

      event.preventDefault();
      this.updateJoystick(event.clientX, event.clientY);
    });

    const stopJoystick = (event) => {
      if (event.pointerId === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.joystickStart = null;
        this.joystickVector = { x: 0, y: 0 };
        this.joystickKnob.style.transform = "translate(-50%, -50%)";
      }
    };

    this.joystickZone.addEventListener("pointerup", stopJoystick);
    this.joystickZone.addEventListener("pointercancel", stopJoystick);

    this.lookPad.addEventListener("pointerdown", (event) => {
      if (!this.active || event.pointerType !== "touch") {
        return;
      }

      event.preventDefault();
      this.lookPointerId = event.pointerId;
      this.lastLookPoint = { x: event.clientX, y: event.clientY };
      this.lookPad.setPointerCapture(event.pointerId);
    });

    this.lookPad.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookPointerId || !this.lastLookPoint) {
        return;
      }

      event.preventDefault();
      this.lookDelta.x += (event.clientX - this.lastLookPoint.x) * 1.15;
      this.lookDelta.y += (event.clientY - this.lastLookPoint.y) * 1.15;
      this.lastLookPoint = { x: event.clientX, y: event.clientY };
    });

    const stopLook = (event) => {
      if (event.pointerId === this.lookPointerId) {
        this.lookPointerId = null;
        this.lastLookPoint = null;
      }
    };

    this.lookPad.addEventListener("pointerup", stopLook);
    this.lookPad.addEventListener("pointercancel", stopLook);
  }

  updateJoystick(clientX, clientY) {
    if (!this.joystickStart) {
      return;
    }

    const deltaX = clamp(clientX - this.joystickStart.x, -this.joystickRadius, this.joystickRadius);
    const deltaY = clamp(clientY - this.joystickStart.y, -this.joystickRadius, this.joystickRadius);
    const distance = Math.hypot(deltaX, deltaY);
    const scale = distance > this.joystickRadius ? this.joystickRadius / distance : 1;
    const limitedX = deltaX * scale;
    const limitedY = deltaY * scale;

    this.joystickVector = {
      x: clamp(limitedX / this.joystickRadius, -1, 1),
      y: clamp(-limitedY / this.joystickRadius, -1, 1),
    };

    this.joystickKnob.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;
  }

  resetTouchInput() {
    this.joystickVector = { x: 0, y: 0 };
    this.lookPointerId = null;
    this.joystickPointerId = null;
    this.lastLookPoint = null;
    this.joystickStart = null;
    this.joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  setActive(active) {
    this.active = active;

    if (!active) {
      this.keys.clear();
      this.resetTouchInput();
      this.lookDelta = { x: 0, y: 0 };
    }
  }

  consumeFrameState() {
    const keyboardMove = {
      x: (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0),
      y: (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0),
    };
    const keyboardLook = {
      x: ((this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("ArrowLeft") ? 1 : 0)) * this.keyboardLookSpeed,
      y: ((this.keys.has("ArrowDown") ? 1 : 0) - (this.keys.has("ArrowUp") ? 1 : 0)) * this.keyboardLookSpeed,
    };

    const move = {
      x: clamp(keyboardMove.x + this.joystickVector.x, -1, 1),
      y: clamp(keyboardMove.y + this.joystickVector.y, -1, 1),
    };

    const look = {
      x: this.lookDelta.x + keyboardLook.x,
      y: this.lookDelta.y + keyboardLook.y,
    };
    this.lookDelta = { x: 0, y: 0 };
    return { move, look };
  }
}
