import { CONFIG } from '../config.js';
import { lerp } from '../utils/math.js';

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

export class EntityRenderer {
  constructor(scene) {
    this.scene = scene;
    this.gridOffset = 0;
    this._time = 0;
    this._initCircuitTraces();
    this._initScanBeams();
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
  //  CIRCUIT TRACES (data bus lines with junction nodes + bright packets)
  // =============================================
  _initCircuitTraces() {
    this._circuits = [];
    // Horizontal traces
    const hPositions = [60, 130, 200, 280, 350, 420, 480];
    for (const pos of hPositions) {
      this._circuits.push({
        horizontal: true,
        pos: pos + (Math.random() - 0.5) * 20,
        packets: [],
        packetTimer: Math.random() * 2,
        packetInterval: 0.8 + Math.random() * 1.5,
      });
    }
    // Vertical traces
    const vPositions = [80, 180, 300, 400, 520, 640, 720];
    for (const pos of vPositions) {
      this._circuits.push({
        horizontal: false,
        pos: pos + (Math.random() - 0.5) * 20,
        packets: [],
        packetTimer: Math.random() * 2,
        packetInterval: 0.8 + Math.random() * 1.5,
      });
    }
    // Build junction list (intersections of H and V traces)
    this._junctions = [];
    for (const h of this._circuits.filter(c => c.horizontal)) {
      for (const v of this._circuits.filter(c => !c.horizontal)) {
        this._junctions.push({ x: v.pos, y: h.pos, phase: Math.random() * TWO_PI });
      }
    }
  }

  _drawCircuitTraces(gfx, dt) {
    const t = this._time;

    for (const c of this._circuits) {
      // Draw trace line — visible green
      gfx.lineStyle(1, CONFIG.GRID_COLOR, 0.2);
      gfx.beginPath();
      if (c.horizontal) {
        gfx.moveTo(0, c.pos);
        gfx.lineTo(CONFIG.WIDTH, c.pos);
      } else {
        gfx.moveTo(c.pos, 0);
        gfx.lineTo(c.pos, CONFIG.HEIGHT);
      }
      gfx.strokePath();

      // Spawn packets more aggressively
      c.packetTimer -= dt;
      if (c.packetTimer <= 0) {
        c.packetTimer = c.packetInterval;
        const maxDim = c.horizontal ? CONFIG.WIDTH : CONFIG.HEIGHT;
        const dir = Math.random() > 0.5 ? 1 : -1;
        c.packets.push({
          t: dir > 0 ? -5 : maxDim + 5,
          speed: 80 + Math.random() * 120,
          dir,
          len: 8 + Math.random() * 16,
        });
      }

      // Update and draw packets — bright streaks
      for (let j = c.packets.length - 1; j >= 0; j--) {
        const p = c.packets[j];
        p.t += p.speed * p.dir * dt;
        const maxDim = c.horizontal ? CONFIG.WIDTH : CONFIG.HEIGHT;
        if (p.t < -30 || p.t > maxDim + 30) {
          c.packets.splice(j, 1);
          continue;
        }
        // Trail
        gfx.lineStyle(1, CONFIG.GRID_HIGHLIGHT, 0.35);
        gfx.beginPath();
        if (c.horizontal) {
          gfx.moveTo(p.t, c.pos);
          gfx.lineTo(p.t - p.len * p.dir, c.pos);
        } else {
          gfx.moveTo(c.pos, p.t);
          gfx.lineTo(c.pos, p.t - p.len * p.dir);
        }
        gfx.strokePath();
        // Bright head
        gfx.fillStyle(CONFIG.GRID_HIGHLIGHT, 0.7);
        if (c.horizontal) {
          gfx.fillRect(p.t - 2, c.pos - 1.5, 4, 3);
        } else {
          gfx.fillRect(c.pos - 1.5, p.t - 2, 3, 4);
        }
      }
    }

    // Junction nodes — pulsing diamonds at intersections
    for (const j of this._junctions) {
      j.phase += dt * 2;
      const pulse = 0.15 + Math.sin(j.phase) * 0.1;
      gfx.fillStyle(CONFIG.GRID_HIGHLIGHT, pulse);
      gfx.fillRect(j.x - 2, j.y - 2, 4, 4);
      // Tiny diamond outline
      gfx.lineStyle(1, CONFIG.GRID_HIGHLIGHT, pulse * 0.5);
      this._drawDiamond(gfx, j.x, j.y, 5, 5, 0);
      gfx.strokePath();
    }
  }

  // =============================================
  //  SCAN BEAMS (wide horizontal sweep lines)
  // =============================================
  _initScanBeams() {
    this._scanBeams = [
      { y: Math.random() * CONFIG.HEIGHT, speed: 25, width: 40 },
      { y: Math.random() * CONFIG.HEIGHT, speed: 15, width: 60 },
      { y: Math.random() * CONFIG.HEIGHT, speed: 35, width: 20 },
    ];
  }

  _drawScanBeams(gfx, dt) {
    for (const beam of this._scanBeams) {
      beam.y += beam.speed * dt;
      if (beam.y > CONFIG.HEIGHT + beam.width) beam.y = -beam.width;

      // Gradient band — multiple thin lines fading outward
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const offset = (i - steps / 2) * (beam.width / steps);
        const falloff = 1 - Math.abs(i - steps / 2) / (steps / 2);
        const a = falloff * falloff * 0.12;
        gfx.lineStyle(beam.width / steps, CONFIG.GRID_HIGHLIGHT, a);
        gfx.beginPath();
        gfx.moveTo(0, beam.y + offset);
        gfx.lineTo(CONFIG.WIDTH, beam.y + offset);
        gfx.strokePath();
      }

      // Bright core line
      gfx.lineStyle(1, CONFIG.GRID_HIGHLIGHT, 0.3);
      gfx.beginPath();
      gfx.moveTo(0, beam.y);
      gfx.lineTo(CONFIG.WIDTH, beam.y);
      gfx.strokePath();
    }
  }

