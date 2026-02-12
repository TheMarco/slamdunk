import { distanceSq } from '../utils/math.js';

export class CollisionSystem {
  constructor() {
    this.onEnemyKilled = null;   // (enemy, bullet) => void
    this.onEnemyHit = null;      // (enemy) => void — non-lethal hit
    this.onPlayerHit = null;     // (enemy) => void
    this.onPowerUpCollected = null; // (powerup) => void
  }

  update(player, entityManager) {
    if (!player.alive) return;

    // Bullets → Enemies
    for (const bullet of entityManager.bullets) {
      if (!bullet.alive) continue;
      for (const enemy of entityManager.enemies) {
        if (!enemy.alive) continue;
        const hitDist = bullet.radius + enemy.radius;
        if (distanceSq(bullet.x, bullet.y, enemy.x, enemy.y) < hitDist * hitDist) {
          bullet.kill();
          const survived = enemy.hit();
          if (survived) {
            if (this.onEnemyHit) this.onEnemyHit(enemy);
          } else {
            if (this.onEnemyKilled) this.onEnemyKilled(enemy, bullet);
          }
          break;
        }
      }
    }

    // Enemies → Player (body collision)
    if (player.invulnTimer <= 0) {
      for (const enemy of entityManager.enemies) {
        if (!enemy.alive) continue;
        const hitDist = player.radius + enemy.radius;
        if (distanceSq(player.x, player.y, enemy.x, enemy.y) < hitDist * hitDist) {
          enemy.kill();
          player.invulnTimer = 1500; // invulnerability frames
          if (this.onPlayerHit) this.onPlayerHit(enemy);
          break;
        }
      }
    }

    // Player → PowerUps
    for (const powerup of entityManager.powerups) {
      if (!powerup.alive) continue;
      const hitDist = player.radius + powerup.radius;
      if (distanceSq(player.x, player.y, powerup.x, powerup.y) < hitDist * hitDist) {
        powerup.kill();
        if (this.onPowerUpCollected) this.onPowerUpCollected(powerup);
      }
    }
  }
}
