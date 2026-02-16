import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { clamp } from '../utils/math.js';

export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 'player');
    this.radius = CONFIG.PLAYER_RADIUS;
    this.health = CONFIG.PLAYER_MAX_HEALTH;
    this.invulnTimer = 0;

    // State machine
    this.mode = 'impact';  // 'flight' | 'falling' | 'impact'

    // Flight
    this.flightMeter = CONFIG.FLIGHT_METER_MAX;
    this.fireCooldown = 0;

    // Physics
    this.vx = 0;           // horizontal velocity (slide)
    this.vy = 0;           // vertical velocity (fall)
    this.slideVx = 0;      // residual slide from impact

    // Slam tracking
    this.justSlammed = false;
    this.slamX = 0;
    this.slamY = 0;
    this.slamRadius = CONFIG.IMPACT_SLAM_RADIUS;
    this.fallStartY = 0;   // Y when falling began (for kinetic energy calc)

    // Power-up states
    this.shieldActive = false;
    this.slamPlusActive = false;
  }

  update(dt, input, scrollSpeed) {
    super.update(dt);
    this.justSlammed = false;

    if (this.invulnTimer > 0) this.invulnTimer -= dt * 1000;

    // Horizontal movement (always active)
    const hSpeed = CONFIG.PLAYER_HORIZONTAL_SPEED;
    this.x += input.horizontal * hSpeed * dt;
    this.x = clamp(this.x, CONFIG.ARENA_LEFT, CONFIG.ARENA_RIGHT);

    // State machine
    switch (this.mode) {
      case 'flight':
        this._updateFlight(dt, input, scrollSpeed);
        break;
      case 'falling':
        this._updateFalling(dt, input);
        break;
      case 'impact':
        this._updateImpact(dt, input);
        break;
    }

    // Fire cooldown
    if (this.fireCooldown > 0) this.fireCooldown -= dt * 1000;
  }

  _updateFlight(dt, input, scrollSpeed) {
    // Rise upward (relative to scroll)
    this.y -= CONFIG.FLIGHT_RISE_SPEED * dt;

    // Clamp to top of screen (don't fly off)
    this.y = Math.max(40, this.y);

    // Drain flight meter
    this.flightMeter -= CONFIG.FLIGHT_METER_DRAIN * dt;

    // Transition: release or meter depleted
    if (!input.holding || this.flightMeter <= 0) {
      this.mode = 'falling';
      this.vy = 0;
      this.flightMeter = Math.max(0, this.flightMeter);
      this.fallStartY = this.y;
    }
  }

  _updateFalling(dt, input) {
    // Accelerate downward
    this.vy += CONFIG.IMPACT_FALL_ACCEL * dt;
    this.vy = Math.min(this.vy, CONFIG.IMPACT_MAX_FALL_SPEED);
    this.y += this.vy * dt;

    // Can re-enter flight if holding and has meter
    if (input.holding && this.flightMeter > 10) {
      this.mode = 'flight';
      this.vy = 0;
      return;
    }

    // Hit ground
    if (this.y >= CONFIG.GROUND_Y) {
      this.y = CONFIG.GROUND_Y;
      this._slam();
    }
  }

  _updateImpact(dt, input) {
    // Slide with friction
    this.slideVx *= CONFIG.IMPACT_SLIDE_FRICTION;
    this.x += this.slideVx * dt;
    this.x = clamp(this.x, CONFIG.ARENA_LEFT, CONFIG.ARENA_RIGHT);

    // Recharge flight meter
    this.flightMeter = Math.min(
      CONFIG.FLIGHT_METER_MAX,
      this.flightMeter + CONFIG.FLIGHT_METER_RECHARGE * dt
    );

    // Stay on ground
    this.y = CONFIG.GROUND_Y;

    // Transition to flight
    if (input.holding && this.flightMeter > 10) {
      this.mode = 'flight';
      this.vy = 0;
      this.slideVx = 0;
    }
  }

  _slam() {
    this.mode = 'impact';
    this.justSlammed = true;
    this.slamX = this.x;
    this.slamY = this.y;

    // Slam scaling by fall distance (Task 2B.6)
    const fallDist = Math.max(0, CONFIG.GROUND_Y - this.fallStartY);
    const maxFallDist = CONFIG.GROUND_Y - 40; // max possible fall
    const scale = 1 + (fallDist / maxFallDist);
    this.slamRadius = CONFIG.IMPACT_SLAM_RADIUS * scale * (this.slamPlusActive ? 2 : 1);

    // Convert fall speed to slide speed (directional from horizontal input)
    this.slideVx = this.vx || (Math.random() > 0.5 ? 1 : -1) * CONFIG.IMPACT_SLIDE_SPEED;
    this.vy = 0;
  }

  canFire() {
    return this.mode === 'flight' && this.fireCooldown <= 0;
  }

  fire() {
    if (!this.canFire()) return null;
    this.fireCooldown = CONFIG.FLIGHT_FIRE_COOLDOWN_MS;
    return { x: this.x, y: this.y + this.radius };
  }

  hit(damage = 10) {
    if (this.invulnTimer > 0) return false;
    // Shield absorbs the hit
    if (this.shieldActive) {
      this.shieldActive = false;
      this.invulnTimer = 500;
      return false;
    }
    this.health -= damage;
    this.invulnTimer = CONFIG.PLAYER_INVULN_MS;
    return true;
  }

  isIntangible() {
    return this.mode === 'flight';
  }

  isOnGround() {
    return this.mode === 'impact';
  }

  getColor() {
    switch (this.mode) {
      case 'flight': return CONFIG.PLAYER_FLIGHT;
      case 'falling': return CONFIG.PLAYER_FALLING;
      case 'impact': return CONFIG.PLAYER_IMPACT;
    }
  }
}
