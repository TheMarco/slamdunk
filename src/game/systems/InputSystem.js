const MAX_FIRE_QUEUE = 4;

export class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this._held = {};
    this._fireQueue = 0;

    // Track held keys (works with both real keyboard and synthetic mobile events)
    const onDown = (e) => {
      this._held[e.code] = true;
      if (e.code === 'Space') {
        this._fireQueue = Math.min(this._fireQueue + 1, MAX_FIRE_QUEUE);
      }
    };
    const onUp = (e) => {
      this._held[e.code] = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    // Clean up on scene shutdown
    scene.events.on('shutdown', () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      this._held = {};
    });
  }

  update(delta) {
    const left = this._held['ArrowLeft'] || this._held['KeyA'] || false;
    const right = this._held['ArrowRight'] || this._held['KeyD'] || false;
    const up = this._held['ArrowUp'] || this._held['KeyW'] || false;
    const down = this._held['ArrowDown'] || this._held['KeyS'] || false;

    let fire = false;
    if (this._fireQueue > 0 || this._held['Space']) {
      fire = true;
      if (this._fireQueue > 0) this._fireQueue--;
    }

    return { left, right, up, down, fire };
  }
}
