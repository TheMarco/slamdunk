export class InputSystem {
  constructor(scene) {
    this._holding = false;
    this._horizontal = 0;
    this._justPressed = false;
    this._justReleased = false;

    this._onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!this._holding) this._justPressed = true;
        this._holding = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this._leftHeld = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this._rightHeld = true;
    };

    this._onKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (this._holding) this._justReleased = true;
        this._holding = false;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this._leftHeld = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this._rightHeld = false;
    };

    this._leftHeld = false;
    this._rightHeld = false;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Cleanup on scene shutdown
    scene.events.on('shutdown', () => {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
    });
  }

  update() {
    const result = {
      holding: this._holding,
      horizontal: 0,
      justPressed: this._justPressed,
      justReleased: this._justReleased,
    };

    if (this._leftHeld) result.horizontal -= 1;
    if (this._rightHeld) result.horizontal += 1;

    // Clear one-shot flags
    this._justPressed = false;
    this._justReleased = false;

    return result;
  }
}
