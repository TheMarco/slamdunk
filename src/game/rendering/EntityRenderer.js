import { CONFIG } from '../config.js';
import { lerp } from '../utils/math.js';

/**
 * EntityRenderer — demonstrates BOTH rendering approaches:
 *
 * 1. Graphics API (programmatic): Player + Bullets + HUD elements
 *    - No asset files needed, drawn with Phaser Graphics
 *    - Great for prototyping, vector aesthetics, procedural effects
 *
 * 2. Sprite-based: Enemies + PowerUps
 *    - Uses loaded spritesheets from public/sprites/
 *    - Full asset pipeline: preload → create sprite → animate
 *    - Fallback to Graphics if sprites not loaded (placeholder mode)
 */
export class EntityRenderer {
  constructor(scene) {
    this.scene = scene;
    this._sprites = new Map();
    this._useFallbackGraphics = !scene.textures.exists('enemy');
  }

  draw(gfx, player, entityManager, dt) {
    // --- GRAPHICS API RENDERING: Player + Bullets ---
    this._drawPlayer(gfx, player);
    for (const bullet of entityManager.bullets) {
      if (bullet.alive) this._drawBullet(gfx, bullet);
    }

    // --- SPRITE-BASED RENDERING: Enemies + PowerUps ---
    if (this._useFallbackGraphics) {
      // Fallback: draw everything with Graphics API (no sprite assets loaded)
      for (const enemy of entityManager.enemies) {
        if (enemy.alive) this._drawEnemyGraphics(gfx, enemy);
      }
      for (const powerup of entityManager.powerups) {
        if (powerup.alive) this._drawPowerUpGraphics(gfx, powerup);
      }
    } else {
      // Sprite-based rendering for enemies/powerups
      this._syncSprites(entityManager);
    }
  }

  // === GRAPHICS API: Player ===
  _drawPlayer(gfx, player) {
    if (!player.alive) return;

    // Invulnerability blink
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0) return;

    const color = player.getColor();

    // Ship body (triangle pointing in aim direction)
    const angle = Math.atan2(player.aimY, player.aimX);
    const r = player.radius;

    const tipX = player.x + Math.cos(angle) * r * 1.5;
    const tipY = player.y + Math.sin(angle) * r * 1.5;
    const leftX = player.x + Math.cos(angle + 2.4) * r;
    const leftY = player.y + Math.sin(angle + 2.4) * r;
    const rightX = player.x + Math.cos(angle - 2.4) * r;
    const rightY = player.y + Math.sin(angle - 2.4) * r;

