import { ObjectPool } from '../utils/objectPool.js';

const MAX_PARTICLES = 200;
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

    // Screen shake state
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;

    // Screen flash state
    this._flashColor = 0;
    this._flashAlpha = 0;
    this._flashGfx = scene.add.graphics().setDepth(200);
  }

  spawnExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const p = this.pool.get();
      p.x = x;
      p.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = color;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = 300 + Math.random() * 300;
      p.radius = 1 + Math.random() * 3;
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

      this.gfx.fillStyle(p.color, p.alpha);
      this.gfx.fillCircle(p.x, p.y, p.radius * p.alpha);
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
}
