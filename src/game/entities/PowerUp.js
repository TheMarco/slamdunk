import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

const POWERUP_TYPES = ['FLIGHT_RECHARGE', 'SCORE_BOOST', 'SHIELD', 'SLAM_PLUS'];
const POWERUP_COLORS = {
  FLIGHT_RECHARGE: 0x00ffff,   // cyan
  SCORE_BOOST: 0xffdd44,       // gold
  SHIELD: 0x00ff88,            // green
  SLAM_PLUS: 0xff00ff,         // magenta
};

export class PowerUp extends Entity {
  constructor(x, y, type) {
    super(x, y, 'powerUp');
    this.powerType = type || POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    this.radius = CONFIG.POWERUP_RADIUS;
    this.lifetime = CONFIG.POWERUP_LIFETIME_MS;
    this.elapsed = 0;
    this.vy = CONFIG.POWERUP_FALL_VY;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt * 1000;
    this.bobPhase += dt * 3;

    // Slow fall + bob
    this.y += this.vy * dt + Math.sin(this.bobPhase) * 0.3;

    if (this.elapsed >= this.lifetime) {
      this.kill();
    }
    if (this.y > CONFIG.GROUND_Y + 50) {
      this.kill();
    }
  }

  getColor() {
    return POWERUP_COLORS[this.powerType] || 0xffffff;
  }
}

export { POWERUP_TYPES, POWERUP_COLORS };