    gfx.fillStyle(color, 0.8);
    gfx.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);

    // Outline
    gfx.lineStyle(2, color, 1);
    gfx.beginPath();
    gfx.moveTo(tipX, tipY);
    gfx.lineTo(leftX, leftY);
    gfx.lineTo(rightX, rightY);
    gfx.closePath();
    gfx.strokePath();
  }

  // === GRAPHICS API: Bullets ===
  _drawBullet(gfx, bullet) {
    // Lerp between prev and current position for smooth rendering
    const x = lerp(bullet.prevX, bullet.x, 0.5);
    const y = lerp(bullet.prevY, bullet.y, 0.5);

    gfx.fillStyle(bullet.getColor(), 1);
    gfx.fillCircle(x, y, bullet.radius);

    // Glow effect
    gfx.fillStyle(bullet.getColor(), 0.3);
    gfx.fillCircle(x, y, bullet.radius * 2);
  }

  // === GRAPHICS API FALLBACK: Enemies ===
  _drawEnemyGraphics(gfx, enemy) {
    const color = enemy.getColor();

    // Different shapes per enemy type
    switch (enemy.type) {
      case 'enemy':
        gfx.fillStyle(color, 0.7);
        gfx.fillCircle(enemy.x, enemy.y, enemy.radius);
        gfx.lineStyle(2, color, 1);
        gfx.strokeCircle(enemy.x, enemy.y, enemy.radius);
        break;

      case 'fast_enemy': {
        // Diamond shape for fast enemies
        const r = enemy.radius;
        gfx.fillStyle(color, 0.7);
        gfx.fillTriangle(
          enemy.x, enemy.y - r,
          enemy.x - r * 0.7, enemy.y,
          enemy.x, enemy.y + r
        );
        gfx.fillTriangle(
          enemy.x, enemy.y - r,
          enemy.x + r * 0.7, enemy.y,
          enemy.x, enemy.y + r
        );
        gfx.lineStyle(2, color, 1);
        gfx.beginPath();
        gfx.moveTo(enemy.x, enemy.y - r);
        gfx.lineTo(enemy.x + r * 0.7, enemy.y);
        gfx.lineTo(enemy.x, enemy.y + r);
        gfx.lineTo(enemy.x - r * 0.7, enemy.y);
        gfx.closePath();
        gfx.strokePath();
        break;
      }

      case 'tank_enemy': {
        // Square for tanks, with hp indicator
        const r = enemy.radius;
        gfx.fillStyle(color, 0.7);
        gfx.fillRect(enemy.x - r, enemy.y - r, r * 2, r * 2);
        gfx.lineStyle(2, color, 1);
        gfx.strokeRect(enemy.x - r, enemy.y - r, r * 2, r * 2);

        // HP dots
        for (let i = 0; i < enemy.hp; i++) {
          gfx.fillStyle(0xffffff, 0.9);
          gfx.fillCircle(enemy.x - 6 + i * 6, enemy.y, 2);
        }
        break;
      }
    }
  }

  // === GRAPHICS API FALLBACK: PowerUps ===
  _drawPowerUpGraphics(gfx, powerup) {
    const color = powerup.getColor();

    // Pulsing effect based on lifetime
    const pulse = 0.7 + 0.3 * Math.sin(powerup.elapsed / 200);
    const r = powerup.radius * pulse;

    gfx.fillStyle(color, 0.6);
    gfx.fillCircle(powerup.x, powerup.y, r);
    gfx.lineStyle(2, color, 1);
    gfx.strokeCircle(powerup.x, powerup.y, r);

    // Icon
    if (powerup.subtype === 'health') {
      // Plus sign
      gfx.lineStyle(2, 0xffffff, 0.9);
      gfx.beginPath();
      gfx.moveTo(powerup.x - 4, powerup.y);
      gfx.lineTo(powerup.x + 4, powerup.y);
      gfx.moveTo(powerup.x, powerup.y - 4);
      gfx.lineTo(powerup.x, powerup.y + 4);
      gfx.strokePath();
    } else {
      // Star shape
      gfx.lineStyle(2, 0xffffff, 0.9);
      gfx.beginPath();
      gfx.moveTo(powerup.x - 4, powerup.y - 4);
      gfx.lineTo(powerup.x + 4, powerup.y + 4);
      gfx.moveTo(powerup.x + 4, powerup.y - 4);
      gfx.lineTo(powerup.x - 4, powerup.y + 4);
      gfx.strokePath();
    }
  }

  // === SPRITE-BASED: sync Phaser sprites with entity state ===
  _syncSprites(entityManager) {
    // Mark all sprites as stale
    for (const [id, sprite] of this._sprites) {
      sprite._stale = true;
    }

    // Sync enemies
    for (const enemy of entityManager.enemies) {
      if (!enemy.alive) continue;
      this._syncSprite(enemy, enemy.type);
    }

    // Sync powerups
    for (const powerup of entityManager.powerups) {
      if (!powerup.alive) continue;
      this._syncSprite(powerup, 'powerup');
    }

    // Remove stale sprites
    for (const [id, sprite] of this._sprites) {
      if (sprite._stale) {
        sprite.destroy();
        this._sprites.delete(id);
      }
    }
  }

  _syncSprite(entity, textureKey) {
    const id = entity._spriteId || (entity._spriteId = Math.random().toString(36).slice(2));

    let sprite = this._sprites.get(id);
    if (!sprite) {
      sprite = this.scene.add.sprite(entity.x, entity.y, textureKey);
      sprite.setScale(entity.radius / 16);
      this._sprites.set(id, sprite);
    }

    sprite.setPosition(entity.x, entity.y);
    sprite._stale = false;
  }

  destroy() {
    for (const [id, sprite] of this._sprites) {
      sprite.destroy();
    }
    this._sprites.clear();
  }
}