  // =============================================
  //  HEX GRID (flat-top tessellation + pulsing highlights)
  // =============================================
  _drawHexGrid(gfx, dt, gameState) {
    this.gridOffset = (this.gridOffset + dt * 25) % 60;
    const w = CONFIG.WIDTH;
    const h = CONFIG.HEIGHT;
    const hexR = 24;
    const hexW = hexR * 2;
    const hexH = hexR * Math.sqrt(3);
    const t = this._time;

    // Zone-based grid tint
    const gridColor = (gameState && gameState._zoneTint) || CONFIG.GRID_COLOR;

    const cols = Math.ceil(w / (hexW * 0.75)) + 2;
    const rows = Math.ceil(h / hexH) + 2;
    const offsetY = this.gridOffset;
    let hexIndex = 0;

    for (let col = -1; col < cols; col++) {
      for (let row = -1; row < rows; row++) {
        const cx = col * hexW * 0.75;
        const cy = row * hexH + (col % 2 === 0 ? 0 : hexH * 0.5) - offsetY;

        if (cy < -hexR * 2 || cy > h + hexR * 2) continue;

        hexIndex++;

        // Every 7th hex gets a pulsing fill highlight
        if (hexIndex % 7 === 0) {
          const pulse = 0.03 + Math.sin(t * 1.5 + hexIndex * 0.3) * 0.02;
          gfx.fillStyle(gridColor, pulse);
          this._drawPolygon(gfx, cx, cy, 6, hexR, 0);
          gfx.fillPath();
        }

        // Outline — every 4th hex brighter
        const bright = hexIndex % 4 === 0;
        const alpha = bright ? 0.22 : 0.12;

        gfx.lineStyle(1, gridColor, alpha);
        this._drawPolygon(gfx, cx, cy, 6, hexR, 0);
        gfx.strokePath();
      }
    }
  }

  // =============================================
  //  VIGNETTE + TERMINAL FRAME
  // =============================================
  _drawTerminalFrame(gfx) {
    const w = CONFIG.WIDTH;
    const h = CONFIG.HEIGHT;

    // Dark vignette corners — layered rects
    const vigSize = 120;
    for (let i = 0; i < 5; i++) {
      const s = vigSize - i * 20;
      const a = 0.15 - i * 0.025;
      gfx.fillStyle(0x000000, a);
      // Top-left
      gfx.fillRect(0, 0, s, s);
      // Top-right
      gfx.fillRect(w - s, 0, s, s);
      // Bottom-left
      gfx.fillRect(0, h - s, s, s);
      // Bottom-right
      gfx.fillRect(w - s, h - s, s, s);
    }

    // Border frame — thin green lines
    gfx.lineStyle(1, CONFIG.GRID_HIGHLIGHT, 0.25);
    gfx.strokeRect(4, 4, w - 8, h - 8);
    gfx.lineStyle(1, CONFIG.GRID_HIGHLIGHT, 0.1);
    gfx.strokeRect(8, 8, w - 16, h - 16);

    // Corner brackets
    const bLen = 20;
    gfx.lineStyle(2, CONFIG.GRID_HIGHLIGHT, 0.4);
    // TL
    gfx.beginPath();
    gfx.moveTo(4, 4 + bLen); gfx.lineTo(4, 4); gfx.lineTo(4 + bLen, 4);
    gfx.strokePath();
    // TR
    gfx.beginPath();
    gfx.moveTo(w - 4 - bLen, 4); gfx.lineTo(w - 4, 4); gfx.lineTo(w - 4, 4 + bLen);
    gfx.strokePath();
    // BL
    gfx.beginPath();
    gfx.moveTo(4, h - 4 - bLen); gfx.lineTo(4, h - 4); gfx.lineTo(4 + bLen, h - 4);
    gfx.strokePath();
    // BR
    gfx.beginPath();
    gfx.moveTo(w - 4 - bLen, h - 4); gfx.lineTo(w - 4, h - 4); gfx.lineTo(w - 4, h - 4 - bLen);
    gfx.strokePath();
  }

