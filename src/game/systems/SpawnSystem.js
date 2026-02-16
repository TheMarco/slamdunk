import { CONFIG } from '../config.js';
import { DataBlocker } from '../entities/DataBlocker.js';
import { ChaserBot } from '../entities/ChaserBot.js';
import { GravityFlare } from '../entities/GravityFlare.js';
import { ShieldDrone } from '../entities/ShieldDrone.js';
import { LaserGate } from '../entities/LaserGate.js';
import { getDifficulty } from '../config/difficulty.js';
import { randomBetween, randomInt } from '../utils/math.js';

export class SpawnSystem {
  constructor(entityManager, gameState) {
    this.em = entityManager;
    this.state = gameState;
    this._spawnTimer = 0;
  }

  update(dt, cameraTop) {
    const diff = getDifficulty(this.state.elapsed);
    this._spawnTimer += dt * 1000;

    if (this._spawnTimer < diff.spawnInterval) return;
    this._spawnTimer = 0;

    const counts = this.em.getCounts();
    const unlocked = this._getUnlocked(this.state.elapsed);
    const type = this._pickType(unlocked, counts);

    if (!type) return;

    const spawnX = randomBetween(CONFIG.ARENA_LEFT + 20, CONFIG.ARENA_RIGHT - 20);

    switch (type) {
      case 'blocker': {
        // Spawn in flight zone (visible area above ground)
        const bY = randomBetween(80, CONFIG.GROUND_Y - 100);
        const blocker = new DataBlocker(spawnX, bY);
        this.em.addBlocker(blocker);

        // Co-spawn shield drones after 60s
        if (this.state.elapsed >= 60 && counts.shieldDrones < 6) {
          const droneCount = 1 + (Math.random() > 0.5 ? 1 : 0);
          for (let i = 0; i < droneCount; i++) {
            if (counts.shieldDrones + i < 6) {
              const drone = new ShieldDrone(blocker.x, blocker.y, blocker);
              drone.orbitAngle = (Math.PI * 2 / droneCount) * i;
              this.em.addShieldDrone(drone);
            }
          }
        }
        break;
      }
      case 'chaser': {
        // Chasers spawn at ground level, from screen edges
        const edge = Math.random() > 0.5 ? CONFIG.ARENA_LEFT - 20 : CONFIG.ARENA_RIGHT + 20;
        this.em.addChaser(new ChaserBot(edge, CONFIG.GROUND_Y));
        break;
      }
      case 'flare': {
        // Spawn in flight zone
        const fY = randomBetween(100, CONFIG.GROUND_Y - 80);
        this.em.addFlare(new GravityFlare(spawnX, fY));
        break;
      }
      case 'laserGate': {
        const lgY = randomBetween(120, 380);
        const x1 = randomBetween(CONFIG.ARENA_LEFT + 30, CONFIG.CENTER_X - 30);
        const separation = randomBetween(120, 280);
        const x2 = Math.min(x1 + separation, CONFIG.ARENA_RIGHT - 30);
        this.em.addLaserGate(new LaserGate(x1, lgY, x2));
        break;
      }
    }
  }

  _getUnlocked(elapsed) {
    const types = ['blocker'];
    if (elapsed >= 15) types.push('chaser');
    if (elapsed >= 30) types.push('flare');
    if (elapsed >= 45) types.push('laserGate');
    return types;
  }

  _pickType(unlocked, counts) {
    const WEIGHTS = { blocker: 50, chaser: 30, flare: 20, laserGate: 15 };
    const CAPS = { blocker: 8, chaser: 6, flare: 4, laserGate: 3 };
    const COUNT_KEYS = { blocker: 'blockers', chaser: 'chasers', flare: 'flares', laserGate: 'laserGates' };

    // Filter by density cap
    const available = unlocked.filter(t => (counts[COUNT_KEYS[t]] || 0) < CAPS[t]);
    if (available.length === 0) return null;

    // Weighted random
    let total = 0;
    for (const t of available) total += WEIGHTS[t];
    let roll = Math.random() * total;
    for (const t of available) {
      roll -= WEIGHTS[t];
      if (roll <= 0) return t;
    }
    return available[available.length - 1];
  }
}
