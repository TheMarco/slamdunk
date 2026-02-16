import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class EnergyBurst extends Entity {
  constructor(x, y) {
    super(x, y, 'burst');
    this.radius = CONFIG.BURST_RADIUS;
    this.speed = CONFIG.FLIGHT_FIRE_SPEED;
    this.damage = CONFIG.BURST_DAMAGE;
    this.lifetime = CONFIG.BURST_LIFETIME_MS;
    this.elapsed = 0;
  }

  update(dt) {
    super.update(dt);
    // Move downward
    this.y += this.speed * dt;
    this.elapsed += dt * 1000;
    if (this.elapsed >= this.lifetime) {
      this.kill();
    }
  }

  getColor() {
    return CONFIG.BURST_COLOR;
  }
}
