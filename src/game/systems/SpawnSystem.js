import { CONFIG } from '../config.js';
import { Enemy } from '../entities/Enemy.js';
import { FastEnemy } from '../entities/FastEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { PowerUp } from '../entities/PowerUp.js';
import { getDifficulty } from '../config/difficulty.js';
import { randomBetween } from '../utils/math.js';

// Spawn weights (relative)
const BASE_WEIGHTS = {
  enemy: 50,
  fast_enemy: 25,
  tank_enemy: 15,
  powerup: 10,
};

// Entity unlock times (seconds elapsed)
const UNLOCK_TIMES = {
  enemy: 0,
  fast_enemy: 15,
  tank_enemy: 30,
  powerup: 10,
};

// Density caps (max concurrent)
const DENSITY_CAPS = {
  enemy: 20,
  fast_enemy: 10,
  tank_enemy: 5,
  powerup: 3,
};

export class SpawnSystem {
  constructor(entityManager, state) {
    this.entityManager = entityManager;
    this.state = state;
    this._spawnTimer = 0;
  }

  update(delta, player) {
    const elapsed = this.state.getElapsedSeconds();
    const diff = getDifficulty(elapsed);

    this._spawnTimer += delta;
    if (this._spawnTimer < diff.spawnInterval) return;
    this._spawnTimer -= diff.spawnInterval;

    // Pick what to spawn
    const unlocked = this._getUnlockedTypes(elapsed);
    const type = this._pickType(unlocked, diff);
    this._spawn(type, player, diff);
  }

  _getUnlockedTypes(elapsed) {
    const types = [];
    for (const [type, time] of Object.entries(UNLOCK_TIMES)) {
      if (elapsed >= time) types.push(type);
    }
    return types;
  }

  _getCount(type) {
    return this.entityManager.enemies.filter(e => e.alive && e.type === type).length +
           this.entityManager.powerups.filter(p => p.alive && p.type === type).length;
  }

  _pickType(unlocked, diff) {
    let total = 0;
    const pool = [];
    for (const type of unlocked) {
      // Density cap
      if (this._getCount(type) >= (DENSITY_CAPS[type] || 999)) continue;
      const w = BASE_WEIGHTS[type] || 10;
      pool.push({ type, weight: w });
      total += w;
    }
    if (pool.length === 0) return 'enemy';

    let roll = Math.random() * total;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }
    return pool[pool.length - 1].type;
  }

  _spawn(type, player, diff) {
    const pos = this._getSpawnPosition();

    switch (type) {
      case 'enemy': {
        const e = new Enemy(pos.x, pos.y);
        e.speed = CONFIG.ENEMY_SPEED * diff.speedMultiplier;
        this.entityManager.addEnemy(e);
        break;
      }
      case 'fast_enemy': {
        const e = new FastEnemy(pos.x, pos.y);
        e.speed = CONFIG.FAST_ENEMY_SPEED * diff.speedMultiplier;
        this.entityManager.addEnemy(e);
        break;
      }
      case 'tank_enemy': {
        const e = new TankEnemy(pos.x, pos.y);
        e.speed = CONFIG.TANK_ENEMY_SPEED * diff.speedMultiplier;
        this.entityManager.addEnemy(e);
        break;
      }
      case 'powerup': {
        const subtype = Math.random() < 0.6 ? 'health' : 'score';
        const p = new PowerUp(pos.x, pos.y, subtype);
        this.entityManager.addPowerUp(p);
        break;
      }
    }
  }

  _getSpawnPosition() {
    const margin = CONFIG.ARENA_MARGIN;
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0: // top
        return { x: randomBetween(margin, CONFIG.WIDTH - margin), y: -margin };
      case 1: // right
        return { x: CONFIG.WIDTH + margin, y: randomBetween(margin, CONFIG.HEIGHT - margin) };
      case 2: // bottom
        return { x: randomBetween(margin, CONFIG.WIDTH - margin), y: CONFIG.HEIGHT + margin };
      case 3: // left
        return { x: -margin, y: randomBetween(margin, CONFIG.HEIGHT - margin) };
    }
    return { x: 0, y: 0 };
  }
}