  // =============================================
  //  DATA BOUNDARY (elaborate ground line)
  // =============================================
  _drawDataBoundary(gfx) {
    const gy = CONFIG.GROUND_Y + CONFIG.PLAYER_RADIUS;
    const w = CONFIG.WIDTH;
    const t = this._time;

    // Dark fill below ground with gradient bands
    for (let i = 0; i < 6; i++) {
      const bandY = gy + i * 15;
      const bandH = 15;
      const a = 0.4 - i * 0.06;
      gfx.fillStyle(0x050a05, a);
      gfx.fillRect(0, bandY, w, bandH);
    }

    // Scrolling data noise below ground — small dots
    gfx.fillStyle(CONFIG.GRID_COLOR, 0.15);
    const noiseOffset = (t * 40) % 8;
    for (let x = noiseOffset; x < w; x += 8) {
      for (let y = gy + 4; y < CONFIG.HEIGHT; y += 8) {
        if (((x * 7 + y * 13) | 0) % 5 === 0) {
          gfx.fillRect(x, y, 2, 2);
        }
      }
    }

    // Glow line above ground
    gfx.lineStyle(8, CONFIG.PLAYER_IMPACT, 0.08);
    gfx.beginPath();
    gfx.moveTo(0, gy);
    gfx.lineTo(w, gy);
    gfx.strokePath();

    // Main dashed line (8px on, 4px gap)
    gfx.lineStyle(2, CONFIG.PLAYER_IMPACT, 0.9);
    for (let x = 0; x < w; x += 12) {
      gfx.beginPath();
      gfx.moveTo(x, gy);
      gfx.lineTo(Math.min(x + 8, w), gy);
      gfx.strokePath();
    }

    // Tick marks every 40px — tall ones every 120px
    for (let x = 0; x < w; x += 40) {
      const tall = x % 120 === 0;
      const tickH = tall ? 6 : 3;
      const tickA = tall ? 0.5 : 0.25;
      gfx.lineStyle(1, CONFIG.PLAYER_IMPACT, tickA);
      gfx.beginPath();
      gfx.moveTo(x, gy - tickH);
      gfx.lineTo(x, gy + tickH);
      gfx.strokePath();
    }

    // Scrolling address markers below line
    gfx.fillStyle(CONFIG.GRID_COLOR, 0.2);
    const addrOffset = (t * 20) % 120;
    for (let x = -addrOffset; x < w; x += 120) {
      // Small bracket pair to suggest hex addresses
      gfx.fillRect(x, gy + 8, 2, 4);
      gfx.fillRect(x + 16, gy + 8, 2, 4);
      // Dots between
      for (let d = 0; d < 3; d++) {
        gfx.fillRect(x + 4 + d * 4, gy + 10, 2, 1);
      }
    }
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
      // Ghosted square afterimage
      gfx.fillStyle(ghost.color, ghost.alpha * 0.25);
      gfx.fillRect(ghost.x - s, ghost.y - s, s * 2, s * 2);
      gfx.lineStyle(1, ghost.color, ghost.alpha * 0.2);
      gfx.strokeRect(ghost.x - s, ghost.y - s, s * 2, s * 2);
    }
  }

  // =============================================
  //  GLOW LAYER (entity-shaped)
  // =============================================
  drawGlowLayer(glowGfx, player, entityManager) {
    glowGfx.clear();

    const drawCircularGlow = (x, y, color, baseRadius) => {
      glowGfx.fillStyle(color, 0.02);
      glowGfx.fillCircle(x, y, baseRadius * 4);
      glowGfx.fillStyle(color, 0.04);
      glowGfx.fillCircle(x, y, baseRadius * 3);
      glowGfx.fillStyle(color, 0.07);
      glowGfx.fillCircle(x, y, baseRadius * 2);
      glowGfx.fillStyle(color, 0.10);
      glowGfx.fillCircle(x, y, baseRadius * 1.2);
    };

    // Player — elliptical glow elongated in travel direction
    if (player.alive && !(player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0)) {
      const color = player.getColor();
      const r = CONFIG.PLAYER_RADIUS * 1.5;
      if (player.mode === 'falling') {
        for (let layer = 3; layer >= 0; layer--) {
          const scale = 4 - layer;
          const a = 0.02 + layer * 0.03;
          glowGfx.fillStyle(color, a);
          glowGfx.fillEllipse(player.x, player.y, r * scale * 1.4, r * scale * 2.2);
        }
      } else if (player.mode === 'flight') {
        for (let layer = 3; layer >= 0; layer--) {
          const scale = 4 - layer;
          const a = 0.02 + layer * 0.03;
          glowGfx.fillStyle(color, a);
          glowGfx.fillEllipse(player.x, player.y - r * 0.3, r * scale * 1.6, r * scale * 2.0);
        }
      } else {
        for (let layer = 3; layer >= 0; layer--) {
          const scale = 4 - layer;
          const a = 0.02 + layer * 0.03;
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

    this._drawCircuitTraces(gfx, dt);
    this._drawScanBeams(gfx, dt);
    this._drawHexGrid(gfx, dt, gameState);
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

    this._drawDataBoundary(gfx);
    this._drawTerminalFrame(gfx);
  }

  // =============================================
  //  PLAYER — "Terminal Cursor"
  // =============================================
  _drawPlayer(gfx, player) {
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0) return;

    const x = player.x;
    const y = player.y;
    const s = CONFIG.PLAYER_WIDTH / 2;
    const color = player.getColor();
    const t = this._time;

    // --- Outer scanning square (rotates slowly) ---
    const scanRot = t * 0.8;
    const scanS = s * 2.2;
    gfx.lineStyle(1, color, 0.2);
    gfx.save && gfx.save();
    // Draw rotated square manually
    for (let i = 0; i < 4; i++) {
      const a1 = scanRot + (HALF_PI * i);
      const a2 = scanRot + (HALF_PI * (i + 1));
      gfx.beginPath();
      gfx.moveTo(x + Math.cos(a1) * scanS, y + Math.sin(a1) * scanS);
      gfx.lineTo(x + Math.cos(a2) * scanS, y + Math.sin(a2) * scanS);
      gfx.strokePath();
    }

    // --- Shield indicator ---
    if (player.shieldActive) {
      const pulse = Math.sin(t * 6.5) * 0.15 + 0.35;
      gfx.lineStyle(2, 0x33aa66, pulse);
      gfx.strokeRect(x - s * 2.5, y - s * 2.5, s * 5, s * 5);
    }

    // --- Main body: mode-dependent shape ---
    if (player.mode === 'flight') {
      // FLIGHT: Upward-pointing arrow/caret [ ^ ] with data lines
      const hw = s * 1.2;
      const hh = s * 1.8;

      // Filled arrow body
      gfx.fillStyle(color, 0.45);
      gfx.beginPath();
      gfx.moveTo(x, y - hh);           // tip
      gfx.lineTo(x + hw, y + hh * 0.3); // right
      gfx.lineTo(x + hw * 0.3, y);      // right notch
      gfx.lineTo(x - hw * 0.3, y);      // left notch
      gfx.lineTo(x - hw, y + hh * 0.3); // left
      gfx.closePath();
      gfx.fillPath();

      // Outline
      gfx.lineStyle(2, color, 0.9);
      gfx.beginPath();
      gfx.moveTo(x, y - hh);
      gfx.lineTo(x + hw, y + hh * 0.3);
      gfx.lineTo(x + hw * 0.3, y);
      gfx.lineTo(x - hw * 0.3, y);
      gfx.lineTo(x - hw, y + hh * 0.3);
      gfx.closePath();
      gfx.strokePath();

      // Exhaust data streams below
      const flicker = Math.sin(t * 20) * 0.3 + 0.6;
      for (let i = 0; i < 5; i++) {
        const exLen = 6 + Math.random() * 14;
        const exX = x - 6 + i * 3;
        gfx.lineStyle(1, color, flicker * (0.3 + Math.random() * 0.4));
        gfx.beginPath();
        gfx.moveTo(exX, y + 2);
        gfx.lineTo(exX + (Math.random() - 0.5) * 3, y + 2 + exLen);
        gfx.strokePath();
      }

    } else if (player.mode === 'falling') {
      // FALLING: Downward arrow with speed glitch lines
      const hw = s * 1.4;
      const hh = s * 1.6;

      gfx.fillStyle(color, 0.5);
      gfx.beginPath();
      gfx.moveTo(x, y + hh);             // tip (pointing down)
      gfx.lineTo(x + hw, y - hh * 0.4);
      gfx.lineTo(x + hw * 0.25, y - hh * 0.1);
      gfx.lineTo(x - hw * 0.25, y - hh * 0.1);
      gfx.lineTo(x - hw, y - hh * 0.4);
      gfx.closePath();
      gfx.fillPath();

      gfx.lineStyle(2, color, 0.9);
      gfx.beginPath();
      gfx.moveTo(x, y + hh);
      gfx.lineTo(x + hw, y - hh * 0.4);
      gfx.lineTo(x + hw * 0.25, y - hh * 0.1);
      gfx.lineTo(x - hw * 0.25, y - hh * 0.1);
      gfx.lineTo(x - hw, y - hh * 0.4);
      gfx.closePath();
      gfx.strokePath();

      // Glitch speed lines streaming up
      for (let i = 0; i < 6; i++) {
        const sx = x + (i - 2.5) * 5;
        const sLen = 8 + Math.random() * 12;
        gfx.lineStyle(1, color, 0.3 + Math.random() * 0.3);
        gfx.beginPath();
        gfx.moveTo(sx, y - hh * 0.4);
        gfx.lineTo(sx + (Math.random() - 0.5) * 4, y - hh * 0.4 - sLen);
        gfx.strokePath();
      }

    } else {
      // IMPACT: Flat wide bracket shape [ ═══ ] grounded
      const hw = s * 2.0;
      const hh = s * 0.8;

      // Filled body
      gfx.fillStyle(color, 0.5);
      gfx.fillRect(x - hw, y - hh, hw * 2, hh * 2);
      gfx.lineStyle(2, color, 0.9);
      gfx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);

      // Internal data lines
      gfx.lineStyle(1, color, 0.3);
      gfx.beginPath();
      gfx.moveTo(x - hw + 3, y);
      gfx.lineTo(x + hw - 3, y);
      gfx.strokePath();

      // Corner brackets (outer)
      const bk = 6;
      gfx.lineStyle(2, color, 0.6);
      // TL
      gfx.beginPath();
      gfx.moveTo(x - hw - 3, y - hh - 3); gfx.lineTo(x - hw - 3, y - hh + bk);
      gfx.moveTo(x - hw - 3, y - hh - 3); gfx.lineTo(x - hw + bk, y - hh - 3);
      gfx.strokePath();
      // TR
      gfx.beginPath();
      gfx.moveTo(x + hw + 3, y - hh - 3); gfx.lineTo(x + hw + 3, y - hh + bk);
      gfx.moveTo(x + hw + 3, y - hh - 3); gfx.lineTo(x + hw - bk, y - hh - 3);
      gfx.strokePath();
      // BL
      gfx.beginPath();
      gfx.moveTo(x - hw - 3, y + hh + 3); gfx.lineTo(x - hw - 3, y + hh - bk);
      gfx.moveTo(x - hw - 3, y + hh + 3); gfx.lineTo(x - hw + bk, y + hh + 3);
      gfx.strokePath();
      // BR
      gfx.beginPath();
      gfx.moveTo(x + hw + 3, y + hh + 3); gfx.lineTo(x + hw + 3, y + hh - bk);
      gfx.moveTo(x + hw + 3, y + hh + 3); gfx.lineTo(x + hw - bk, y + hh + 3);
      gfx.strokePath();
    }

    // --- Blinking cursor core ---
    const blink = Math.sin(t * 6) > 0 ? 0.9 : 0.3;
    gfx.fillStyle(0xffffff, blink);
    gfx.fillRect(x - 2, y - 2, 4, 4);

    // --- Flight meter bar ---
    const meterW = 30;
    const meterH = 3;
    const meterX = x - meterW / 2;
    const meterY = player.mode === 'impact' ? y - s * 1.5 - 8 : y + s * 1.5 + 4;
    const fill = player.flightMeter / CONFIG.FLIGHT_METER_MAX;
    gfx.fillStyle(0x1a1a1a, 0.6);
    gfx.fillRect(meterX, meterY, meterW, meterH);
    gfx.fillStyle(CONFIG.PLAYER_FLIGHT, 0.8);
    gfx.fillRect(meterX, meterY, meterW * fill, meterH);
  }

  // =============================================
  //  ENERGY BURST — "Data Packet"
  // =============================================
  _drawBurst(gfx, burst) {
    const bx = lerp(burst.prevX, burst.x, 0.5);
    const by = lerp(burst.prevY, burst.y, 0.5);
    const r = burst.radius;

    // Trail line
    gfx.lineStyle(2, CONFIG.BURST_COLOR, 0.4);
    gfx.beginPath();
    gfx.moveTo(burst.prevX, burst.prevY);
    gfx.lineTo(bx, by);
    gfx.strokePath();

    // Bright rectangular data packet
    gfx.fillStyle(CONFIG.BURST_COLOR, 0.8);
    gfx.fillRect(bx - r * 0.6, by - r * 1.5, r * 1.2, r * 3);
    gfx.lineStyle(1, CONFIG.BURST_COLOR, 1);
    gfx.strokeRect(bx - r * 0.6, by - r * 1.5, r * 1.2, r * 3);

    // White center line
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillRect(bx - 1, by - r, 2, r * 2);
  }

  // =============================================
  //  DATA BLOCKER — "Firewall Barrier"
  // =============================================
  _drawBlocker(gfx, blocker) {
    const x = blocker.x;
    const y = blocker.y;
    const hw = blocker.width / 2;
    const hh = blocker.height / 2;
    const drawColor = blocker.hitFlashTimer > 0 ? 0xffffff : CONFIG.BLOCKER_COLOR;
    const t = this._time;

    // --- Solid rectangular body (terminal window) ---
    gfx.fillStyle(drawColor, 0.15);
    gfx.fillRect(x - hw, y - hh, hw * 2, hh * 2);

    // Double border (inner bright, outer dim)
    gfx.lineStyle(2, drawColor, 0.9);
    gfx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
    gfx.lineStyle(1, drawColor, 0.3);
    gfx.strokeRect(x - hw - 3, y - hh - 3, hw * 2 + 6, hh * 2 + 6);

    // --- Title bar line across top ---
    gfx.lineStyle(1, drawColor, 0.6);
    gfx.beginPath();
    gfx.moveTo(x - hw + 1, y - hh + 5);
    gfx.lineTo(x + hw - 1, y - hh + 5);
    gfx.strokePath();

    // X close button in top-right
    gfx.lineStyle(1, 0xffffff, 0.5);
    gfx.beginPath();
    gfx.moveTo(x + hw - 6, y - hh + 1); gfx.lineTo(x + hw - 2, y - hh + 4);
    gfx.moveTo(x + hw - 2, y - hh + 1); gfx.lineTo(x + hw - 6, y - hh + 4);
    gfx.strokePath();

    // --- Scrolling binary data inside ---
    const scrollOff = (t * 50) % 10;
    gfx.fillStyle(drawColor, 0.4);
    for (let dx = x - hw + 3 + scrollOff; dx < x + hw - 3; dx += 10) {
      const dotY1 = y - hh + 7;
      const dotY2 = y;
      gfx.fillRect(dx, dotY1, 3, 1);
      gfx.fillRect(dx + 4, dotY2, 2, 1);
    }

    // --- HP pips as small squares ---
    const pipSpacing = 8;
    const pipStartX = x - ((blocker.hp - 1) * pipSpacing) / 2;
    for (let i = 0; i < blocker.hp; i++) {
      const px = pipStartX + i * pipSpacing;
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillRect(px - 2, y + hh - 4, 4, 3);
    }

    // --- Warning stripe dashes along bottom edge ---
    const stripePhase = (t * 40) % 16;
    gfx.lineStyle(1, drawColor, 0.3);
    for (let sx = x - hw + stripePhase; sx < x + hw; sx += 16) {
      gfx.beginPath();
      gfx.moveTo(sx, y + hh);
      gfx.lineTo(Math.min(sx + 8, x + hw), y + hh);
      gfx.strokePath();
    }
  }

  // =============================================
  //  CHASER BOT — "Malware Process"
  // =============================================
  _drawChaser(gfx, chaser, player) {
    const x = chaser.x;
    const y = chaser.y;
    const r = chaser.radius;
    const drawColor = chaser.hitFlashTimer > 0 ? 0xffffff : CONFIG.CHASER_COLOR;
    const t = this._time;

    // --- Danger scan cone toward player ---
    if (player && player.alive && player.mode !== 'flight') {
      const dx = player.x - x;
      const dy = player.y - y;
      const angle = Math.atan2(dy, dx);
      const scanR = r * 3.5;
      gfx.fillStyle(drawColor, 0.06);
      gfx.beginPath();
      gfx.moveTo(x, y);
      for (let a = -0.4; a <= 0.4; a += 0.08) {
        gfx.lineTo(x + Math.cos(angle + a) * scanR, y + Math.sin(angle + a) * scanR);
      }
      gfx.closePath();
      gfx.fillPath();
    }

    // --- Warning triangle body ---
    const triH = r * 2.2;
    const triW = r * 1.6;
    gfx.fillStyle(drawColor, 0.5);
    gfx.beginPath();
    gfx.moveTo(x, y - triH * 0.5);        // top
    gfx.lineTo(x + triW, y + triH * 0.5);  // bottom-right
    gfx.lineTo(x - triW, y + triH * 0.5);  // bottom-left
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, drawColor, 0.9);
    gfx.beginPath();
    gfx.moveTo(x, y - triH * 0.5);
    gfx.lineTo(x + triW, y + triH * 0.5);
    gfx.lineTo(x - triW, y + triH * 0.5);
    gfx.closePath();
    gfx.strokePath();

    // Inner triangle outline
    gfx.lineStyle(1, drawColor, 0.3);
    const inset = 0.7;
    gfx.beginPath();
    gfx.moveTo(x, y - triH * 0.5 * inset + 2);
    gfx.lineTo(x + triW * inset, y + triH * 0.5 * inset);
    gfx.lineTo(x - triW * inset, y + triH * 0.5 * inset);
    gfx.closePath();
    gfx.strokePath();

    // --- Exclamation mark ( ! ) inside ---
    const blink = Math.sin(t * 8) > -0.3 ? 0.9 : 0.2;
    gfx.fillStyle(0xffffff, blink);
    gfx.fillRect(x - 1, y - r * 0.6, 3, r * 0.7);  // bar
    gfx.fillRect(x - 1, y + r * 0.3, 3, 3);          // dot

    // --- Glitch offset lines (horizontal displacement) ---
    const glitchActive = Math.sin(t * 7 + x * 0.1) > 0.7;
    if (glitchActive) {
      const offset = (Math.random() - 0.5) * 6;
      gfx.lineStyle(2, drawColor, 0.6);
      gfx.beginPath();
      gfx.moveTo(x - triW + offset, y + Math.random() * triH - triH * 0.3);
      gfx.lineTo(x + triW + offset, y + Math.random() * triH - triH * 0.3);
      gfx.strokePath();
    }
  }

  // =============================================
  //  GRAVITY FLARE — "Corrupted Node"
  // =============================================
  _drawFlare(gfx, flare) {
    const x = flare.x;
    const y = flare.y;
    const r = flare.radius;
    const pulse = Math.sin(flare.pulsePhase) * 0.2 + 0.8;
    const drawColor = flare.hitFlashTimer > 0 ? 0xffffff : CONFIG.FLARE_COLOR;
    const t = this._time;

    // --- Pull radius: rotating dashed squares ---
    gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.1 * pulse);
    const pr = flare.pullRadius;
    for (let i = 0; i < 4; i++) {
      const a = t * 0.3 + HALF_PI * i;
      const na = a + HALF_PI;
      gfx.beginPath();
      gfx.moveTo(x + Math.cos(a) * pr * 0.9, y + Math.sin(a) * pr * 0.9);
      gfx.lineTo(x + Math.cos(na) * pr * 0.9, y + Math.sin(na) * pr * 0.9);
      gfx.strokePath();
    }
    // Outer pull ring
    gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.06 * pulse);
    gfx.strokeCircle(x, y, pr);

    // --- Orbiting corrupted data fragments ---
    for (let i = 0; i < 6; i++) {
      const orbitAngle = (TWO_PI / 6) * i + t * 2.5;
      const orbitR = r * 2.5 + Math.sin(t * 2 + i) * 5;
      const fx = x + Math.cos(orbitAngle) * orbitR;
      const fy = y + Math.sin(orbitAngle) * orbitR;
      gfx.fillStyle(CONFIG.FLARE_COLOR, 0.5 * pulse);
      gfx.fillRect(fx - 2, fy - 1, 4, 2);
    }

    // --- Concentric rotating squares (core) ---
    for (let ring = 2; ring >= 0; ring--) {
      const ringR = r * (0.6 + ring * 0.4);
      const ringRot = t * (3 - ring) * (ring % 2 === 0 ? 1 : -1);
      const ringAlpha = (0.3 + ring * 0.15) * pulse;
      gfx.lineStyle(ring === 0 ? 2 : 1, drawColor, ringAlpha);
      this._drawPolygon(gfx, x, y, 4, ringR, ringRot);
      gfx.strokePath();
    }

    // Inner filled square
    gfx.fillStyle(drawColor, 0.4 * pulse);
    this._drawPolygon(gfx, x, y, 4, r * 0.5, t * 3);
    gfx.fillPath();

    // --- Corruption glitch: random offset lines ---
    if (Math.sin(t * 5) > 0.5) {
      const glitchY = y + (Math.random() - 0.5) * r * 2;
      gfx.lineStyle(2, drawColor, 0.5 * pulse);
      gfx.beginPath();
      gfx.moveTo(x - r * 1.5, glitchY);
      gfx.lineTo(x + r * 1.5, glitchY);
      gfx.strokePath();
    }

    // --- Center eye/dot ---
    const eyePulse = 0.5 + Math.sin(t * 8) * 0.4;
    gfx.fillStyle(0xffffff, eyePulse * pulse);
    gfx.fillCircle(x, y, 2.5);
  }

  // =============================================
  //  XP ORB — "Data Bit"
  // =============================================
  _drawXPOrb(gfx, orb) {
    const x = orb.x;
    const y = orb.y;
    const r = orb.radius;
    const pulse = Math.sin(orb.elapsed / 200) * 0.3 + 0.7;
    const t = this._time;
    const magnetized = orb.magnetized || false;

    // --- Rotating outer bracket ring ---
    const bracketR = r * 2.0;
    const bracketRot = t * (magnetized ? 6 : 2);
    gfx.lineStyle(1, CONFIG.XP_ORB_COLOR, 0.4 * pulse);
    for (let i = 0; i < 4; i++) {
      const a = bracketRot + HALF_PI * i;
      const bx = x + Math.cos(a) * bracketR;
      const by = y + Math.sin(a) * bracketR;
      gfx.beginPath();
      gfx.moveTo(bx - 2, by - 2);
      gfx.lineTo(bx + 2, by - 2);
      gfx.lineTo(bx + 2, by + 2);
      gfx.strokePath();
    }

    // --- Main body: bright filled square ---
    gfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.6 * pulse);
    gfx.fillRect(x - r, y - r, r * 2, r * 2);
    gfx.lineStyle(1, CONFIG.XP_ORB_COLOR, 0.9 * pulse);
    gfx.strokeRect(x - r, y - r, r * 2, r * 2);

    // --- Pixel cluster: 4 satellite dots ---
    const dotOff = r * 1.4;
    gfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.5 * pulse);
    gfx.fillRect(x - dotOff - 1, y - 1, 2, 2);
    gfx.fillRect(x + dotOff - 1, y - 1, 2, 2);
    gfx.fillRect(x - 1, y - dotOff - 1, 2, 2);
    gfx.fillRect(x - 1, y + dotOff - 1, 2, 2);

    // --- White center pixel ---
    const blink = Math.sin(t * 10) > 0 ? 0.9 : 0.4;
    gfx.fillStyle(0xffffff, blink * pulse);
    gfx.fillRect(x - 1, y - 1, 3, 3);

    // --- When magnetized: streaks toward player ---
    if (magnetized) {
      gfx.lineStyle(1, CONFIG.XP_ORB_COLOR, 0.5);
      for (let i = 0; i < 3; i++) {
        const streakAngle = -HALF_PI + (i - 1) * 0.25;
        const len = r * 2.5 + Math.random() * r;
        gfx.beginPath();
        gfx.moveTo(x, y);
        gfx.lineTo(x + Math.cos(streakAngle) * len, y + Math.sin(streakAngle) * len);
        gfx.strokePath();
      }
    }
  }

  // =============================================
  //  SHIELD DRONE — "Proxy Sentry"
  // =============================================
  _drawShieldDrone(gfx, drone) {
    const x = drone.x;
    const y = drone.y;
    const r = drone.radius;
    const drawColor = drone.hitFlashTimer > 0 ? 0xffffff : CONFIG.SHIELD_DRONE_COLOR;
    const t = this._time;

    // --- Tether line to host ---
    if (drone.host && drone.host.alive) {
      const hx = drone.host.x;
      const hy = drone.host.y;
      const dx = hx - x;
      const dy = hy - y;
      // Dashed tether
      gfx.lineStyle(1, CONFIG.SHIELD_DRONE_COLOR, 0.2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const segs = Math.floor(dist / 8);
      for (let i = 0; i < segs; i += 2) {
        const t1 = i / segs;
        const t2 = Math.min((i + 1) / segs, 1);
        gfx.beginPath();
        gfx.moveTo(x + dx * t1, y + dy * t1);
        gfx.lineTo(x + dx * t2, y + dy * t2);
        gfx.strokePath();
      }
    }

    // --- Rotating square frame ---
    const rot = t * 1.5;
    gfx.lineStyle(1, drawColor, 0.5);
    this._drawPolygon(gfx, x, y, 4, r * 1.6, rot);
    gfx.strokePath();

    // --- Filled inner square ---
    gfx.fillStyle(drawColor, 0.5);
    gfx.fillRect(x - r, y - r, r * 2, r * 2);
    gfx.lineStyle(1, drawColor, 0.8);
    gfx.strokeRect(x - r, y - r, r * 2, r * 2);

    // --- Center dot ---
    gfx.fillStyle(0xffffff, 0.7);
    gfx.fillRect(x - 1, y - 1, 2, 2);
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

    // --- Square body ---
    gfx.fillStyle(drawColor, 0.5);
    gfx.fillRect(x - r, y - r, r * 2, r * 2);
    gfx.lineStyle(2, drawColor, 0.9);
    gfx.strokeRect(x - r, y - r, r * 2, r * 2);

    // --- Inner rotating square ---
    gfx.lineStyle(1, drawColor, 0.4);
    this._drawPolygon(gfx, x, y, 4, r * 0.6, t * 1.5);
    gfx.strokePath();

    // --- HP pips as small squares ---
    const pipSpacing = 6;
    const pipStartX = x - ((anchor.hp - 1) * pipSpacing) / 2;
    for (let i = 0; i < anchor.hp; i++) {
      const px = pipStartX + i * pipSpacing;
      gfx.fillStyle(0xffffff, 0.85);
      gfx.fillRect(px - 2, y - 1, 4, 2);
    }

    // --- Beam emitter dot toward partner ---
    if (otherAnchor && otherAnchor.alive) {
      const dx = otherAnchor.x - x;
      const dy = otherAnchor.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const emitX = x + (dx / dist) * r;
      const emitY = y + (dy / dist) * r;
      const emitPulse = 0.5 + Math.sin(t * 6) * 0.3;
      gfx.fillStyle(CONFIG.LASER_BEAM_COLOR, emitPulse);
      gfx.fillRect(emitX - 2, emitY - 2, 4, 4);
    }
  }

  // =============================================
  //  POWER-UP — "System Patch"
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

    // --- Pulsing outer square ---
    const pulseR = r * 2.2 + Math.sin(t * 3) * r * 0.4;
    const pulseAlpha = expiring ? (0.3 + Math.sin(t * 12) * 0.3) : 0.25;
    gfx.lineStyle(1, color, pulseAlpha);
    gfx.strokeRect(x - pulseR, y - pulseR, pulseR * 2, pulseR * 2);

    // --- Corner dots ---
    gfx.fillStyle(color, 0.5);
    const cd = r * 1.6;
    gfx.fillRect(x - cd - 1, y - cd - 1, 2, 2);
    gfx.fillRect(x + cd - 1, y - cd - 1, 2, 2);
    gfx.fillRect(x - cd - 1, y + cd - 1, 2, 2);
    gfx.fillRect(x + cd - 1, y + cd - 1, 2, 2);

    // --- Main square body ---
    gfx.fillStyle(color, 0.5);
    gfx.fillRect(x - r, y - r, r * 2, r * 2);
    gfx.lineStyle(2, color, 0.9);
    gfx.strokeRect(x - r, y - r, r * 2, r * 2);

    // --- Type-specific icon (white, simple) ---
    gfx.lineStyle(1.5, 0xffffff, 0.8);
    const ir = r * 0.4;
    switch (pu.powerType) {
      case 'FLIGHT_RECHARGE':
        gfx.beginPath();
        gfx.moveTo(x, y - ir); gfx.lineTo(x, y + ir);
        gfx.moveTo(x - ir * 0.6, y - ir * 0.3);
        gfx.lineTo(x, y - ir); gfx.lineTo(x + ir * 0.6, y - ir * 0.3);
        gfx.strokePath();
        break;
      case 'SCORE_BOOST':
        gfx.strokeRect(x - ir, y - ir, ir * 2, ir * 2);
        break;
      case 'SHIELD':
        gfx.beginPath();
        gfx.moveTo(x - ir, y); gfx.lineTo(x + ir, y);
        gfx.moveTo(x, y - ir); gfx.lineTo(x, y + ir);
        gfx.strokePath();
        break;
      case 'SLAM_PLUS':
        gfx.beginPath();
        gfx.moveTo(x, y + ir); gfx.lineTo(x, y - ir);
        gfx.moveTo(x - ir * 0.6, y + ir * 0.3);
        gfx.lineTo(x, y + ir); gfx.lineTo(x + ir * 0.6, y + ir * 0.3);
        gfx.strokePath();
        break;
    }
  }

  destroy() {
    // No sprites to clean up
  }
}
