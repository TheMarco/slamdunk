import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class DataBlocker extends Entity {
  constructor(x, y) {
    super(x, y, 'blocker');
    this.width = CONFIG.BLOCKER_WIDTH;
    this.height = CONFIG.BLOCKER_HEIGHT;
    this.radius = CONFIG.BLOCKER_RADIUS;
    this.hp = CONFIG.BLOCKER_HP;
    this.maxHp = CONFIG.BLOCKER_HP;
    this.scoreValue = CONFIG.BLOCKER_SCORE;
    this.driftDir = Math.random() > 0.5 ? 1 : -1;
    this.driftSpeed = CONFIG.BLOCKER_SPEED;
    this.vy = CONFIG.BLOCKER_DRIFT_VY + (Math.random() - 0.5) * 10; // 15-25 range
  }

  update(dt) {
    super.update(dt);
    // Slow horizontal drift
    this.x += this.driftDir * this.driftSpeed * dt;
    if (this.x <= CONFIG.ARENA_LEFT || this.x >= CONFIG.ARENA_RIGHT) {
      this.driftDir *= -1;
    }
    // Downward drift
    this.y += this.vy * dt;
    if (this.y > CONFIG.GROUND_Y + 50) {
      this.kill();
    }
  }

  hit(damage = 1) {
    this.hp -= damage;
    this.triggerHitFlash();
    if (this.hp <= 0) {
      this.kill();
      return false; // dead
    }
    return true; // survived
  }

  getColor() {
    return CONFIG.BLOCKER_COLOR;
  }
}
