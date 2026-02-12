import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class Bullet extends Entity {
  constructor(x, y, dirX, dirY) {
    super(x, y, 'bullet');
    this.radius = CONFIG.BULLET_RADIUS;
    this.dirX = dirX;
    this.dirY = dirY;
  }

  update(dt) {
    super.update(dt);
    this.x += this.dirX * CONFIG.BULLET_SPEED * dt;
    this.y += this.dirY * CONFIG.BULLET_SPEED * dt;

    // Kill if off screen
    if (this.x < -20 || this.x > CONFIG.WIDTH + 20 ||
        this.y < -20 || this.y > CONFIG.HEIGHT + 20) {
      this.kill();
    }
  }

  getColor() {
    return CONFIG.COLORS.BULLET;
  }
}
