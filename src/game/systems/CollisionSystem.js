import { distanceSq } from '../utils/math.js';
import { CONFIG } from '../config.js';

export class CollisionSystem {
  constructor() {
    // Callbacks
    this.onEnemyKilled = null;       // (enemy, source) => {}
    this.onEnemyHit = null;          // (enemy) => {}
    this.onPlayerHit = null;         // (enemy) => {}
    this.onXPCollected = null;       // (orb) => {}
    this.onSlam = null;              // (x, y, enemiesHit) => {}
    this.onShieldBlock = null;       // (drone, burst) => {}
    this.onPowerUpCollected = null;  // (powerUp) => {}
  }

  update(player, entityManager) {
    if (!player.alive) return;

    // --- Energy Bursts → All Enemies (always active) ---
    const enemies = entityManager.getAllEnemies();
    for (const burst of entityManager.bursts) {
      if (!burst.alive) continue;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const rSum = burst.radius + enemy.radius;
        if (distanceSq(burst.x, burst.y, enemy.x, enemy.y) < rSum * rSum) {
          // Shield mechanic: if enemy is a blocker with alive shield drones, block the burst
          if (enemy.type === 'blocker') {
            const shieldingDrone = entityManager.shieldDrones.find(
              d => d.alive && d.host === enemy && !d.freeRoaming
            );
            if (shieldingDrone) {
              burst.kill();
              if (this.onShieldBlock) this.onShieldBlock(shieldingDrone, burst);
              break;
            }
          }

          burst.kill();
          const survived = enemy.hit(burst.damage);
          if (!survived && this.onEnemyKilled) {
            this.onEnemyKilled(enemy, burst);
          } else if (survived && this.onEnemyHit) {
            this.onEnemyHit(enemy);
          }
          break;
        }
      }
    }

    // --- Slam AOE (on landing) ---
    if (player.justSlammed) {
      let slamHits = 0;
      const slamRadius = player.slamRadius || CONFIG.IMPACT_SLAM_RADIUS;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const rSum = slamRadius + enemy.radius;
        if (distanceSq(player.slamX, player.slamY, enemy.x, enemy.y) < rSum * rSum) {
          const survived = enemy.hit(CONFIG.IMPACT_SLAM_DAMAGE);
          slamHits++;
          if (!survived && this.onEnemyKilled) {
            this.onEnemyKilled(enemy, player);
          }
        }
      }
      if (this.onSlam) {
        this.onSlam(player.slamX, player.slamY, slamHits);
      }
    }

    // --- Laser Beam → Player ---
    if (!player.isIntangible() && player.invulnTimer <= 0) {
      for (const lg of entityManager.laserGates) {
        if (!lg.isBeamActive()) continue;
        const beamY = lg.getBeamY();
        const beamX1 = lg.getBeamX1();
        const beamX2 = lg.getBeamX2();
        // Check if player is within beam zone
        if (player.x >= beamX1 - player.radius && player.x <= beamX2 + player.radius &&
            Math.abs(player.y - beamY) < player.radius + 4) {
          if (this.onPlayerHit) this.onPlayerHit({ type: 'laserBeam', x: player.x, y: beamY, getColor: () => CONFIG.LASER_COLOR });
          break;
        }
      }
    }

    // --- Enemies → Player (only in Impact/Falling mode, not Flight) ---
    if (!player.isIntangible() && player.invulnTimer <= 0) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const rSum = player.radius + enemy.radius;
        if (distanceSq(player.x, player.y, enemy.x, enemy.y) < rSum * rSum) {
          if (this.onPlayerHit) this.onPlayerHit(enemy);
          enemy.kill();
          break;
        }
      }
    }

    // --- Player → XP Orbs (always collectible) ---
    for (const orb of entityManager.xpOrbs) {
      if (!orb.alive) continue;
      const rSum = player.radius + orb.radius;
      if (distanceSq(player.x, player.y, orb.x, orb.y) < rSum * rSum) {
        orb.kill();
        if (this.onXPCollected) this.onXPCollected(orb);
      }
    }

    // --- Player → Power-ups (always collectible) ---
    for (const pu of entityManager.powerUps) {
      if (!pu.alive) continue;
      const rSum = player.radius + pu.radius;
      if (distanceSq(player.x, player.y, pu.x, pu.y) < rSum * rSum) {
        pu.kill();
        if (this.onPowerUpCollected) this.onPowerUpCollected(pu);
      }
    }
  }
}
