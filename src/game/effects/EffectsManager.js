import Phaser from 'phaser';
import { ObjectPool } from '../utils/objectPool.js';
import { CONFIG } from '../config.js';

const MAX_PARTICLES = 400;
const PARTICLE_LIFETIME = 500;

function createParticle() {
  return { x: 0, y: 0, vx: 0, vy: 0, color: 0xffffff, alpha: 1, life: 0, maxLife: PARTICLE_LIFETIME, radius: 3 };
}

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.pool = new ObjectPool(createParticle, 50);
    this.gfx = scene.add.graphics().setDepth(50);
    this.rings = [];
    this.lightningBolts = [];
    this.spiralTrails = [];

    // Screen shake state
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;

    // Screen flash state
    this._flashColor = 0;
    this._flashAlpha = 0;
    this._flashGfx = scene.add.graphics().setDepth(200);

    // Additive particle glow layer (Phase 6)
    this._glowParticleGfx = scene.add.graphics().setDepth(55);
    this._glowParticleGfx.setBlendMode(Phaser.BlendModes.ADD);
  }

  _shiftColor(color) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const shift = 30;
    const nr = Math.min(255, Math.max(0, r + (Math.random() - 0.5) * shift * 2));
    const ng = Math.min(255, Math.max(0, g + (Math.random() - 0.5) * shift * 2));
    const nb = Math.min(255, Math.max(0, b + (Math.random() - 0.5) * shift * 2));
    return (Math.floor(nr) << 16) | (Math.floor(ng) << 8) | Math.floor(nb);
  }

  spawnExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const p = this.pool.get();
      p.x = x;
      p.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 180;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      const roll = Math.random();
      if (roll < 0.7) p.color = color;
      else if (roll < 0.9) p.color = 0xffffff;
      else p.color = this._shiftColor(color);
      p.alpha = 1;
      p.life = 0;
      p.maxLife = 300 + Math.random() * 400;
      p.radius = 1 + Math.random() * 4;
      this.particles.push(p);
    }
  }

  spawnRing(x, y, maxRadius, color) {
    this.rings.push({
      x, y,
      radius: 0,
      maxRadius,
      color,
      life: 0,
      maxLife: 400,
    });
  }

  // =============================================
  //  SLAM EFFECT (Phase 6: + procedural lightning)
  // =============================================
  spawnSlamEffect(x, y) {
    this.spawnExplosion(x, y, CONFIG.PLAYER_IMPACT, 20);
    this.spawnRing(x, y, CONFIG.IMPACT_SLAM_RADIUS * 0.8, CONFIG.PLAYER_IMPACT);
    this.spawnRing(x, y, CONFIG.IMPACT_SLAM_RADIUS * 1.2, CONFIG.PLAYER_FALLING);
    this.screenShake(8, 200);
    this.screenFlash(CONFIG.SLAM_FLASH, 0.3);

    // Procedural lightning bolts (Phase 6)
    this._spawnLightning(x, y, 4 + Math.floor(Math.random() * 2));
  }

  _spawnLightning(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
      const length = 40 + Math.random() * 60;
      const segments = [];
      let cx = x;
      let cy = y;
      const segCount = 5 + Math.floor(Math.random() * 4);
      for (let s = 0; s <= segCount; s++) {
        const t = s / segCount;
        const sx = x + Math.cos(angle) * length * t;
        const sy = y + Math.sin(angle) * length * t;
        // Perpendicular jitter
        const perpAngle = angle + Math.PI / 2;
        const jitter = (Math.random() - 0.5) * 16 * (1 - t * 0.5);
        cx = sx + Math.cos(perpAngle) * jitter;
        cy = sy + Math.sin(perpAngle) * jitter;
        segments.push({ x: cx, y: cy });
      }
      this.lightningBolts.push({
        segments,
        life: 0,
        maxLife: 200,
        color: CONFIG.PLAYER_IMPACT,
      });
    }
  }

  // =============================================
  //  GRID SHATTER ENEMY DEATH (Phase 6)
  // =============================================
  spawnEnemyDeathEffect(x, y, color) {
    // Grid fragments flying outward (5x5 grid = 25 particles)
    const gridSize = 5;
    const cellSize = 4;
    const halfGrid = (gridSize * cellSize) / 2;
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        if (this.particles.length >= MAX_PARTICLES) break;
        const p = this.pool.get();
        p.x = x - halfGrid + gx * cellSize;
        p.y = y - halfGrid + gy * cellSize;
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 80 + Math.random() * 150;
        p.vx = (dx / dist) * speed + (Math.random() - 0.5) * 40;
        p.vy = (dy / dist) * speed + (Math.random() - 0.5) * 40;
        const roll = Math.random();
        if (roll < 0.6) p.color = color;
        else if (roll < 0.85) p.color = 0xffffff;
        else p.color = this._shiftColor(color);
        p.alpha = 1;
        p.life = 0;
        p.maxLife = 300 + Math.random() * 300;
        p.radius = cellSize * 0.5;
        this.particles.push(p);
      }
    }
    // Expanding ring
    this.spawnRing(x, y, 30, color);
  }

  // =============================================
  //  XP SPIRAL TRAIL (Phase 6)
  // =============================================
  spawnXPCollectEffect(x, y) {
    // 8 staggered spiral particles
    for (let i = 0; i < 8; i++) {
      this.spiralTrails.push({
        originX: x,
        originY: y,
        angle: (Math.PI * 2 / 8) * i,
        radius: 20 + i * 3,
        life: i * 30, // stagger
        maxLife: 400,
        color: CONFIG.XP_ORB_COLOR,
        shrinkRate: 50,
      });
    }
    // Small sparkle burst too
    this.spawnExplosion(x, y, CONFIG.XP_ORB_COLOR, 4);
  }

  spawnDeflectEffect(x, y) {
    this.spawnExplosion(x, y, CONFIG.SHIELD_DRONE_COLOR || 0x44ddff, 6);
  }

  spawnFlightTrail(x, y) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const p = this.pool.get();
      p.x = x + (Math.random() - 0.5) * 20;
      p.y = y + 10;
      p.vx = (Math.random() - 0.5) * 30;
      p.vy = 30 + Math.random() * 50;
      p.color = CONFIG.PLAYER_FLIGHT;
      p.alpha = 0.7;
      p.life = 0;
      p.maxLife = 400;
      p.radius = 2 + Math.random() * 2;
      this.particles.push(p);
    }
  }

  spawnFlightParticle(x, y) {
    if (this.particles.length >= MAX_PARTICLES) return;
    const count = 1 + (Math.random() > 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const p = this.pool.get();
      p.x = x + (Math.random() - 0.5) * 12;
      p.y = y + 10;
      p.vx = (Math.random() - 0.5) * 15;
      p.vy = 20 + Math.random() * 40;
      p.color = CONFIG.PLAYER_FLIGHT;
      p.alpha = 0.5;
      p.life = 0;
      p.maxLife = 250 + Math.random() * 200;
      p.radius = 1 + Math.random() * 1.5;
      this.particles.push(p);
    }
  }

  spawnSpeedLines(x, y, fallSpeed) {
    const intensity = Math.min(4, Math.floor(fallSpeed / 100));
    for (let i = 0; i < intensity; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const p = this.pool.get();
      p.x = x + (Math.random() - 0.5) * 20;
      p.y = y - 15 - Math.random() * 10;
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = -80 - Math.random() * 120;
      p.color = 0xffffff;
      p.alpha = 0.3 + Math.random() * 0.3;
      p.life = 0;
      p.maxLife = 150 + Math.random() * 100;
      p.radius = 0.5 + Math.random() * 0.5;
      this.particles.push(p);
    }
  }

  screenShake(intensity, duration) {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeElapsed = 0;
  }

  screenFlash(color, alpha) {
    this._flashColor = color;
    this._flashAlpha = alpha;
  }

  update(delta) {
    const dt = delta / 1000;

    // Update particles
    this.gfx.clear();
    this._glowParticleGfx.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        this.pool.release(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha = 1 - (p.life / p.maxLife);

      // Blocky voxel square
      const size = p.radius * p.alpha;
      this.gfx.fillStyle(p.color, p.alpha);
      this.gfx.fillRect(p.x - size, p.y - size, size * 2, size * 2);

      // Additive glow behind each particle (Phase 6)
      this._glowParticleGfx.fillStyle(p.color, p.alpha * 0.15);
      this._glowParticleGfx.fillCircle(p.x, p.y, p.radius * 3);
    }

    // Update rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life += delta;
      if (ring.life >= ring.maxLife) {
        this.rings.splice(i, 1);
        continue;
      }
      const t = ring.life / ring.maxLife;
      const radius = ring.maxRadius * t;
      const alpha = (1 - t) * 0.6;
      const lineWidth = Math.max(1, 3 * (1 - t));
      this.gfx.lineStyle(lineWidth, ring.color, alpha);
      this.gfx.strokeCircle(ring.x, ring.y, radius);

      // Additive ring glow (Phase 6)
      this._glowParticleGfx.lineStyle(lineWidth + 4, ring.color, alpha * 0.2);
      this._glowParticleGfx.strokeCircle(ring.x, ring.y, radius);
    }

    // Update lightning bolts (Phase 6)
    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      const bolt = this.lightningBolts[i];
      bolt.life += delta;
      if (bolt.life >= bolt.maxLife) {
        this.lightningBolts.splice(i, 1);
        continue;
      }
      const t = bolt.life / bolt.maxLife;
      const alpha = (1 - t);
      const segs = bolt.segments;

      // White core
      this.gfx.lineStyle(2, 0xffffff, alpha * 0.9);
      this.gfx.beginPath();
      this.gfx.moveTo(segs[0].x, segs[0].y);
      for (let s = 1; s < segs.length; s++) {
        this.gfx.lineTo(segs[s].x, segs[s].y);
      }
      this.gfx.strokePath();

      // Colored glow
      this.gfx.lineStyle(4, bolt.color, alpha * 0.4);
      this.gfx.beginPath();
      this.gfx.moveTo(segs[0].x, segs[0].y);
      for (let s = 1; s < segs.length; s++) {
        this.gfx.lineTo(segs[s].x, segs[s].y);
      }
      this.gfx.strokePath();

      // Additive glow
      this._glowParticleGfx.lineStyle(8, bolt.color, alpha * 0.15);
      this._glowParticleGfx.beginPath();
      this._glowParticleGfx.moveTo(segs[0].x, segs[0].y);
      for (let s = 1; s < segs.length; s++) {
        this._glowParticleGfx.lineTo(segs[s].x, segs[s].y);
      }
      this._glowParticleGfx.strokePath();
    }

    // Update XP spiral trails (Phase 6)
    for (let i = this.spiralTrails.length - 1; i >= 0; i--) {
      const trail = this.spiralTrails[i];
      trail.life += delta;
      if (trail.life >= trail.maxLife) {
        this.spiralTrails.splice(i, 1);
        continue;
      }
      if (trail.life < 0) continue; // stagger delay
      const t = trail.life / trail.maxLife;
      const alpha = (1 - t) * 0.7;
      trail.angle += dt * 12;
      trail.radius -= trail.shrinkRate * dt;
      if (trail.radius < 2) trail.radius = 2;

      const sx = trail.originX + Math.cos(trail.angle) * trail.radius;
      const sy = trail.originY + Math.sin(trail.angle) * trail.radius;
      this.gfx.fillStyle(trail.color, alpha);
      this.gfx.fillRect(sx - 1.5, sy - 1.5, 3, 3);

      this._glowParticleGfx.fillStyle(trail.color, alpha * 0.3);
      this._glowParticleGfx.fillCircle(sx, sy, 6);
    }

    // Screen shake
    if (this._shakeElapsed < this._shakeDuration) {
      this._shakeElapsed += delta;
      const t = 1 - (this._shakeElapsed / this._shakeDuration);
      const ox = (Math.random() - 0.5) * this._shakeIntensity * t * 2;
      const oy = (Math.random() - 0.5) * this._shakeIntensity * t * 2;
      this.scene.cameras.main.setScroll(ox, oy);
    } else {
      this.scene.cameras.main.setScroll(0, 0);
    }

    // Screen flash
    this._flashGfx.clear();
    if (this._flashAlpha > 0) {
      this._flashGfx.fillStyle(this._flashColor, this._flashAlpha);
      this._flashGfx.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
      this._flashAlpha -= dt * 2;
      if (this._flashAlpha < 0) this._flashAlpha = 0;
    }
  }

  drawParticles(gfx) {
    for (const p of this.particles) {
      if (p.life >= p.maxLife) continue;
      const alpha = 1 - (p.life / p.maxLife);
      gfx.fillStyle(p.color, alpha);
      gfx.fillRect(p.x - p.radius * alpha, p.y - p.radius * alpha, p.radius * 2 * alpha, p.radius * 2 * alpha);
    }
  }
}
