import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { normalize } from '../utils/math.js';

export class ChaserBot extends Entity {
  constructor(x, y) {
    super(x, y, 'chaser');
    this.radius = CONFIG.CHASER_RADIUS;
    this.speed = CONFIG.CHASER_SPEED;
    this.hp = CONFIG.CHASER_HP;
    this.scoreValue = CONFIG.CHASER_SCORE;
    // Always on ground
    this.y = CONFIG.GROUND_Y;
  }

  update(dt, player) {
    super.update(dt);
    // Chase player horizontally (ground only)
    if (player && player.isOnGround()) {
      const dir = player.x > this.x ? 1 : -1;
      this.x += dir * this.speed * dt;
    }
    // Stay on ground
    this.y = CONFIG.GROUND_Y;
  }

  hit(damage = 1) {
    this.hp -= damage;
    this.triggerHitFlash();
    if (this.hp <= 0) {
      this.kill();
      return false;
    }
    return true;
  }

  getColor() {
    return CONFIG.CHASER_COLOR;
  }
}
