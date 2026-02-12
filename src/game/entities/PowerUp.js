import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class PowerUp extends Entity {
  constructor(x, y, subtype) {
    super(x, y, 'powerup');
    this.subtype = subtype; // 'health' or 'score'
    this.radius = CONFIG.POWERUP_RADIUS;
    this.lifetime = CONFIG.POWERUP_LIFETIME_MS;
    this.elapsed = 0;
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt * 1000;
    if (this.elapsed >= this.lifetime) {
      this.kill();
    }
  }

  getColor() {
    return this.subtype === 'health'
      ? CONFIG.COLORS.POWERUP_HEALTH
      : CONFIG.COLORS.POWERUP_SCORE;
  }
}
