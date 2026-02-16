import { CONFIG } from '../config.js';
import { lerp } from '../utils/math.js';

const GRID_HORIZON_Y = 60;
const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

export class EntityRenderer {
  constructor(scene) {
    this.scene = scene;
    this.gridOffset = 0;
    this._time = 0;
    this._initStarfield();
    this._initNebulae();
    this._initShootingStars();
    this._playerTrail = [];
    this._trailTimer = 0;
  }

  // =============================================
  //  UTILITY HELPERS
  // =============================================

  /** Draw a regular polygon (N sides) centered at (x,y) with given radius and rotation */
  _drawPolygon(gfx, x, y, sides, radius, rotation) {
    gfx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (TWO_PI / sides) * i + rotation;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
  }

  /** Fill + stroke a regular polygon */
  _fillStrokePolygon(gfx, x, y, sides, radius, rotation, fillColor, fillAlpha, strokeColor, strokeAlpha, strokeWidth) {
    if (fillColor !== undefined) {
      gfx.fillStyle(fillColor, fillAlpha);
      this._drawPolygon(gfx, x, y, sides, radius, rotation);
      gfx.fillPath();
    }
    if (strokeColor !== undefined) {
      gfx.lineStyle(strokeWidth || 1, strokeColor, strokeAlpha);
      this._drawPolygon(gfx, x, y, sides, radius, rotation);
      gfx.strokePath();
    }
  }

  /** Draw a diamond (4-point) centered at (x,y) */
  _drawDiamond(gfx, x, y, rx, ry, rotation) {
    const rot = rotation || 0;
    gfx.beginPath();
    gfx.moveTo(x + Math.cos(rot - HALF_PI) * ry, y + Math.sin(rot - HALF_PI) * ry);
    gfx.lineTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
    gfx.lineTo(x + Math.cos(rot + HALF_PI) * ry, y + Math.sin(rot + HALF_PI) * ry);
    gfx.lineTo(x + Math.cos(rot + Math.PI) * rx, y + Math.sin(rot + Math.PI) * rx);
    gfx.closePath();
  }

