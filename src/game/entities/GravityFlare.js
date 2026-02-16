import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { distanceSq } from '../utils/math.js';

export class GravityFlare extends Entity {
  constructor(x, y) {
    super(x, y, 'flare');
    this.radius = CONFIG.FLARE_RADIUS;
    this.pullRadius = CONFIG.FLARE_PULL_RADIUS;
    this.pullStrength = CONFIG.FLARE_PULL_STRENGTH;
    this.hp = CONFIG.FLARE_HP;
    this.scoreValue = CONFIG.FLARE_SCORE;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.vy = CONFIG.FLARE_DRIFT_VY + (Math.random() - 0.5) * 8; // 10-18 range
  }

  update(dt) {
    super.update(dt);
    this.pulsePhase += dt * 3;
    // Downward drift
    this.y += this.vy * dt;
    if (this.y > CONFIG.GROUND_Y + 50) {
      this.kill();
    }
  }

  applyGravityTo(player, dt) {
    const dSq = distanceSq(this.x, this.y, player.x, player.y);
    const pullRadSq = this.pullRadius * this.pullRadius;
    if (dSq < pullRadSq && dSq > 0) {
      // Pull strength scales inversely with distance
      const factor = 1 - Math.sqrt(dSq) / this.pullRadius;
      player.y += this.pullStrength * factor * dt;
    }
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
    return CONFIG.FLARE_COLOR;
  }
}
