import { CONFIG } from '../config.js';

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.health = 100;
    this.flightMeter = 100;       // current flight fuel
    this.xpCollected = 0;          // total XP orbs collected
    this.multiplier = 1.0;
    this.multiplierTimer = 0;
    this.kills = 0;
    this.slamCount = 0;            // total impact slams
    this.maxAltitude = 0;          // highest point reached
    this.elapsed = 0;
    this.gameOver = false;
    this.playerMode = 'impact';    // 'flight' | 'falling' | 'impact'

    // Combo system
    this.comboCount = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;

    // Power-up timers
    this.scoreBoostTimer = 0;

    // Phase tracking
    this.phaseReached = 'WARMUP';
  }

  update(dt) {
    this.elapsed += dt;
    // Decay multiplier
    if (this.multiplierTimer > 0) {
      this.multiplierTimer -= dt * 1000;
    } else if (this.multiplier > 1.0) {
      this.multiplier = Math.max(1.0, this.multiplier - 0.1 * dt);
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt * 1000;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // Score boost timer
    if (this.scoreBoostTimer > 0) {
      this.scoreBoostTimer -= dt * 1000;
    }
  }

  registerKill() {
    this.comboCount++;
    this.comboTimer = CONFIG.COMBO_WINDOW_MS;
    if (this.comboCount > this.bestCombo) {
      this.bestCombo = this.comboCount;
    }
  }

  getComboMultiplier() {
    if (this.comboCount >= 10) return 5;
    if (this.comboCount >= 5) return 3;
    if (this.comboCount >= 3) return 2;
    return 1;
  }

  addScore(base) {
    const comboMult = this.getComboMultiplier();
    const boostMult = this.scoreBoostTimer > 0 ? 2 : 1;
    this.score += Math.floor(base * this.multiplier * comboMult * boostMult);
  }

  bumpMultiplier(amount) {
    this.multiplier = Math.min(this.multiplier + amount, CONFIG.MULTIPLIER_MAX);
    this.multiplierTimer = CONFIG.MULTIPLIER_DECAY_MS;
  }
}
