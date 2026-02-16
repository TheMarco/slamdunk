import { CONFIG } from '../config.js';
import { lerp } from '../utils/math.js';

const GRID_HORIZON_Y = 60;

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
  //  NEBULA CLOUDS (Phase 5)
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
  //  SHOOTING STARS (Phase 5)
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
      // Bright head
      gfx.lineStyle(2, 0xffffff, alpha * 0.9);
      gfx.beginPath();
      gfx.moveTo(s.x, s.y);
      gfx.lineTo(tailX, tailY);
      gfx.strokePath();
      // Faint trail
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

    // Phase-based grid tinting (Phase 5)
    let gridColor = CONFIG.GRID_COLOR;
    let gridHighlight = CONFIG.GRID_HIGHLIGHT;
    if (gameState) {
      const t = gameState.elapsed || 0;
      if (t > 120) {
        gridColor = 0x501020;       // red-shift in LATEGAME
        gridHighlight = 0xa03060;
      } else if (t > 60) {
        gridColor = 0x3a1050;       // purple deepen in MIDGAME
        gridHighlight = 0x7030a0;
      }
    }

    // Horizon glow line
    gfx.lineStyle(2, gridHighlight, 0.4);
    gfx.beginPath();
    gfx.moveTo(0, horizonY);
    gfx.lineTo(w, horizonY);
    gfx.strokePath();

    // Vertical lines converging to center at horizon
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

    // Horizontal lines with quadratic spacing
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

    // Brighter center line
    gfx.lineStyle(1, gridHighlight, 0.3);
    gfx.beginPath();
    gfx.moveTo(cx, horizonY);
    gfx.lineTo(cx, h);
    gfx.strokePath();
  }

  // =============================================
  //  GROUND + HEAT SHIMMER (Phase 5)
  // =============================================
  _drawGround(gfx) {
    const gy = CONFIG.GROUND_Y + CONFIG.PLAYER_RADIUS;
    const w = CONFIG.WIDTH;
    const groundH = CONFIG.HEIGHT - gy;

    // Gradient fill
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const stepY = gy + groundH * t;
      const stepH = groundH / 8;
      const alpha = 0.25 - t * 0.025;
      gfx.fillStyle(CONFIG.GRID_COLOR, alpha);
      gfx.fillRect(0, stepY, w, stepH);
    }

    // Horizontal scanlines
    gfx.lineStyle(1, CONFIG.PLAYER_IMPACT, 0.06);
    for (let y = gy + 4; y < CONFIG.HEIGHT; y += 4) {
      gfx.beginPath();
      gfx.moveTo(0, y);
      gfx.lineTo(w, y);
      gfx.strokePath();
    }

    // Heat shimmer — 3 wavering sine-wave lines above ground
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

    // Soft glow line
    gfx.lineStyle(6, CONFIG.PLAYER_IMPACT, 0.15);
    gfx.beginPath();
    gfx.moveTo(0, gy);
    gfx.lineTo(w, gy);
    gfx.strokePath();

    // Bright magenta edge line
    gfx.lineStyle(2, CONFIG.PLAYER_IMPACT, 0.8);
    gfx.beginPath();
    gfx.moveTo(0, gy);
    gfx.lineTo(w, gy);
    gfx.strokePath();
  }

  // =============================================
  //  PLAYER TRAIL (Phase 4)
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
        });
        if (this._playerTrail.length > 6) this._playerTrail.shift();
        this._trailTimer = 0;
      }
    } else {
      if (this._playerTrail.length > 0) {
        // Fade out remaining
        for (const ghost of this._playerTrail) ghost.alpha -= dt * 3;
        this._playerTrail = this._playerTrail.filter(g => g.alpha > 0.02);
      }
      this._trailTimer = 0;
    }
    // Fade all
    for (const ghost of this._playerTrail) ghost.alpha -= dt * 1.2;
    this._playerTrail = this._playerTrail.filter(g => g.alpha > 0.02);
  }

  _drawPlayerTrail(gfx) {
    for (const ghost of this._playerTrail) {
      const s = ghost.size;
      gfx.fillStyle(ghost.color, ghost.alpha * 0.4);
      gfx.fillRect(ghost.x - s, ghost.y - s, s * 2, s * 2);
      gfx.lineStyle(1, ghost.color, ghost.alpha * 0.3);
      gfx.strokeRect(ghost.x - s, ghost.y - s, s * 2, s * 2);
    }
  }

  // =============================================
  //  ADDITIVE GLOW LAYER (Phase 2)
  // =============================================
  drawGlowLayer(glowGfx, player, entityManager) {
    glowGfx.clear();

    const drawGlow = (x, y, color, baseRadius) => {
      glowGfx.fillStyle(color, 0.03);
      glowGfx.fillCircle(x, y, baseRadius * 4);
      glowGfx.fillStyle(color, 0.06);
      glowGfx.fillCircle(x, y, baseRadius * 3);
      glowGfx.fillStyle(color, 0.10);
      glowGfx.fillCircle(x, y, baseRadius * 2);
      glowGfx.fillStyle(color, 0.15);
      glowGfx.fillCircle(x, y, baseRadius * 1.2);
    };

    // Player
    if (player.alive && !(player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0)) {
      drawGlow(player.x, player.y, player.getColor(), CONFIG.PLAYER_RADIUS * 1.5);
    }

    // Bursts
    entityManager.bursts.forEach(b => {
      if (b.alive) drawGlow(b.x, b.y, CONFIG.BURST_COLOR, b.radius * 1.5);
    });

    // Blockers
    entityManager.blockers.forEach(b => {
      if (b.alive) drawGlow(b.x, b.y, CONFIG.BLOCKER_COLOR, b.radius);
    });

    // Flares
    entityManager.flares.forEach(f => {
      if (f.alive) drawGlow(f.x, f.y, CONFIG.FLARE_COLOR, f.radius * 1.5);
    });

    // Chasers
    entityManager.chasers.forEach(c => {
      if (c.alive) drawGlow(c.x, c.y, CONFIG.CHASER_COLOR, c.radius);
    });

    // XP Orbs
    entityManager.xpOrbs.forEach(o => {
      if (o.alive) drawGlow(o.x, o.y, CONFIG.XP_ORB_COLOR, o.radius);
    });

    // Shield drones
    if (entityManager.shieldDrones) {
      entityManager.shieldDrones.forEach(d => {
        if (d.alive) drawGlow(d.x, d.y, CONFIG.SHIELD_DRONE_COLOR, d.radius);
      });
    }

    // Power-ups
    if (entityManager.powerUps) {
      entityManager.powerUps.forEach(p => {
        if (p.alive) drawGlow(p.x, p.y, p.getColor(), p.radius * 1.5);
      });
    }

    // Laser gates
    if (entityManager.laserGates) {
      entityManager.laserGates.forEach(lg => {
        const a1 = lg.anchor1;
        const a2 = lg.anchor2;
        if (a1.alive) drawGlow(a1.x, a1.y, CONFIG.LASER_COLOR, a1.radius);
        if (a2.alive) drawGlow(a2.x, a2.y, CONFIG.LASER_COLOR, a2.radius);
        if (a1.alive && a2.alive && lg.isBeamActive()) {
          // Glow along beam
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

    // 0. Starfield
    this._drawStarfield(gfx, dt);

    // 0.5 Nebula clouds (behind grid)
    this._drawNebulae(gfx, dt);

    // 0.6 Shooting stars
    this._drawShootingStars(gfx);

    // 1. Grid
    this._drawGrid(gfx, dt, gameState);

    // 2. Player afterimage trail (behind entities)
    this._drawPlayerTrail(gfx);

    // 3. XP Orbs
    entityManager.xpOrbs.forEach(o => {
      if (o.alive) this._drawXPOrb(gfx, o);
    });

    // 4. Data Blockers
    entityManager.blockers.forEach(b => {
      if (b.alive) this._drawBlocker(gfx, b);
    });

    // 5. Gravity Flares
    entityManager.flares.forEach(f => {
      if (f.alive) this._drawFlare(gfx, f);
    });

    // 6. Chaser Bots
    entityManager.chasers.forEach(c => {
      if (c.alive) this._drawChaser(gfx, c, player);
    });

    // 7. Shield Drones
    if (entityManager.shieldDrones) {
      entityManager.shieldDrones.forEach(d => {
        if (d.alive) this._drawShieldDrone(gfx, d);
      });
    }

    // 8. Laser Gates
    if (entityManager.laserGates) {
      entityManager.laserGates.forEach(lg => {
        this._drawLaserGate(gfx, lg);
      });
    }

    // 9. Power-ups
    if (entityManager.powerUps) {
      entityManager.powerUps.forEach(p => {
        if (p.alive) this._drawPowerUp(gfx, p);
      });
    }

    // 10. Energy Bursts
    entityManager.bursts.forEach(b => {
      if (b.alive) this._drawBurst(gfx, b);
    });

    // 11. Player
    if (player.alive) this._drawPlayer(gfx, player);

    // 12. Ground
    this._drawGround(gfx);
  }

  // =============================================
  //  PLAYER (Phase 4 enhanced)
  // =============================================
  _drawPlayer(gfx, player) {
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0) return;

    const x = player.x;
    const y = player.y;
    const s = CONFIG.PLAYER_WIDTH / 2;
    const color = player.getColor();

    // Shield indicator
    if (player.shieldActive) {
      const pulse = Math.sin(this._time * 6.5) * 0.15 + 0.35;
      gfx.lineStyle(2, 0x00ff88, pulse);
      gfx.strokeCircle(x, y, s * 2);
    }

    // Main voxel square
    gfx.fillStyle(color, 0.8);
    gfx.fillRect(x - s, y - s, s * 2, s * 2);
    gfx.lineStyle(2, color, 1);
    gfx.strokeRect(x - s, y - s, s * 2, s * 2);

    // Pulsing white energy core (Phase 4)
    const corePulse = 0.5 + Math.sin(this._time * 8) * 0.3;
    gfx.fillStyle(0xffffff, corePulse);
    gfx.fillRect(x - 2, y - 2, 4, 4);

    // Mode indicators + Phase 4 enhancements
    if (player.mode === 'flight') {
      // Upward arrow
      gfx.lineStyle(2, 0xffffff, 0.8);
      gfx.beginPath();
      gfx.moveTo(x, y - s + 3);
      gfx.lineTo(x - 4, y);
      gfx.moveTo(x, y - s + 3);
      gfx.lineTo(x + 4, y);
      gfx.strokePath();

      // Animated thruster exhaust lines (Phase 4)
      const exhaustFlicker = Math.sin(this._time * 20) * 0.3 + 0.6;
      for (let i = 0; i < 3; i++) {
        const exLen = 6 + Math.random() * 8;
        const exX = x - 4 + i * 4;
        const exAlpha = exhaustFlicker * (0.4 + Math.random() * 0.3);
        gfx.lineStyle(1, CONFIG.PLAYER_FLIGHT, exAlpha);
        gfx.beginPath();
        gfx.moveTo(exX, y + s);
        gfx.lineTo(exX + (Math.random() - 0.5) * 3, y + s + exLen);
        gfx.strokePath();
      }
    } else if (player.mode === 'falling') {
      // Downward arrow
      gfx.lineStyle(2, 0xffffff, 0.8);
      gfx.beginPath();
      gfx.moveTo(x, y + s - 3);
      gfx.lineTo(x - 4, y);
      gfx.moveTo(x, y + s - 3);
      gfx.lineTo(x + 4, y);
      gfx.strokePath();
    } else {
      // Impact: wider stance
      gfx.lineStyle(1, color, 0.5);
      gfx.strokeRect(x - s - 2, y + s - 4, s * 2 + 4, 4);
    }

    // Flight meter bar
    const meterW = 30;
    const meterH = 3;
    const meterX = x - meterW / 2;
    const meterY = player.mode === 'impact' ? y - s - 8 : y + s + 5;
    const fill = player.flightMeter / CONFIG.FLIGHT_METER_MAX;
    gfx.fillStyle(0x333333, 0.6);
    gfx.fillRect(meterX, meterY, meterW, meterH);
    gfx.fillStyle(CONFIG.PLAYER_FLIGHT, 0.8);
    gfx.fillRect(meterX, meterY, meterW * fill, meterH);
  }

  // =============================================
  //  ENERGY BURST
  // =============================================
  _drawBurst(gfx, burst) {
    const bx = lerp(burst.prevX, burst.x, 0.5);
    const by = lerp(burst.prevY, burst.y, 0.5);

    // Neon energy bolt
    gfx.fillStyle(CONFIG.BURST_COLOR, 0.9);
    gfx.fillRect(bx - burst.radius, by - burst.radius, burst.radius * 2, burst.radius * 2);

    // Bright core
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillRect(bx - 1, by - 1, 2, 2);
  }

  // =============================================
  //  DATA BLOCKER (Phase 4: scrolling circuit traces)
  // =============================================
  _drawBlocker(gfx, blocker) {
    const x = blocker.x;
    const y = blocker.y;
    const hw = blocker.width / 2;
    const hh = blocker.height / 2;
    const drawColor = blocker.hitFlashTimer > 0 ? 0xffffff : CONFIG.BLOCKER_COLOR;

    // Solid platform
    gfx.fillStyle(drawColor, 0.7);
    gfx.fillRect(x - hw, y - hh, blocker.width, blocker.height);
    gfx.lineStyle(2, drawColor, 1);
    gfx.strokeRect(x - hw, y - hh, blocker.width, blocker.height);

    // Scrolling circuit-trace patterns (Phase 4)
    const traceOffset = (this._time * 30) % 16;
    gfx.lineStyle(1, drawColor, 0.25);
    for (let tx = x - hw + traceOffset; tx < x + hw; tx += 16) {
      // Horizontal trace
      gfx.beginPath();
      gfx.moveTo(Math.max(x - hw, tx), y - hh + 4);
      gfx.lineTo(Math.min(x + hw, tx + 8), y - hh + 4);
      gfx.lineTo(Math.min(x + hw, tx + 8), y + hh - 4);
      gfx.strokePath();
    }

    // HP indicator dots
    for (let i = 0; i < blocker.hp; i++) {
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(x - 6 + i * 12, y, 2);
    }

    // Warning stripes
    gfx.lineStyle(1, drawColor, 0.3);
    for (let sx = x - hw; sx < x + hw; sx += 8) {
      gfx.beginPath();
      gfx.moveTo(sx, y - hh);
      gfx.lineTo(sx + blocker.height, y + hh);
      gfx.strokePath();
    }
  }

  // =============================================
  //  CHASER BOT (Phase 4: eye tracking + walking legs)
  // =============================================
  _drawChaser(gfx, chaser, player) {
    const x = chaser.x;
    const y = chaser.y;
    const r = chaser.radius;
    const drawColor = chaser.hitFlashTimer > 0 ? 0xffffff : CONFIG.CHASER_COLOR;

    // Triangle body
    gfx.fillStyle(drawColor, 0.8);
    gfx.fillTriangle(x, y - r, x - r, y + r, x + r, y + r);
    gfx.lineStyle(2, drawColor, 1);
    gfx.beginPath();
    gfx.moveTo(x, y - r);
    gfx.lineTo(x - r, y + r);
    gfx.lineTo(x + r, y + r);
    gfx.closePath();
    gfx.strokePath();

    // Eye tracking player direction (Phase 4)
    let eyeOffX = 0;
    let eyeOffY = 0;
    if (player) {
      const dx = player.x - x;
      const dy = player.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      eyeOffX = (dx / dist) * 2;
      eyeOffY = (dy / dist) * 2;
    }
    // Red eye
    gfx.fillStyle(0xff0000, 0.9);
    gfx.fillCircle(x + eyeOffX, y + eyeOffY, 2.5);
    // White pupil
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(x + eyeOffX, y + eyeOffY, 1);

    // Animated walking legs (Phase 4)
    const legPhase = this._time * 10;
    const legSwing = Math.sin(legPhase) * 3;
    gfx.lineStyle(1, drawColor, 0.6);
    // Left leg
    gfx.beginPath();
    gfx.moveTo(x - r * 0.4, y + r);
    gfx.lineTo(x - r * 0.6 + legSwing, y + r + 5);
    gfx.strokePath();
    // Right leg
    gfx.beginPath();
    gfx.moveTo(x + r * 0.4, y + r);
    gfx.lineTo(x + r * 0.6 - legSwing, y + r + 5);
    gfx.strokePath();
  }

  // =============================================
  //  GRAVITY FLARE (Phase 4: swirling vortex + distortion lines)
  // =============================================
  _drawFlare(gfx, flare) {
    const x = flare.x;
    const y = flare.y;
    const r = flare.radius;
    const pulse = Math.sin(flare.pulsePhase) * 0.2 + 0.8;
    const drawColor = flare.hitFlashTimer > 0 ? 0xffffff : CONFIG.FLARE_COLOR;

    // Pull radius indicator
    gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.1 * pulse);
    gfx.strokeCircle(x, y, flare.pullRadius);

    // Gravity distortion lines converging inward (Phase 4)
    const lineCount = 8;
    for (let i = 0; i < lineCount; i++) {
      const angle = (Math.PI * 2 / lineCount) * i + this._time * 1.5;
      const outerR = flare.pullRadius * 0.8;
      const innerR = r * 2;
      const ox = x + Math.cos(angle) * outerR;
      const oy = y + Math.sin(angle) * outerR;
      const ix = x + Math.cos(angle + 0.3) * innerR;
      const iy = y + Math.sin(angle + 0.3) * innerR;
      gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.08 * pulse);
      gfx.beginPath();
      gfx.moveTo(ox, oy);
      gfx.lineTo(ix, iy);
      gfx.strokePath();
    }

    // 3-arm swirling vortex spiral (Phase 4)
    for (let arm = 0; arm < 3; arm++) {
      const baseAngle = (Math.PI * 2 / 3) * arm + this._time * 3;
      gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.25 * pulse);
      gfx.beginPath();
      for (let step = 0; step < 12; step++) {
        const t = step / 12;
        const spiralR = r * 0.3 + r * 1.5 * t;
        const spiralAngle = baseAngle + t * Math.PI * 1.5;
        const sx = x + Math.cos(spiralAngle) * spiralR;
        const sy = y + Math.sin(spiralAngle) * spiralR;
        if (step === 0) gfx.moveTo(sx, sy);
        else gfx.lineTo(sx, sy);
      }
      gfx.strokePath();
    }

    // Diamond body
    gfx.fillStyle(drawColor, 0.7 * pulse);
    gfx.fillTriangle(x, y - r, x - r, y, x + r, y);
    gfx.fillTriangle(x, y + r, x - r, y, x + r, y);
    gfx.lineStyle(2, drawColor, pulse);
    gfx.beginPath();
    gfx.moveTo(x, y - r);
    gfx.lineTo(x + r, y);
    gfx.lineTo(x, y + r);
    gfx.lineTo(x - r, y);
    gfx.closePath();
    gfx.strokePath();

    // Center glow
    gfx.fillStyle(0xffffff, 0.3 * pulse);
    gfx.fillCircle(x, y, 3);
  }

  // =============================================
  //  XP ORB (Phase 4: rotating diamond + orbiting sparkles)
  // =============================================
  _drawXPOrb(gfx, orb) {
    const x = orb.x;
    const y = orb.y;
    const r = orb.radius;
    const pulse = Math.sin(orb.elapsed / 200) * 0.3 + 0.7;

    // Glowing square
    gfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.6 * pulse);
    gfx.fillRect(x - r, y - r, r * 2, r * 2);

    // Rotating inner diamond (Phase 4)
    const dAngle = this._time * 4;
    const dR = r * 0.5;
    gfx.fillStyle(0xffffff, 0.4 * pulse);
    gfx.fillTriangle(
      x + Math.cos(dAngle) * dR, y + Math.sin(dAngle) * dR,
      x + Math.cos(dAngle + Math.PI / 2) * dR, y + Math.sin(dAngle + Math.PI / 2) * dR,
      x + Math.cos(dAngle + Math.PI) * dR, y + Math.sin(dAngle + Math.PI) * dR
    );
    gfx.fillTriangle(
      x + Math.cos(dAngle) * dR, y + Math.sin(dAngle) * dR,
      x + Math.cos(dAngle + Math.PI) * dR, y + Math.sin(dAngle + Math.PI) * dR,
      x + Math.cos(dAngle - Math.PI / 2) * dR, y + Math.sin(dAngle - Math.PI / 2) * dR
    );

    // 4 orbiting sparkle dots (Phase 4)
    for (let i = 0; i < 4; i++) {
      const sparkleAngle = (Math.PI / 2) * i + this._time * 5;
      const sparkleR = r * 2;
      const sx = x + Math.cos(sparkleAngle) * sparkleR;
      const sy = y + Math.sin(sparkleAngle) * sparkleR;
      gfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.5 * pulse);
      gfx.fillRect(sx - 1, sy - 1, 2, 2);
    }
  }

  // =============================================
  //  SHIELD DRONE
  // =============================================
  _drawShieldDrone(gfx, drone) {
    const x = drone.x;
    const y = drone.y;
    const r = drone.radius;

    // Link line to host
    if (drone.host && drone.host.alive) {
      gfx.lineStyle(1, CONFIG.SHIELD_DRONE_COLOR, 0.3);
      gfx.beginPath();
      gfx.moveTo(x, y);
      gfx.lineTo(drone.host.x, drone.host.y);
      gfx.strokePath();
    }

    const drawColor = drone.hitFlashTimer > 0 ? 0xffffff : CONFIG.SHIELD_DRONE_COLOR;

    // Diamond body
    gfx.fillStyle(drawColor, 0.8);
    gfx.fillTriangle(x, y - r, x - r, y, x + r, y);
    gfx.fillTriangle(x, y + r, x - r, y, x + r, y);
    gfx.lineStyle(1, drawColor, 1);
    gfx.beginPath();
    gfx.moveTo(x, y - r);
    gfx.lineTo(x + r, y);
    gfx.lineTo(x, y + r);
    gfx.lineTo(x - r, y);
    gfx.closePath();
    gfx.strokePath();
  }

  // =============================================
  //  LASER GATE (Phase 4: beam flicker + electric arcs)
  // =============================================
  _drawLaserGate(gfx, laserGate) {
    const a1 = laserGate.anchor1;
    const a2 = laserGate.anchor2;

    if (a1.alive) this._drawLaserAnchor(gfx, a1);
    if (a2.alive) this._drawLaserAnchor(gfx, a2);

    if (a1.alive && a2.alive) {
      const beamActive = laserGate.isBeamActive();
      if (beamActive) {
        // Beam flicker (Phase 4)
        const flicker = 0.7 + Math.random() * 0.3;

        // Wide red glow
        gfx.lineStyle(8, CONFIG.LASER_BEAM_COLOR, 0.15 * flicker);
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

        // Electric arc zigzags along beam (Phase 4)
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const segments = 8;
        gfx.lineStyle(1, 0xffffff, 0.5 * flicker);
        gfx.beginPath();
        gfx.moveTo(a1.x, a1.y);
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const bx = a1.x + dx * t;
          const by = a1.y + dy * t;
          // Perpendicular offset for zigzag
          const perpX = -dy;
          const perpY = dx;
          const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const offset = (Math.random() - 0.5) * 8;
          gfx.lineTo(bx + (perpX / len) * offset, by + (perpY / len) * offset);
        }
        gfx.strokePath();
      } else {
        // Faint dotted line when inactive
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dots = Math.floor(dist / 12);
        gfx.fillStyle(CONFIG.LASER_COLOR, 0.15);
        for (let i = 0; i <= dots; i++) {
          const t = i / dots;
          gfx.fillCircle(a1.x + dx * t, a1.y + dy * t, 1);
        }
      }
    }
  }

  _drawLaserAnchor(gfx, anchor) {
    const x = anchor.x;
    const y = anchor.y;
    const r = anchor.radius;
    const drawColor = anchor.hitFlashTimer > 0 ? 0xffffff : CONFIG.LASER_COLOR;

    // Square body
    gfx.fillStyle(drawColor, 0.7);
    gfx.fillRect(x - r, y - r, r * 2, r * 2);
    gfx.lineStyle(2, drawColor, 1);
    gfx.strokeRect(x - r, y - r, r * 2, r * 2);

    // HP dots
    for (let i = 0; i < anchor.hp; i++) {
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(x - 4 + i * 8, y, 2);
    }
  }

  // =============================================
  //  POWER-UP (Phase 4: rotating outer hex + sparkle ring)
  // =============================================
  _drawPowerUp(gfx, pu) {
    const x = pu.x;
    const y = pu.y;
    const r = pu.radius;
    const color = pu.getColor();

    // Blink when expiring
    const remaining = pu.lifetime - pu.elapsed;
    if (remaining < 2000 && Math.floor(remaining / 120) % 2 === 0) return;

    // Inner hexagon
    gfx.fillStyle(color, 0.7);
    gfx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.fillPath();

    // Slowly rotating outer hexagon (Phase 4)
    const outerR = r * 1.5;
    const rotAngle = this._time * 1.5;
    gfx.lineStyle(1, color, 0.5);
    gfx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6 + rotAngle;
      const px = x + Math.cos(angle) * outerR;
      const py = y + Math.sin(angle) * outerR;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.strokePath();

    // Sparkle particle ring (Phase 4)
    for (let i = 0; i < 6; i++) {
      const sparkAngle = (Math.PI / 3) * i + this._time * 3;
      const sparkR = r * 2;
      const sx = x + Math.cos(sparkAngle) * sparkR;
      const sy = y + Math.sin(sparkAngle) * sparkR;
      const sparkAlpha = 0.3 + Math.sin(this._time * 8 + i) * 0.2;
      gfx.fillStyle(color, sparkAlpha);
      gfx.fillRect(sx - 1, sy - 1, 2, 2);
    }

    // White center dot
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(x, y, 2);
  }

  destroy() {
    // No sprites to clean up
  }
}
