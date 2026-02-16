import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { distanceSq } from '../utils/math.js';

export class XPOrb extends Entity {
  constructor(x, y) {
    super(x, y, 'xp_orb');
    this.radius = CONFIG.XP_ORB_RADIUS;
    this.value = CONFIG.XP_ORB_VALUE;
    this.lifetime = CONFIG.XP_ORB_LIFETIME_MS;
    this.elapsed = 0;
    this.magnetized = false;
  }

  update(dt, player) {
    super.update(dt);
    this.elapsed += dt * 1000;

    if (this.elapsed >= this.lifetime) {
      this.kill();
      return;
    }

    // Magnetize toward player if player is on ground and in range
    if (player && player.isOnGround()) {
      const dSq = distanceSq(this.x, this.y, player.x, player.y);
      const magnetRadSq = CONFIG.IMPACT_XP_MAGNET_RADIUS * CONFIG.IMPACT_XP_MAGNET_RADIUS;
      if (dSq < magnetRadSq) {
        this.magnetized = true;
        const dist = Math.sqrt(dSq);
        if (dist > 1) {
          const nx = (player.x - this.x) / dist;
          const ny = (player.y - this.y) / dist;
          this.x += nx * CONFIG.XP_ORB_MAGNET_SPEED * dt;
          this.y += ny * CONFIG.XP_ORB_MAGNET_SPEED * dt;
        }
      }
    }
  }

  getColor() {
    return CONFIG.XP_ORB_COLOR;
  }
}
