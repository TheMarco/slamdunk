import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class Enemy extends Entity {
  constructor(x, y) {
    super(x, y, 'enemy');
    this.radius = CONFIG.ENEMY_RADIUS;
    this.speed = CONFIG.ENEMY_SPEED;
    this.hp = 1;
    this.scoreValue = CONFIG.SCORE_PER_KILL;
  }

  update(dt, player) {
    super.update(dt);
    if (!player) return;

    // Move toward player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  hit() {
    this.hp--;
    if (this.hp <= 0) {
      this.kill();
      return false; // did not survive
    }
    return true; // survived
  }

  getColor() {
    return CONFIG.COLORS.ENEMY;
  }
}
