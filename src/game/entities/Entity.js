export class Entity {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.type = type;
    this.alive = true;
    this.radius = 10;
    this.hitFlashTimer = 0;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt * 1000;
  }

  triggerHitFlash() {
    this.hitFlashTimer = 120;
  }

  kill() {
    this.alive = false;
  }

  getColor() {
    return 0xffffff;
  }
}