  /** Draw dashed circle segments */
  _drawDashedCircle(gfx, x, y, radius, segments, gapRatio, rotation) {
    const segAngle = TWO_PI / segments;
    const drawAngle = segAngle * (1 - gapRatio);
    for (let i = 0; i < segments; i++) {
      const startAngle = segAngle * i + rotation;
      gfx.beginPath();
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const a = startAngle + (drawAngle * s / steps);
        const px = x + Math.cos(a) * radius;
        const py = y + Math.sin(a) * radius;
        if (s === 0) gfx.moveTo(px, py);
        else gfx.lineTo(px, py);
      }
      gfx.strokePath();
    }
  }

  /** Draw a chevron/arrow shape */
  _drawChevron(gfx, x, y, wingSpan, height, taperBack, rotation) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    // Points: nose, left wing, left notch, right notch, right wing
    const points = [
      { lx: 0, ly: -height / 2 },                           // nose
      { lx: -wingSpan / 2, ly: height / 2 },                 // left wing tip
      { lx: -wingSpan * 0.15, ly: height / 2 - taperBack },  // left notch
      { lx: wingSpan * 0.15, ly: height / 2 - taperBack },   // right notch
      { lx: wingSpan / 2, ly: height / 2 },                  // right wing tip
    ];
    gfx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const px = x + points[i].lx * cos - points[i].ly * sin;
      const py = y + points[i].lx * sin + points[i].ly * cos;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
  }

  // =============================================
  //  STARFIELD
  // =============================================
  _initStarfield() {
    this.starLayers = [];
    const layerConfigs = [
      { count: 60, speed: 8, sizeMin: 0.5, sizeMax: 1.0, alpha: 0.3 },
      { count: 40, speed: 20, sizeMin: 1.0, sizeMax: 1.8, alpha: 0.5 },
      { count: 20, speed: 40, sizeMin: 1.5, sizeMax: 2.5, alpha: 0.7 },
    ];
    for (const cfg of layerConfigs) {
      const stars = [];
      for (let i = 0; i < cfg.count; i++) {
        stars.push({
          x: Math.random() * CONFIG.WIDTH,
          y: Math.random() * CONFIG.HEIGHT,
          size: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 1.5 + Math.random() * 2,
        });
      }
      this.starLayers.push({ stars, ...cfg });
    }
  }

  _drawStarfield(gfx, dt) {
    for (const layer of this.starLayers) {
      for (const star of layer.stars) {
        star.y += layer.speed * dt;
        if (star.y > CONFIG.HEIGHT) {
          star.y -= CONFIG.HEIGHT;
          star.x = Math.random() * CONFIG.WIDTH;
        }
        star.twinklePhase += star.twinkleSpeed * dt;
        const twinkle = 0.5 + Math.sin(star.twinklePhase) * 0.5;
        const a = layer.alpha * twinkle;
        gfx.fillStyle(0xffffff, a);
        gfx.fillRect(star.x - star.size * 0.5, star.y - star.size * 0.5, star.size, star.size);
      }
    }
  }

  // =============================================
  //  NEBULA CLOUDS
  // =============================================
  _initNebulae() {
    this._nebulae = [];
    const colors = [0x4400aa, 0x220066, 0x660044, 0x002266, 0x003344];
    for (let i = 0; i < 5; i++) {
      this._nebulae.push({
        x: Math.random() * CONFIG.WIDTH,
        y: 80 + Math.random() * 300,
        rx: 60 + Math.random() * 100,
        ry: 30 + Math.random() * 60,
        color: colors[i],
        alpha: 0.04 + Math.random() * 0.03,
        vx: (Math.random() - 0.5) * 6,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  _drawNebulae(gfx, dt) {
    for (const n of this._nebulae) {
      n.x += n.vx * dt;
      n.phase += dt * 0.3;
      if (n.x < -n.rx) n.x = CONFIG.WIDTH + n.rx;
      if (n.x > CONFIG.WIDTH + n.rx) n.x = -n.rx;
      const pulse = 1 + Math.sin(n.phase) * 0.15;
      gfx.fillStyle(n.color, n.alpha * pulse);
      gfx.fillEllipse(n.x, n.y, n.rx * 2 * pulse, n.ry * 2 * pulse);
    }
  }

  // =============================================
  //  SHOOTING STARS
  // =============================================
  _initShootingStars() {
    this._shootingStars = [];
    this._shootingStarTimer = 3 + Math.random() * 5;
  }

  _updateShootingStars(dt) {
    this._shootingStarTimer -= dt;
    if (this._shootingStarTimer <= 0) {
      this._shootingStarTimer = 3 + Math.random() * 5;
      this._shootingStars.push({
        x: Math.random() * CONFIG.WIDTH,
        y: 20 + Math.random() * 200,
        vx: 300 + Math.random() * 400,
        vy: 100 + Math.random() * 150,
        life: 0,
        maxLife: 300 + Math.random() * 400,
        length: 20 + Math.random() * 40,
      });
    }
    for (let i = this._shootingStars.length - 1; i >= 0; i--) {
      const s = this._shootingStars[i];
      s.life += dt * 1000;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life >= s.maxLife || s.x > CONFIG.WIDTH + 50 || s.y > CONFIG.HEIGHT) {
        this._shootingStars.splice(i, 1);
      }
    }
  }

  _drawShootingStars(gfx) {
    for (const s of this._shootingStars) {
      const t = s.life / s.maxLife;
      const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      const dir = Math.atan2(s.vy, s.vx);
      const tailX = s.x - Math.cos(dir) * s.length;
      const tailY = s.y - Math.sin(dir) * s.length;
      gfx.lineStyle(2, 0xffffff, alpha * 0.9);
      gfx.beginPath();
      gfx.moveTo(s.x, s.y);
      gfx.lineTo(tailX, tailY);
      gfx.strokePath();
      const farTailX = s.x - Math.cos(dir) * s.length * 2;
      const farTailY = s.y - Math.sin(dir) * s.length * 2;
      gfx.lineStyle(1, 0x8888ff, alpha * 0.3);
      gfx.beginPath();
      gfx.moveTo(tailX, tailY);
      gfx.lineTo(farTailX, farTailY);
      gfx.strokePath();
    }
  }

  // =============================================
  //  PERSPECTIVE GRID
  // =============================================
  _drawGrid(gfx, dt, gameState) {
    this.gridOffset = (this.gridOffset + dt * 60) % 40;
    const w = CONFIG.WIDTH;
    const h = CONFIG.HEIGHT;
    const cx = CONFIG.CENTER_X;
    const horizonY = GRID_HORIZON_Y;

    let gridColor = CONFIG.GRID_COLOR;
    let gridHighlight = CONFIG.GRID_HIGHLIGHT;
    if (gameState) {
      const t = gameState.elapsed || 0;
      if (t > 120) {
        gridColor = 0x501020;
        gridHighlight = 0xa03060;
      } else if (t > 60) {
        gridColor = 0x3a1050;
        gridHighlight = 0x7030a0;
      }
    }

    gfx.lineStyle(2, gridHighlight, 0.4);
    gfx.beginPath();
    gfx.moveTo(0, horizonY);
    gfx.lineTo(w, horizonY);
    gfx.strokePath();

    const vertCount = 16;
    gfx.lineStyle(1, gridColor, 0.25);
    for (let i = 0; i <= vertCount; i++) {
      const bottomX = (i / vertCount) * w;
      const topX = cx + (bottomX - cx) * 0.15;
      gfx.beginPath();
      gfx.moveTo(topX, horizonY);
      gfx.lineTo(bottomX, h);
      gfx.strokePath();
    }

    const lineCount = 14;
    gfx.lineStyle(1, gridColor, 0.2);
    for (let i = 1; i <= lineCount; i++) {
      const t = i / lineCount;
      const y = horizonY + (h - horizonY) * (t * t) + this.gridOffset * t;
      if (y < horizonY || y > h) continue;
      const alpha = 0.1 + t * 0.2;
      gfx.lineStyle(1, gridColor, alpha);
      gfx.beginPath();
      gfx.moveTo(0, y);
      gfx.lineTo(w, y);
      gfx.strokePath();
    }

    gfx.lineStyle(1, gridHighlight, 0.3);
    gfx.beginPath();
    gfx.moveTo(cx, horizonY);
    gfx.lineTo(cx, h);
    gfx.strokePath();
  }

  // =============================================
  //  GROUND + HEAT SHIMMER
  // =============================================
  _drawGround(gfx) {
    const gy = CONFIG.GROUND_Y + CONFIG.PLAYER_RADIUS;
    const w = CONFIG.WIDTH;
    const groundH = CONFIG.HEIGHT - gy;

    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const stepY = gy + groundH * t;
      const stepH = groundH / 8;
      const alpha = 0.25 - t * 0.025;
      gfx.fillStyle(CONFIG.GRID_COLOR, alpha);
      gfx.fillRect(0, stepY, w, stepH);
    }

    gfx.lineStyle(1, CONFIG.PLAYER_IMPACT, 0.06);
    for (let y = gy + 4; y < CONFIG.HEIGHT; y += 4) {
      gfx.beginPath();
      gfx.moveTo(0, y);
      gfx.lineTo(w, y);
      gfx.strokePath();
    }

    for (let i = 0; i < 3; i++) {
      const baseY = gy - 8 - i * 6;
      const shimmerAlpha = 0.03 - i * 0.008;
      gfx.lineStyle(1, CONFIG.PLAYER_IMPACT, Math.max(0.01, shimmerAlpha));
      gfx.beginPath();
      for (let sx = 0; sx < w; sx += 4) {
        const wave = Math.sin((sx * 0.02) + this._time * 3 + i * 2) * (2 + i);
        if (sx === 0) gfx.moveTo(sx, baseY + wave);
        else gfx.lineTo(sx, baseY + wave);
      }
      gfx.strokePath();
    }

    gfx.lineStyle(6, CONFIG.PLAYER_IMPACT, 0.15);
    gfx.beginPath();
    gfx.moveTo(0, gy);
    gfx.lineTo(w, gy);
    gfx.strokePath();

    gfx.lineStyle(2, CONFIG.PLAYER_IMPACT, 0.8);
    gfx.beginPath();
    gfx.moveTo(0, gy);
    gfx.lineTo(w, gy);
    gfx.strokePath();
  }

  // =============================================
  //  PLAYER TRAIL (chevron ghosts)
  // =============================================
  _updatePlayerTrail(player, dt) {
    if (player.mode === 'falling') {
      this._trailTimer += dt;
      if (this._trailTimer > 0.03) {
        this._playerTrail.push({
          x: player.x, y: player.y,
          alpha: 0.5,
          color: player.getColor(),
          size: CONFIG.PLAYER_WIDTH / 2,
          mode: player.mode,
        });
        if (this._playerTrail.length > 6) this._playerTrail.shift();
        this._trailTimer = 0;
      }
    } else {
      if (this._playerTrail.length > 0) {
        for (const ghost of this._playerTrail) ghost.alpha -= dt * 3;
        this._playerTrail = this._playerTrail.filter(g => g.alpha > 0.02);
      }
      this._trailTimer = 0;
    }
    for (const ghost of this._playerTrail) ghost.alpha -= dt * 1.2;
    this._playerTrail = this._playerTrail.filter(g => g.alpha > 0.02);
  }

  _drawPlayerTrail(gfx) {
    for (const ghost of this._playerTrail) {
      const s = ghost.size;
      // Simplified falling chevron ghost
      gfx.fillStyle(ghost.color, ghost.alpha * 0.3);
      this._drawChevron(gfx, ghost.x, ghost.y, s * 1.6, s * 2.2, s * 0.6, 0);
      gfx.fillPath();
      gfx.lineStyle(1, ghost.color, ghost.alpha * 0.25);
      this._drawChevron(gfx, ghost.x, ghost.y, s * 1.6, s * 2.2, s * 0.6, 0);
      gfx.strokePath();
    }
  }

  // =============================================
  //  GLOW LAYER (entity-shaped)
  // =============================================
  drawGlowLayer(glowGfx, player, entityManager) {
    glowGfx.clear();

    const drawCircularGlow = (x, y, color, baseRadius) => {
      glowGfx.fillStyle(color, 0.03);
      glowGfx.fillCircle(x, y, baseRadius * 4);
      glowGfx.fillStyle(color, 0.06);
      glowGfx.fillCircle(x, y, baseRadius * 3);
      glowGfx.fillStyle(color, 0.10);
      glowGfx.fillCircle(x, y, baseRadius * 2);
      glowGfx.fillStyle(color, 0.15);
      glowGfx.fillCircle(x, y, baseRadius * 1.2);
    };

    // Player — elliptical glow elongated in travel direction
    if (player.alive && !(player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0)) {
      const color = player.getColor();
      const r = CONFIG.PLAYER_RADIUS * 1.5;
      if (player.mode === 'falling') {
        // Vertically stretched during fall
        for (let layer = 3; layer >= 0; layer--) {
          const scale = 4 - layer;
          const a = 0.03 + layer * 0.04;
          glowGfx.fillStyle(color, a);
          glowGfx.fillEllipse(player.x, player.y, r * scale * 1.4, r * scale * 2.2);
        }
      } else if (player.mode === 'flight') {
        // Upward stretched during flight
        for (let layer = 3; layer >= 0; layer--) {
          const scale = 4 - layer;
          const a = 0.03 + layer * 0.04;
          glowGfx.fillStyle(color, a);
          glowGfx.fillEllipse(player.x, player.y - r * 0.3, r * scale * 1.6, r * scale * 2.0);
        }
      } else {
        // Wide on ground
        for (let layer = 3; layer >= 0; layer--) {
          const scale = 4 - layer;
          const a = 0.03 + layer * 0.04;
          glowGfx.fillStyle(color, a);
          glowGfx.fillEllipse(player.x, player.y, r * scale * 2.0, r * scale * 1.2);
        }
      }
    }

    // Bursts — vertically stretched motion-streak glow
    entityManager.bursts.forEach(b => {
      if (!b.alive) return;
      glowGfx.fillStyle(CONFIG.BURST_COLOR, 0.06);
      glowGfx.fillEllipse(b.x, b.y, b.radius * 4, b.radius * 8);
      glowGfx.fillStyle(CONFIG.BURST_COLOR, 0.12);
      glowGfx.fillEllipse(b.x, b.y, b.radius * 2, b.radius * 5);
    });

    // Blockers — wide rectangular glow
    entityManager.blockers.forEach(b => {
      if (!b.alive) return;
      const hw = b.width / 2;
      const hh = b.height / 2;
      glowGfx.fillStyle(CONFIG.BLOCKER_COLOR, 0.04);
      glowGfx.fillRect(b.x - hw - 12, b.y - hh - 12, b.width + 24, b.height + 24);
      glowGfx.fillStyle(CONFIG.BLOCKER_COLOR, 0.08);
      glowGfx.fillRect(b.x - hw - 6, b.y - hh - 6, b.width + 12, b.height + 12);
    });

    // Flares — large circular glow + faint ring at pull radius edge
    entityManager.flares.forEach(f => {
      if (!f.alive) return;
      drawCircularGlow(f.x, f.y, CONFIG.FLARE_COLOR, f.radius * 1.5);
      glowGfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.04);
      glowGfx.strokeCircle(f.x, f.y, f.pullRadius);
    });

    // Chasers
    entityManager.chasers.forEach(c => {
      if (c.alive) drawCircularGlow(c.x, c.y, CONFIG.CHASER_COLOR, c.radius);
    });

    // XP Orbs — tighter glow
    entityManager.xpOrbs.forEach(o => {
      if (!o.alive) return;
      glowGfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.06);
      glowGfx.fillCircle(o.x, o.y, o.radius * 3);
      glowGfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.12);
      glowGfx.fillCircle(o.x, o.y, o.radius * 1.8);
    });

    // Shield drones
    if (entityManager.shieldDrones) {
      entityManager.shieldDrones.forEach(d => {
        if (d.alive) drawCircularGlow(d.x, d.y, CONFIG.SHIELD_DRONE_COLOR, d.radius);
      });
    }

    // Power-ups
    if (entityManager.powerUps) {
      entityManager.powerUps.forEach(p => {
        if (p.alive) drawCircularGlow(p.x, p.y, p.getColor(), p.radius * 1.5);
      });
    }

    // Laser gates
    if (entityManager.laserGates) {
      entityManager.laserGates.forEach(lg => {
        const a1 = lg.anchor1;
        const a2 = lg.anchor2;
        if (a1.alive) drawCircularGlow(a1.x, a1.y, CONFIG.LASER_COLOR, a1.radius);
        if (a2.alive) drawCircularGlow(a2.x, a2.y, CONFIG.LASER_COLOR, a2.radius);
        if (a1.alive && a2.alive && lg.isBeamActive()) {
          const steps = 5;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const bx = a1.x + (a2.x - a1.x) * t;
            const by = a1.y + (a2.y - a1.y) * t;
            glowGfx.fillStyle(CONFIG.LASER_BEAM_COLOR, 0.04);
            glowGfx.fillCircle(bx, by, 20);
          }
        }
      });
    }
  }

  // =============================================
  //  MAIN DRAW
  // =============================================
  draw(gfx, player, entityManager, dt, gameState) {
    gfx.clear();
    this._time += dt;
    this._updatePlayerTrail(player, dt);
    this._updateShootingStars(dt);

    this._drawStarfield(gfx, dt);
    this._drawNebulae(gfx, dt);
    this._drawShootingStars(gfx);
    this._drawGrid(gfx, dt, gameState);
    this._drawPlayerTrail(gfx);

    entityManager.xpOrbs.forEach(o => {
      if (o.alive) this._drawXPOrb(gfx, o);
    });

    entityManager.blockers.forEach(b => {
      if (b.alive) this._drawBlocker(gfx, b);
    });

    entityManager.flares.forEach(f => {
      if (f.alive) this._drawFlare(gfx, f);
    });

    entityManager.chasers.forEach(c => {
      if (c.alive) this._drawChaser(gfx, c, player);
    });

    if (entityManager.shieldDrones) {
      entityManager.shieldDrones.forEach(d => {
        if (d.alive) this._drawShieldDrone(gfx, d);
      });
    }

    if (entityManager.laserGates) {
      entityManager.laserGates.forEach(lg => {
        this._drawLaserGate(gfx, lg);
      });
    }

    if (entityManager.powerUps) {
      entityManager.powerUps.forEach(p => {
        if (p.alive) this._drawPowerUp(gfx, p);
      });
    }

    entityManager.bursts.forEach(b => {
      if (b.alive) this._drawBurst(gfx, b);
    });

    if (player.alive) this._drawPlayer(gfx, player);

    this._drawGround(gfx);
  }

  // =============================================
  //  PLAYER — "Vector Interceptor"
  // =============================================
  _drawPlayer(gfx, player) {
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0) return;

    const x = player.x;
    const y = player.y;
    const s = CONFIG.PLAYER_WIDTH / 2;
    const color = player.getColor();
    const t = this._time;

    // --- Mode-dependent chevron dimensions ---
    let wingSpan, height, taperBack;
    if (player.mode === 'flight') {
      wingSpan = s * 1.4;
      height = s * 2.6;
      taperBack = s * 0.8;
    } else if (player.mode === 'falling') {
      wingSpan = s * 1.8;
      height = s * 2.0;
      taperBack = s * 0.5;
    } else {
      // impact — squat wide wedge
      wingSpan = s * 2.4;
      height = s * 1.6;
      taperBack = s * 0.4;
    }

    // --- Outer counter-rotating octagon wireframe ring ---
    const ringR = s * 2.0;
    const ringRot = t * 0.5;
    gfx.lineStyle(1, color, 0.15);
    this._drawPolygon(gfx, x, y, 8, ringR, ringRot);
    gfx.strokePath();

    // --- Shield indicator (if active) ---
    if (player.shieldActive) {
      const pulse = Math.sin(t * 6.5) * 0.15 + 0.35;
      gfx.lineStyle(2, 0x00ff88, pulse);
      gfx.strokeCircle(x, y, s * 2.2);
    }

    // --- Chevron body (fill + stroke) ---
    gfx.fillStyle(color, 0.6);
    this._drawChevron(gfx, x, y, wingSpan, height, taperBack, 0);
    gfx.fillPath();
    gfx.lineStyle(2, color, 1);
    this._drawChevron(gfx, x, y, wingSpan, height, taperBack, 0);
    gfx.strokePath();

    // --- Inner panel lines (structural detail) ---
    gfx.lineStyle(1, 0xffffff, 0.2);
    // Center spine
    gfx.beginPath();
    gfx.moveTo(x, y - height / 2 + 2);
    gfx.lineTo(x, y + height / 2 - taperBack);
    gfx.strokePath();
    // Wing struts
    gfx.beginPath();
    gfx.moveTo(x, y);
    gfx.lineTo(x - wingSpan * 0.35, y + height * 0.3);
    gfx.moveTo(x, y);
    gfx.lineTo(x + wingSpan * 0.35, y + height * 0.3);
    gfx.strokePath();

    // --- Pulsing white diamond core ---
    const corePulse = 0.5 + Math.sin(t * 8) * 0.3;
    const coreR = 3;
    gfx.fillStyle(0xffffff, corePulse);
    this._drawDiamond(gfx, x, y, coreR, coreR * 0.7, 0);
    gfx.fillPath();

    // --- Mode-specific details ---
    if (player.mode === 'flight') {
      // Thruster jets — 3 flickering exhaust lines below
      const exhaustFlicker = Math.sin(t * 20) * 0.3 + 0.6;
      for (let i = 0; i < 3; i++) {
        const exLen = 8 + Math.random() * 10;
        const exX = x - 4 + i * 4;
        const exAlpha = exhaustFlicker * (0.4 + Math.random() * 0.3);
        gfx.lineStyle(1, CONFIG.PLAYER_FLIGHT, exAlpha);
        gfx.beginPath();
        gfx.moveTo(exX, y + height / 2 - taperBack + 2);
        gfx.lineTo(exX + (Math.random() - 0.5) * 4, y + height / 2 - taperBack + 2 + exLen);
        gfx.strokePath();
      }
      // Upward indicator chevron
      gfx.lineStyle(1, 0xffffff, 0.5);
      gfx.beginPath();
      gfx.moveTo(x, y - height / 2 - 4);
      gfx.lineTo(x - 4, y - height / 2 + 1);
      gfx.moveTo(x, y - height / 2 - 4);
      gfx.lineTo(x + 4, y - height / 2 + 1);
      gfx.strokePath();
    } else if (player.mode === 'falling') {
      // Speed streaks — lines streaming upward from wings
      const streakAlpha = 0.3 + Math.random() * 0.2;
      gfx.lineStyle(1, color, streakAlpha);
      for (let i = 0; i < 4; i++) {
        const sx = x + (i - 1.5) * 5;
        const sLen = 6 + Math.random() * 8;
        gfx.beginPath();
        gfx.moveTo(sx, y - height / 2);
        gfx.lineTo(sx + (Math.random() - 0.5) * 2, y - height / 2 - sLen);
        gfx.strokePath();
      }
    } else {
      // Impact — ground contact arcs
      gfx.lineStyle(1, color, 0.4);
      gfx.beginPath();
      const arcY = y + height / 2 - taperBack + 2;
      for (let angle = -0.8; angle <= 0.8; angle += 0.1) {
        const arcX = x + Math.sin(angle) * wingSpan * 0.7;
        const arcYy = arcY + Math.cos(angle) * 3;
        if (angle === -0.8) gfx.moveTo(arcX, arcYy);
        else gfx.lineTo(arcX, arcYy);
      }
      gfx.strokePath();
    }

    // --- Flight meter bar ---
    const meterW = 30;
    const meterH = 3;
    const meterX = x - meterW / 2;
    const meterY = player.mode === 'impact' ? y - height / 2 - 10 : y + height / 2 + 5;
    const fill = player.flightMeter / CONFIG.FLIGHT_METER_MAX;
    gfx.fillStyle(0x333333, 0.6);
    gfx.fillRect(meterX, meterY, meterW, meterH);
    gfx.fillStyle(CONFIG.PLAYER_FLIGHT, 0.8);
    gfx.fillRect(meterX, meterY, meterW * fill, meterH);
  }

  // =============================================
  //  ENERGY BURST — "Photon Bolt"
  // =============================================
  _drawBurst(gfx, burst) {
    const bx = lerp(burst.prevX, burst.x, 0.5);
    const by = lerp(burst.prevY, burst.y, 0.5);
    const r = burst.radius;
    const t = this._time;

    // Motion trail line from prev position
    gfx.lineStyle(1, CONFIG.BURST_COLOR, 0.25);
    gfx.beginPath();
    gfx.moveTo(burst.prevX, burst.prevY);
    gfx.lineTo(bx, by);
    gfx.strokePath();

    // Elongated diamond body (tall narrow — stretched in travel direction)
    const dw = r * 0.8;
    const dh = r * 2.0;
    gfx.fillStyle(CONFIG.BURST_COLOR, 0.85);
    gfx.beginPath();
    gfx.moveTo(bx, by - dh);        // top (leading edge)
    gfx.lineTo(bx + dw, by);        // right
    gfx.lineTo(bx, by + dh * 0.6);  // bottom (shorter trailing)
    gfx.lineTo(bx - dw, by);        // left
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(1, CONFIG.BURST_COLOR, 1);
    gfx.beginPath();
    gfx.moveTo(bx, by - dh);
    gfx.lineTo(bx + dw, by);
    gfx.lineTo(bx, by + dh * 0.6);
    gfx.lineTo(bx - dw, by);
    gfx.closePath();
    gfx.strokePath();

    // Inner cross lines
    gfx.lineStyle(1, 0xffffff, 0.3);
    gfx.beginPath();
    gfx.moveTo(bx, by - dh * 0.5);
    gfx.lineTo(bx, by + dh * 0.3);
    gfx.moveTo(bx - dw * 0.4, by);
    gfx.lineTo(bx + dw * 0.4, by);
    gfx.strokePath();

    // White core
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillRect(bx - 1, by - 1, 2, 2);

    // Rotating 4-point sparkle
    const sparkRot = t * 12;
    const sparkR = r * 0.5;
    gfx.lineStyle(1, 0xffffff, 0.5);
    gfx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = sparkRot + (HALF_PI * i);
      gfx.moveTo(bx, by);
      gfx.lineTo(bx + Math.cos(angle) * sparkR, by + Math.sin(angle) * sparkR);
    }
    gfx.strokePath();

    // Leading edge flicker
    if (Math.random() > 0.4) {
      const flickR = 1 + Math.random() * 2;
      gfx.fillStyle(0xffffff, 0.4 + Math.random() * 0.3);
      gfx.fillRect(bx - flickR / 2, by - dh - flickR / 2, flickR, flickR);
    }
  }

  // =============================================
  //  DATA BLOCKER — "Barrier Fortress"
  // =============================================
  _drawBlocker(gfx, blocker) {
    const x = blocker.x;
    const y = blocker.y;
    const hw = blocker.width / 2;
    const hh = blocker.height / 2;
    const drawColor = blocker.hitFlashTimer > 0 ? 0xffffff : CONFIG.BLOCKER_COLOR;
    const t = this._time;

    // --- Faint outer rotating wireframe hexagon ---
    const outerR = Math.max(hw, hh) * 1.3;
    gfx.lineStyle(1, drawColor, 0.12);
    this._drawPolygon(gfx, x, y, 6, outerR, t * 0.4);
    gfx.strokePath();

    // --- Elongated hexagon body (main shape) ---
    // Custom hex: wider than tall
    gfx.fillStyle(drawColor, 0.6);
    gfx.beginPath();
    gfx.moveTo(x - hw, y);                    // left
    gfx.lineTo(x - hw + hh, y - hh);          // top-left
    gfx.lineTo(x + hw - hh, y - hh);          // top-right
    gfx.lineTo(x + hw, y);                    // right
    gfx.lineTo(x + hw - hh, y + hh);          // bottom-right
    gfx.lineTo(x - hw + hh, y + hh);          // bottom-left
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, drawColor, 1);
    gfx.beginPath();
    gfx.moveTo(x - hw, y);
    gfx.lineTo(x - hw + hh, y - hh);
    gfx.lineTo(x + hw - hh, y - hh);
    gfx.lineTo(x + hw, y);
    gfx.lineTo(x + hw - hh, y + hh);
    gfx.lineTo(x - hw + hh, y + hh);
    gfx.closePath();
    gfx.strokePath();

    // --- Internal grid dividers ---
    gfx.lineStyle(1, drawColor, 0.2);
    const divCount = 4;
    for (let i = 1; i < divCount; i++) {
      const divX = x - hw + hh + (blocker.width - hh * 2) * (i / divCount);
      gfx.beginPath();
      gfx.moveTo(divX, y - hh + 1);
      gfx.lineTo(divX, y + hh - 1);
      gfx.strokePath();
    }

    // --- Scrolling data dots ---
    const dotOffset = (t * 30) % 12;
    gfx.fillStyle(drawColor, 0.3);
    for (let dx = x - hw + hh + dotOffset; dx < x + hw - hh; dx += 12) {
      for (let row = -1; row <= 1; row += 2) {
        const dotY = y + row * (hh * 0.4);
        gfx.fillRect(dx - 1, dotY - 1, 2, 2);
      }
    }

    // --- Diamond-shaped HP pips ---
    const pipSpacing = 10;
    const pipStartX = x - ((blocker.hp - 1) * pipSpacing) / 2;
    for (let i = 0; i < blocker.hp; i++) {
      const px = pipStartX + i * pipSpacing;
      gfx.fillStyle(0xffffff, 0.9);
      this._drawDiamond(gfx, px, y, 3, 2, 0);
      gfx.fillPath();
    }

    // --- Corner bracket accents ---
    const bracketLen = 5;
    gfx.lineStyle(1, drawColor, 0.5);
    // top-left
    gfx.beginPath();
    gfx.moveTo(x - hw + hh, y - hh);
    gfx.lineTo(x - hw + hh - bracketLen, y - hh);
    gfx.moveTo(x - hw + hh, y - hh);
    gfx.lineTo(x - hw + hh, y - hh + bracketLen);
    gfx.strokePath();
    // top-right
    gfx.beginPath();
    gfx.moveTo(x + hw - hh, y - hh);
    gfx.lineTo(x + hw - hh + bracketLen, y - hh);
    gfx.moveTo(x + hw - hh, y - hh);
    gfx.lineTo(x + hw - hh, y - hh + bracketLen);
    gfx.strokePath();
    // bottom-left
    gfx.beginPath();
    gfx.moveTo(x - hw + hh, y + hh);
    gfx.lineTo(x - hw + hh - bracketLen, y + hh);
    gfx.moveTo(x - hw + hh, y + hh);
    gfx.lineTo(x - hw + hh, y + hh - bracketLen);
    gfx.strokePath();
    // bottom-right
    gfx.beginPath();
    gfx.moveTo(x + hw - hh, y + hh);
    gfx.lineTo(x + hw - hh + bracketLen, y + hh);
    gfx.moveTo(x + hw - hh, y + hh);
    gfx.lineTo(x + hw - hh, y + hh - bracketLen);
    gfx.strokePath();

    // --- Pulsing edge segments ---
    const segCount = 6;
    for (let i = 0; i < segCount; i++) {
      const segPhase = Math.sin(t * 3 + i * 1.2) * 0.3 + 0.3;
      const segX = x - hw + hh + (blocker.width - hh * 2) * (i / segCount);
      gfx.lineStyle(2, drawColor, segPhase);
      gfx.beginPath();
      gfx.moveTo(segX, y - hh);
      gfx.lineTo(segX + (blocker.width - hh * 2) / segCount * 0.5, y - hh);
      gfx.strokePath();
    }
  }

  // =============================================
  //  CHASER BOT — "Hunter Scarab"
  // =============================================
  _drawChaser(gfx, chaser, player) {
    const x = chaser.x;
    const y = chaser.y;
    const r = chaser.radius;
    const drawColor = chaser.hitFlashTimer > 0 ? 0xffffff : CONFIG.CHASER_COLOR;
    const t = this._time;

    // --- Scanning detection arc toward player ---
    if (player && player.alive) {
      const dx = player.x - x;
      const dy = player.y - y;
      const angleToPlayer = Math.atan2(dy, dx);
      const scanArc = 0.5;  // radians width
      const scanR = r * 4;
      const scanSweep = Math.sin(t * 2.5) * 0.4;
      gfx.lineStyle(1, drawColor, 0.08);
      gfx.beginPath();
      gfx.moveTo(x, y);
      for (let a = -scanArc; a <= scanArc; a += 0.1) {
        const sa = angleToPlayer + a + scanSweep;
        gfx.lineTo(x + Math.cos(sa) * scanR, y + Math.sin(sa) * scanR);
      }
      gfx.lineTo(x, y);
      gfx.strokePath();
    }

    // --- Inverted pentagon body (wider top, tapered bottom) ---
    gfx.fillStyle(drawColor, 0.75);
    gfx.beginPath();
    gfx.moveTo(x - r * 1.1, y - r * 0.5);   // top-left (wide)
    gfx.lineTo(x + r * 1.1, y - r * 0.5);   // top-right (wide)
    gfx.lineTo(x + r * 0.8, y + r * 0.4);   // mid-right
    gfx.lineTo(x, y + r * 1.0);              // bottom center (tapered)
    gfx.lineTo(x - r * 0.8, y + r * 0.4);   // mid-left
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, drawColor, 1);
    gfx.beginPath();
    gfx.moveTo(x - r * 1.1, y - r * 0.5);
    gfx.lineTo(x + r * 1.1, y - r * 0.5);
    gfx.lineTo(x + r * 0.8, y + r * 0.4);
    gfx.lineTo(x, y + r * 1.0);
    gfx.lineTo(x - r * 0.8, y + r * 0.4);
    gfx.closePath();
    gfx.strokePath();

    // --- Carapace lines (diagonals + spine) ---
    gfx.lineStyle(1, drawColor, 0.25);
    // Spine
    gfx.beginPath();
    gfx.moveTo(x, y - r * 0.5);
    gfx.lineTo(x, y + r * 1.0);
    gfx.strokePath();
    // Left diagonal
    gfx.beginPath();
    gfx.moveTo(x - r * 1.1, y - r * 0.5);
    gfx.lineTo(x, y + r * 0.3);
    gfx.strokePath();
    // Right diagonal
    gfx.beginPath();
    gfx.moveTo(x + r * 1.1, y - r * 0.5);
    gfx.lineTo(x, y + r * 0.3);
    gfx.strokePath();

    // --- 3-layer tracking eye ---
    let eyeOffX = 0;
    let eyeOffY = 0;
    if (player) {
      const dx = player.x - x;
      const dy = player.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      eyeOffX = (dx / dist) * 3;
      eyeOffY = (dy / dist) * 3;
    }
    const eyeY = y - r * 0.1;
    // Outer ring
    const eyePulse = 0.6 + Math.sin(t * 5) * 0.2;
    gfx.lineStyle(1, drawColor, 0.4);
    gfx.strokeCircle(x + eyeOffX * 0.3, eyeY + eyeOffY * 0.3, 5);
    // Red fill
    gfx.fillStyle(0xff0000, 0.9 * eyePulse);
    gfx.fillCircle(x + eyeOffX, eyeY + eyeOffY, 3);
    // White pupil
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(x + eyeOffX, eyeY + eyeOffY, 1.2);

    // --- 3 pairs of articulated legs with knee joints ---
    const legPhase = t * 12;
    gfx.lineStyle(1, drawColor, 0.55);
    for (let pair = 0; pair < 3; pair++) {
      const legBaseY = y + r * (-0.1 + pair * 0.35);
      const swing = Math.sin(legPhase + pair * 2.1) * 4;
      const kneeExtend = 4 + Math.abs(Math.sin(legPhase + pair * 2.1)) * 3;

      // Left leg
      const lKneeX = x - r * 0.9 - kneeExtend;
      const lKneeY = legBaseY + swing * 0.5;
      const lFootX = lKneeX - 2 + swing;
      const lFootY = lKneeY + 5;
      gfx.beginPath();
      gfx.moveTo(x - r * 0.6, legBaseY);
      gfx.lineTo(lKneeX, lKneeY);
      gfx.lineTo(lFootX, lFootY);
      gfx.strokePath();

      // Right leg
      const rKneeX = x + r * 0.9 + kneeExtend;
      const rKneeY = legBaseY - swing * 0.5;
      const rFootX = rKneeX + 2 - swing;
      const rFootY = rKneeY + 5;
      gfx.beginPath();
      gfx.moveTo(x + r * 0.6, legBaseY);
      gfx.lineTo(rKneeX, rKneeY);
      gfx.lineTo(rFootX, rFootY);
      gfx.strokePath();
    }

    // --- Threat indicator chevron (below body) ---
    if (player && player.alive && player.mode !== 'flight') {
      const threatAlpha = 0.3 + Math.sin(t * 4) * 0.15;
      gfx.lineStyle(1, 0xff0000, threatAlpha);
      gfx.beginPath();
      gfx.moveTo(x - 4, y + r * 1.0 + 4);
      gfx.lineTo(x, y + r * 1.0 + 8);
      gfx.lineTo(x + 4, y + r * 1.0 + 4);
      gfx.strokePath();
    }
  }

  // =============================================
  //  GRAVITY FLARE — "Void Singularity"
  // =============================================
  _drawFlare(gfx, flare) {
    const x = flare.x;
    const y = flare.y;
    const r = flare.radius;
    const pulse = Math.sin(flare.pulsePhase) * 0.2 + 0.8;
    const drawColor = flare.hitFlashTimer > 0 ? 0xffffff : CONFIG.FLARE_COLOR;
    const t = this._time;

    // --- Dashed pull-radius rings (counter-rotating segments) ---
    gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.08 * pulse);
    this._drawDashedCircle(gfx, x, y, flare.pullRadius, 12, 0.35, t * 0.3);
    gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.05 * pulse);
    this._drawDashedCircle(gfx, x, y, flare.pullRadius * 0.75, 8, 0.4, -t * 0.5);

    // --- 4 orbiting debris triangles ---
    for (let i = 0; i < 4; i++) {
      const orbitAngle = (HALF_PI * i) + t * 2;
      const orbitR = r * 2.5 + Math.sin(t * 1.5 + i) * 4;
      const dx = x + Math.cos(orbitAngle) * orbitR;
      const dy = y + Math.sin(orbitAngle) * orbitR;
      const selfRot = t * 6 + i * 1.5;
      const debrisR = 3;
      gfx.fillStyle(CONFIG.FLARE_COLOR, 0.4 * pulse);
      this._drawPolygon(gfx, dx, dy, 3, debrisR, selfRot);
      gfx.fillPath();
      gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.6 * pulse);
      this._drawPolygon(gfx, dx, dy, 3, debrisR, selfRot);
      gfx.strokePath();
    }

    // --- 6 curved spiral distortion lines ---
    for (let i = 0; i < 6; i++) {
      const baseAngle = (TWO_PI / 6) * i + t * 1.5;
      gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.15 * pulse);
      gfx.beginPath();
      for (let step = 0; step < 10; step++) {
        const tt = step / 10;
        const spiralR = r * 0.4 + r * 2.0 * tt;
        const spiralAngle = baseAngle + tt * Math.PI * 1.2;
        const sx = x + Math.cos(spiralAngle) * spiralR;
        const sy = y + Math.sin(spiralAngle) * spiralR;
        if (step === 0) gfx.moveTo(sx, sy);
        else gfx.lineTo(sx, sy);
      }
      gfx.strokePath();
    }

    // --- 3 enhanced spiral arms with bright tips ---
    for (let arm = 0; arm < 3; arm++) {
      const baseAngle = (TWO_PI / 3) * arm + t * 3;
      gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.35 * pulse);
      gfx.beginPath();
      let tipX = x, tipY = y;
      for (let step = 0; step < 14; step++) {
        const tt = step / 14;
        const spiralR = r * 0.3 + r * 1.8 * tt;
        const spiralAngle = baseAngle + tt * Math.PI * 1.5;
        tipX = x + Math.cos(spiralAngle) * spiralR;
        tipY = y + Math.sin(spiralAngle) * spiralR;
        if (step === 0) gfx.moveTo(tipX, tipY);
        else gfx.lineTo(tipX, tipY);
      }
      gfx.strokePath();
      // Bright tip dot
      gfx.fillStyle(0xffffff, 0.5 * pulse);
      gfx.fillRect(tipX - 1, tipY - 1, 2, 2);
    }

    // --- Double-outline diamond shell ---
    gfx.fillStyle(drawColor, 0.6 * pulse);
    this._drawDiamond(gfx, x, y, r, r, 0);
    gfx.fillPath();
    gfx.lineStyle(2, drawColor, pulse);
    this._drawDiamond(gfx, x, y, r, r, 0);
    gfx.strokePath();
    // Second outline (slightly larger)
    gfx.lineStyle(1, drawColor, 0.4 * pulse);
    this._drawDiamond(gfx, x, y, r * 1.25, r * 1.25, 0);
    gfx.strokePath();

    // --- Spinning cross core with center dot ---
    const crossRot = t * 5;
    const crossR = r * 0.5;
    gfx.lineStyle(1, 0xffffff, 0.5 * pulse);
    gfx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = crossRot + HALF_PI * i;
      gfx.moveTo(x, y);
      gfx.lineTo(x + Math.cos(angle) * crossR, y + Math.sin(angle) * crossR);
    }
    gfx.strokePath();
    // Center dot
    gfx.fillStyle(0xffffff, 0.6 * pulse);
    gfx.fillCircle(x, y, 2);
  }

  // =============================================
  //  XP ORB — "Data Fragment"
  // =============================================
  _drawXPOrb(gfx, orb) {
    const x = orb.x;
    const y = orb.y;
    const r = orb.radius;
    const pulse = Math.sin(orb.elapsed / 200) * 0.3 + 0.7;
    const t = this._time;
    const magnetized = orb.magnetized || false;
    const sparkSpeed = magnetized ? 8 : 4;

    // --- 6 orbiting sparkle dots with per-dot flicker ---
    for (let i = 0; i < 6; i++) {
      const sparkAngle = (TWO_PI / 6) * i + t * sparkSpeed;
      const sparkR = r * 2.2;
      const sx = x + Math.cos(sparkAngle) * sparkR;
      const sy = y + Math.sin(sparkAngle) * sparkR;
      const flicker = 0.3 + Math.sin(t * 10 + i * 1.7) * 0.25;
      gfx.fillStyle(CONFIG.XP_ORB_COLOR, flicker * pulse);
      gfx.fillRect(sx - 1, sy - 1, 2, 2);
    }

    // --- Outer hexagon ---
    gfx.lineStyle(1, CONFIG.XP_ORB_COLOR, 0.5 * pulse);
    this._drawPolygon(gfx, x, y, 6, r * 1.3, t * 1.5);
    gfx.strokePath();

    // --- Counter-rotating outer hex ---
    gfx.lineStyle(1, CONFIG.XP_ORB_COLOR, 0.3 * pulse);
    this._drawPolygon(gfx, x, y, 6, r * 1.5, -t * 1.5);
    gfx.strokePath();

    // --- Hexagonal crystal body (fill) ---
    gfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.55 * pulse);
    this._drawPolygon(gfx, x, y, 6, r, -Math.PI / 6);
    gfx.fillPath();
    gfx.lineStyle(1, CONFIG.XP_ORB_COLOR, 0.8 * pulse);
    this._drawPolygon(gfx, x, y, 6, r, -Math.PI / 6);
    gfx.strokePath();

    // --- Inner 6-pointed star (two overlaid rotating triangles) ---
    const starR = r * 0.7;
    gfx.fillStyle(0xffffff, 0.3 * pulse);
    this._drawPolygon(gfx, x, y, 3, starR, t * 3);
    gfx.fillPath();
    this._drawPolygon(gfx, x, y, 3, starR, t * 3 + Math.PI);
    gfx.fillPath();

    // --- White diamond core ---
    const coreR = r * 0.3;
    gfx.fillStyle(0xffffff, 0.7 * pulse);
    this._drawDiamond(gfx, x, y, coreR, coreR * 0.7, -t * 5);
    gfx.fillPath();

    // --- When magnetized: 3 directional streaks toward player ---
    if (magnetized) {
      gfx.lineStyle(1, CONFIG.XP_ORB_COLOR, 0.4);
      for (let i = 0; i < 3; i++) {
        const streakAngle = -HALF_PI + (i - 1) * 0.3;
        const len = r * 2 + Math.random() * r;
        gfx.beginPath();
        gfx.moveTo(x, y);
        gfx.lineTo(x + Math.cos(streakAngle) * len, y + Math.sin(streakAngle) * len);
        gfx.strokePath();
      }
    }
  }

  // =============================================
  //  SHIELD DRONE — "Sentinel Orb"
  // =============================================
  _drawShieldDrone(gfx, drone) {
    const x = drone.x;
    const y = drone.y;
    const r = drone.radius;
    const drawColor = drone.hitFlashTimer > 0 ? 0xffffff : CONFIG.SHIELD_DRONE_COLOR;
    const t = this._time;

    // --- Animated energy tether to host ---
    if (drone.host && drone.host.alive) {
      const hx = drone.host.x;
      const hy = drone.host.y;
      // Dashed line
      const dx = hx - x;
      const dy = hy - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const segments = Math.floor(dist / 8);
      gfx.lineStyle(1, CONFIG.SHIELD_DRONE_COLOR, 0.25);
      for (let i = 0; i < segments; i += 2) {
        const t1 = i / segments;
        const t2 = Math.min((i + 1) / segments, 1);
        gfx.beginPath();
        gfx.moveTo(x + dx * t1, y + dy * t1);
        gfx.lineTo(x + dx * t2, y + dy * t2);
        gfx.strokePath();
      }
      // Traveling dots
      const dotCount = 3;
      for (let i = 0; i < dotCount; i++) {
        const dotT = ((t * 3 + i / dotCount) % 1);
        const dotX = x + dx * dotT;
        const dotY = y + dy * dotT;
        gfx.fillStyle(CONFIG.SHIELD_DRONE_COLOR, 0.5);
        gfx.fillRect(dotX - 1, dotY - 1, 2, 2);
      }
    }

    // --- Outer dashed ring ---
    gfx.lineStyle(1, drawColor, 0.35);
    this._drawDashedCircle(gfx, x, y, r * 2.0, 8, 0.3, t * 0.8);

    // --- Solid circle ring ---
    gfx.lineStyle(1.5, drawColor, 0.7);
    gfx.strokeCircle(x, y, r * 1.4);

    // --- Rotating diamond body ---
    const diamondRot = t * 2;
    gfx.fillStyle(drawColor, 0.75);
    this._drawDiamond(gfx, x, y, r, r * 0.7, diamondRot);
    gfx.fillPath();
    gfx.lineStyle(1, drawColor, 1);
    this._drawDiamond(gfx, x, y, r, r * 0.7, diamondRot);
    gfx.strokePath();

    // --- Crosshair core ---
    const crossRot = t * 0.8;
    const crossLen = r * 0.5;
    gfx.lineStyle(1, 0xffffff, 0.5);
    gfx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = crossRot + HALF_PI * i;
      gfx.moveTo(x + Math.cos(angle) * 1.5, y + Math.sin(angle) * 1.5);
      gfx.lineTo(x + Math.cos(angle) * crossLen, y + Math.sin(angle) * crossLen);
    }
    gfx.strokePath();
    // Center dot
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(x, y, 1.5);

    // --- Orbit trail arc (when orbiting host) ---
    if (drone.host && drone.host.alive && !drone.freeRoaming) {
      const trailArc = 0.8; // radians of trail
      gfx.lineStyle(1, CONFIG.SHIELD_DRONE_COLOR, 0.15);
      gfx.beginPath();
      for (let a = 0; a <= 8; a++) {
        const trailAngle = drone.orbitAngle - trailArc * (a / 8);
        const tx = drone.host.x + Math.cos(trailAngle) * drone.orbitRadius;
        const ty = drone.host.y + Math.sin(trailAngle) * drone.orbitRadius;
        if (a === 0) gfx.moveTo(tx, ty);
        else gfx.lineTo(tx, ty);
      }
      gfx.strokePath();
    }
  }

  // =============================================
  //  LASER GATE — "Tesla Pylon System"
  // =============================================
  _drawLaserGate(gfx, laserGate) {
    const a1 = laserGate.anchor1;
    const a2 = laserGate.anchor2;

    if (a1.alive) this._drawLaserAnchor(gfx, a1, a2);
    if (a2.alive) this._drawLaserAnchor(gfx, a2, a1);

    if (a1.alive && a2.alive) {
      const beamActive = laserGate.isBeamActive();
      if (beamActive) {
        const flicker = 0.7 + Math.random() * 0.3;
        const t = this._time;

        // Wide red glow
        gfx.lineStyle(10, CONFIG.LASER_BEAM_COLOR, 0.12 * flicker);
        gfx.beginPath();
        gfx.moveTo(a1.x, a1.y);
        gfx.lineTo(a2.x, a2.y);
        gfx.strokePath();

        // Core beam
        gfx.lineStyle(3, CONFIG.LASER_BEAM_COLOR, 0.6 * flicker);
        gfx.beginPath();
        gfx.moveTo(a1.x, a1.y);
        gfx.lineTo(a2.x, a2.y);
        gfx.strokePath();

        // Inner white core
        gfx.lineStyle(1, 0xffffff, 0.8 * flicker);
        gfx.beginPath();
        gfx.moveTo(a1.x, a1.y);
        gfx.lineTo(a2.x, a2.y);
        gfx.strokePath();

        // TWO zigzag arc polylines flanking beam
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / len;
        const perpY = dx / len;
        const segments = 10;

        for (let side = -1; side <= 1; side += 2) {
          gfx.lineStyle(1, 0xffffff, 0.35 * flicker);
          gfx.beginPath();
          gfx.moveTo(a1.x + perpX * side * 4, a1.y + perpY * side * 4);
          for (let i = 1; i <= segments; i++) {
            const tt = i / segments;
            const bx = a1.x + dx * tt;
            const by = a1.y + dy * tt;
            const offset = (Math.random() - 0.5) * 10 + side * 4;
            gfx.lineTo(bx + perpX * offset, by + perpY * offset);
          }
          gfx.strokePath();
        }

        // Rotating node sparkles at anchor points
        for (const anchor of [a1, a2]) {
          const sparkR = 5;
          gfx.lineStyle(1, 0xffffff, 0.5 * flicker);
          for (let i = 0; i < 4; i++) {
            const angle = t * 8 + HALF_PI * i;
            gfx.beginPath();
            gfx.moveTo(anchor.x, anchor.y);
            gfx.lineTo(anchor.x + Math.cos(angle) * sparkR, anchor.y + Math.sin(angle) * sparkR);
            gfx.strokePath();
          }
        }
      } else {
        // Inactive — pulsing alternating-brightness dots (charging animation)
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dots = Math.floor(dist / 10);
        const t = this._time;
        for (let i = 0; i <= dots; i++) {
          const tt = i / dots;
          const dotAlpha = 0.1 + Math.sin(t * 4 + i * 0.8) * 0.12;
          gfx.fillStyle(CONFIG.LASER_COLOR, dotAlpha);
          gfx.fillCircle(a1.x + dx * tt, a1.y + dy * tt, 1.5);
        }
      }
    }
  }

  _drawLaserAnchor(gfx, anchor, otherAnchor) {
    const x = anchor.x;
    const y = anchor.y;
    const r = anchor.radius;
    const drawColor = anchor.hitFlashTimer > 0 ? 0xffffff : CONFIG.LASER_COLOR;
    const t = this._time;

    // --- Octagonal body ---
    gfx.fillStyle(drawColor, 0.65);
    this._drawPolygon(gfx, x, y, 8, r, Math.PI / 8);
    gfx.fillPath();
    gfx.lineStyle(2, drawColor, 1);
    this._drawPolygon(gfx, x, y, 8, r, Math.PI / 8);
    gfx.strokePath();

    // --- Inner rotating inscribed square ---
    gfx.lineStyle(1, drawColor, 0.4);
    this._drawPolygon(gfx, x, y, 4, r * 0.6, t * 1.5);
    gfx.strokePath();

    // --- Diamond HP pips ---
    const pipSpacing = 6;
    const pipStartX = x - ((anchor.hp - 1) * pipSpacing) / 2;
    for (let i = 0; i < anchor.hp; i++) {
      const px = pipStartX + i * pipSpacing;
      gfx.fillStyle(0xffffff, 0.85);
      this._drawDiamond(gfx, px, y, 2.5, 2, 0);
      gfx.fillPath();
    }

    // --- Beam emitter dot on inner face toward partner ---
    if (otherAnchor && otherAnchor.alive) {
      const dx = otherAnchor.x - x;
      const dy = otherAnchor.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const emitX = x + (dx / dist) * r;
      const emitY = y + (dy / dist) * r;
      const emitPulse = 0.5 + Math.sin(t * 6) * 0.3;
      gfx.fillStyle(CONFIG.LASER_BEAM_COLOR, emitPulse);
      gfx.fillCircle(emitX, emitY, 2);
    }
  }

  // =============================================
  //  POWER-UP — "Prism Artifact"
  // =============================================
  _drawPowerUp(gfx, pu) {
    const x = pu.x;
    const y = pu.y;
    const r = pu.radius;
    const color = pu.getColor();
    const t = this._time;

    // Blink when expiring
    const remaining = pu.lifetime - pu.elapsed;
    const expiring = remaining < 2000;
    if (expiring && Math.floor(remaining / 120) % 2 === 0) return;

    // --- Breathing beacon pulse ring ---
    const beaconPulse = expiring
      ? (0.3 + Math.sin(t * 12) * 0.3)  // rapid flash when expiring
      : (0.15 + Math.sin(t * 2) * 0.1);
    const beaconR = r * 2.5 + Math.sin(t * 2) * r * 0.5;
    gfx.lineStyle(1, color, beaconPulse);
    gfx.strokeCircle(x, y, beaconR);

    // --- 8 orbiting sparkle dots ---
    const sparkDir = expiring ? -1 : 1;  // reverse when expiring
    for (let i = 0; i < 8; i++) {
      const sparkAngle = (TWO_PI / 8) * i + t * 3 * sparkDir;
      const sparkR = r * 2.0;
      const sx = x + Math.cos(sparkAngle) * sparkR;
      const sy = y + Math.sin(sparkAngle) * sparkR;
      const sparkAlpha = 0.3 + Math.sin(t * 8 + i * 0.9) * 0.2;
      gfx.fillStyle(color, sparkAlpha);
      gfx.fillRect(sx - 1, sy - 1, 2, 2);
    }

    // --- Octagram wireframe (8-pointed star from two overlaid rotating squares) ---
    const octaR = r * 1.3;
    gfx.lineStyle(1, color, 0.5);
    this._drawPolygon(gfx, x, y, 4, octaR, t * 1.2);
    gfx.strokePath();
    this._drawPolygon(gfx, x, y, 4, octaR, t * 1.2 + Math.PI / 4);
    gfx.strokePath();

    // --- Hexagon body fill ---
    gfx.fillStyle(color, 0.65);
    this._drawPolygon(gfx, x, y, 6, r, -Math.PI / 6);
    gfx.fillPath();
    gfx.lineStyle(1, color, 0.9);
    this._drawPolygon(gfx, x, y, 6, r, -Math.PI / 6);
    gfx.strokePath();

    // --- Type-specific icon ---
    gfx.lineStyle(1.5, 0xffffff, 0.8);
    const iconR = r * 0.4;
    switch (pu.powerType) {
      case 'FLIGHT_RECHARGE':
        // Upward arrow
        gfx.beginPath();
        gfx.moveTo(x, y - iconR);
        gfx.lineTo(x, y + iconR);
        gfx.moveTo(x - iconR * 0.6, y - iconR * 0.3);
        gfx.lineTo(x, y - iconR);
        gfx.lineTo(x + iconR * 0.6, y - iconR * 0.3);
        gfx.strokePath();
        break;
      case 'SCORE_BOOST':
        // Circle (coin)
        gfx.strokeCircle(x, y, iconR);
        break;
      case 'SHIELD':
        // Cross / plus
        gfx.beginPath();
        gfx.moveTo(x - iconR, y);
        gfx.lineTo(x + iconR, y);
        gfx.moveTo(x, y - iconR);
        gfx.lineTo(x, y + iconR);
        gfx.strokePath();
        break;
      case 'SLAM_PLUS':
        // Down arrow + explosion lines
        gfx.beginPath();
        gfx.moveTo(x, y + iconR);
        gfx.lineTo(x, y - iconR);
        gfx.moveTo(x - iconR * 0.6, y + iconR * 0.3);
        gfx.lineTo(x, y + iconR);
        gfx.lineTo(x + iconR * 0.6, y + iconR * 0.3);
        gfx.strokePath();
        break;
    }

    // --- White core ---
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(x, y, 2);
  }

  destroy() {
    // No sprites to clean up
  }
}
