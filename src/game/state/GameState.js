import { CONFIG } from '../config.js';

export class GameState {
  constructor() {
    this.score = 0;
    this.health = CONFIG.PLAYER_MAX_HEALTH;
    this.gameOver = false;
    this.newHighScore = false;
    this.elapsed = 0; // ms
    this.multiplier = 1.0;
    this._lastKillTime = 0;
    this.kills = 0;
  }

  getElapsedSeconds() {
    return this.elapsed / 1000;
  }

  addScore(points) {
    this.score += Math.floor(points * this.multiplier);
  }

  addKill() {
    this.kills++;
    this.addScore(CONFIG.SCORE_PER_KILL);
    this._lastKillTime = this.elapsed;
    this.multiplier = Math.min(
      this.multiplier + CONFIG.MULTIPLIER_INCREMENT,
      CONFIG.MULTIPLIER_MAX
    );
  }

  resetMultiplier() {
    this.multiplier = 1.0;
  }

  updateMultiplier() {
    if (this.elapsed - this._lastKillTime > CONFIG.MULTIPLIER_DECAY_MS) {
      this.multiplier = Math.max(1.0, this.multiplier - 0.01);
    }
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  heal(amount) {
    this.health = Math.min(CONFIG.PLAYER_MAX_HEALTH, this.health + amount);
  }
}
