import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class LaserGateAnchor extends Entity {
  constructor(x, y) {
    super(x, y, 'laserAnchor');
    this.radius = CONFIG.LASER_ANCHOR_RADIUS;
    this.hp = CONFIG.LASER_ANCHOR_HP;
    this.maxHp = CONFIG.LASER_ANCHOR_HP;
    this.scoreValue = CONFIG.LASER_ANCHOR_SCORE;
    this.vy = CONFIG.LASER_DRIFT_VY;
  }

  update(dt) {
    super.update(dt);
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
      return false;
    }
    return true;
  }

  getColor() {
    return CONFIG.LASER_COLOR;
  }
}

export class LaserGate {
  constructor(x1, y, x2) {
    this.anchor1 = new LaserGateAnchor(x1, y);
    this.anchor2 = new LaserGateAnchor(x2, y);
    this.cycleTimer = 0;
    this.cycleMs = CONFIG.LASER_CYCLE_MS;
    this.beamOnMs = CONFIG.LASER_BEAM_ON_MS;
  }

  update(dt) {
    this.cycleTimer = (this.cycleTimer + dt * 1000) % this.cycleMs;
  }

  isBeamActive() {
    return this.anchor1.alive && this.anchor2.alive && this.cycleTimer < this.beamOnMs;
  }

  get alive() {
    return this.anchor1.alive || this.anchor2.alive;
  }

  getBeamY() {
    return (this.anchor1.y + this.anchor2.y) / 2;
  }

  getBeamX1() {
    return Math.min(this.anchor1.x, this.anchor2.x);
  }

  getBeamX2() {
    return Math.max(this.anchor1.x, this.anchor2.x);
  }
}
