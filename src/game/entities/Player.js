import { Entity } from './Entity.js';
import { Bullet } from './Bullet.js';
import { CONFIG } from '../config.js';
import { clamp } from '../utils/math.js';

export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 'player');
    this.radius = CONFIG.PLAYER_RADIUS;
    this.health = CONFIG.PLAYER_MAX_HEALTH;
    this.fireCooldown = 0;
    this.invulnTimer = 0;

    // Last aim direction (default: up)
    this.aimX = 0;
    this.aimY = -1;
  }

  update(dt, input) {
    super.update(dt);

    // Movement
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    this.x += dx * CONFIG.PLAYER_SPEED * dt;
    this.y += dy * CONFIG.PLAYER_SPEED * dt;

    // Clamp to arena bounds
    this.x = clamp(this.x, this.radius, CONFIG.WIDTH - this.radius);
    this.y = clamp(this.y, this.radius, CONFIG.HEIGHT - this.radius);

    // Update aim direction based on movement
    if (dx !== 0 || dy !== 0) {
      this.aimX = dx;
      this.aimY = dy;
    }

    // Cooldowns
    if (this.fireCooldown > 0) this.fireCooldown -= dt * 1000;
    if (this.invulnTimer > 0) this.invulnTimer -= dt * 1000;
  }

  canFire() {
    return this.fireCooldown <= 0;
  }

  fire(input) {
    if (!this.canFire()) return null;
    this.fireCooldown = CONFIG.FIRE_COOLDOWN_MS;

    // Determine fire direction from aim
    let dirX = this.aimX;
    let dirY = this.aimY;

    // Normalize
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 0) {
      dirX /= len;
      dirY /= len;
    } else {
      dirY = -1; // default: shoot up
    }

    return new Bullet(
      this.x + dirX * (this.radius + CONFIG.BULLET_RADIUS + 2),
      this.y + dirY * (this.radius + CONFIG.BULLET_RADIUS + 2),
      dirX,
      dirY
    );
  }

  getColor() {
    return CONFIG.COLORS.PLAYER;
  }
}
