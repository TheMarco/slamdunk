import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class ShieldDrone extends Entity {
  constructor(x, y, host) {
    super(x, y, 'shieldDrone');
    this.radius = CONFIG.SHIELD_DRONE_RADIUS;
    this.hp = CONFIG.SHIELD_DRONE_HP;
    this.scoreValue = CONFIG.SHIELD_DRONE_SCORE;
    this.host = host;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = CONFIG.SHIELD_DRONE_ORBIT_RADIUS;
    this.orbitSpeed = CONFIG.SHIELD_DRONE_ORBIT_SPEED;
    this.freeRoaming = false;
    this.erraticTimer = 0;
    this.erraticDirX = (Math.random() - 0.5) * 2;
    this.erraticDirY = (Math.random() - 0.5) * 2;
  }

  update(dt) {
    super.update(dt);

    if (this.host && this.host.alive && !this.freeRoaming) {
      // Orbit the host
      this.orbitAngle += this.orbitSpeed * dt;
      this.x = this.host.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.y = this.host.y + Math.sin(this.orbitAngle) * this.orbitRadius;
    } else {
      // Free-roaming erratic movement
      this.freeRoaming = true;
      this.erraticTimer += dt;
      if (this.erraticTimer > 0.5) {
        this.erraticTimer = 0;
        this.erraticDirX = (Math.random() - 0.5) * 2;
        this.erraticDirY = (Math.random() - 0.5) * 2;
      }
      this.x += this.erraticDirX * CONFIG.SHIELD_DRONE_SPEED * dt;
      this.y += this.erraticDirY * CONFIG.SHIELD_DRONE_SPEED * dt;

      // Kill if off screen
      if (this.x < -50 || this.x > CONFIG.WIDTH + 50 ||
          this.y < -50 || this.y > CONFIG.HEIGHT + 50) {
        this.kill();
      }
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
    return CONFIG.SHIELD_DRONE_COLOR;
  }
}
