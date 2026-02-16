# Vector Drift Implementation Plan

> **For Claude:** Execute this plan using `/superbuild` skill.
> Each phase includes Definition of Done criteria that must pass before proceeding.

> Generated: 2026-02-15
> Status: Complete (all phases done)
> Author: Claude (Superplan)
> Last Updated: 2026-02-15

**Goal:** Reshape the action/arcade game boilerplate into Vector Drift — a kinetic survival (bullet heaven) game where players toggle between Flight Mode (hold = float, intangible, fire projectiles) and Impact Mode (release = plummet, slam enemies, slide on ground).

**Architecture:** Vertical auto-scrolling arena with dual-state player physics. All Graphics API rendering with neon voxel aesthetic on synthwave grid. Hold/release input replaces WASD+fire. Three enemy types spawn from top of screen in a vertical trench layout.

**Tech Stack:** Phaser 3.87 + Vite 6 + Capacitor 8 + ES6 modules + Web Audio API

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Requirements](#requirements)
4. [Architecture](#architecture)
5. [Implementation Phases](#implementation-phases)
6. [Assumptions & Known Unknowns](#assumptions--known-unknowns)
7. [Appendix](#appendix)

---

## Executive Summary

### One-Line Summary
Reshape the arena shooter boilerplate into Vector Drift — a vertical kinetic survival game with a gravity-toggle core mechanic.

### Goals
- [x] **Primary Goal**: Playable Vector Drift with Flight/Impact toggle, 3 enemy types, XP orbs, and difficulty ramp
- [x] **Secondary Goal**: Neon voxel aesthetic with synthwave grid, fully rendered via Graphics API
- [x] **Success Metric**: `npm run dev` launches Vector Drift; hold/release input works on desktop and mobile

### Non-Goals (Explicitly Out of Scope)
- XP/upgrade selection system (deferred to v2)
- Sprite-based rendering (all Graphics API for v1)
- Backend/leaderboards
- Sound replacement (keep existing placeholder sounds)
- Test suite (no test framework in boilerplate)

### Key Decisions Made

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| MVP = Core mechanics only, no upgrades | Dev scope 3/10; upgrades add complexity without validating the core loop | Full upgrade system, simplified auto-upgrades |
| Auto-scroll upward | Simpler than player-driven vertical; camera scrolls, player controls X only | Player-driven vertical, fixed arena |
| Auto-bounce on impact | Continuous loop (hold→fly→release→slam→slide→hold→fly) keeps flow state | Momentum slide, charge-and-launch |
| All Graphics API rendering | Matches "voxel" aesthetic with 2D blocky shapes; no asset pipeline needed | Sprites, mixed approach |
| XP orbs = score mechanism | Orbs replace direct kill scoring; magnetized collection in Impact mode | Direct kill score, combo system |

### Phase Overview (with Poker Estimates)

| Phase | Name | Depends On | Parallel With | Estimate | Status |
|-------|------|------------|---------------|----------|--------|
| 1 | Foundation & Config | - | - | 3 | ✅ |
| 2A | Player & Entities | 1 | 2B, 2C | 8 | ✅ |
| 2B | Input & Game Systems | 1 | 2A, 2C | 5 | ✅ |
| 2C | Rendering & Effects | 1 | 2A, 2B | 5 | ✅ |
| 3 | Scenes, HUD, Mobile & Polish | 2A, 2B, 2C | - | 5 | ✅ |

**Total Estimate**: 26 points

**Legend**: ⬜ Not Started | 🔄 In Progress | ✅ Complete | ⏸️ Blocked | ⏭️ Skipped

**PARALLEL EXECUTION**: Phases 2A, 2B, 2C MUST be executed using parallel sub-agents.

---

## Technology Stack (Detected)

### Languages
- **Primary**: JavaScript (ES6 modules)

### Frameworks
| Framework | Version | Purpose |
|-----------|---------|---------|
| Phaser | 3.87.0 | Game engine (WebGL) |
| Vite | 6.x | Bundler (multi-entry) |
| Capacitor | 8.x | Mobile (iOS/Android) |
| Electron | 33.x | Desktop |

### Quality Tools Status

| Tool Type | Status | Config File | Command |
|-----------|--------|-------------|---------|
| Linter | ❌ | N/A | N/A |
| Formatter | ❌ | N/A | N/A |
| Type Checker | ❌ | N/A (plain JS) | N/A |
| Test Framework | ❌ | N/A | N/A |

### Bootstrap Required?
- [ ] **No** — This is a game boilerplate; quality tools are out of scope for this reshape. Validation is manual (`npm run dev` + play).

---

## Requirements

### Original Concept

```
Vector Drift — Kinetic Survival (Bullet Heaven)
- Camera: Top-down vertical, endless upward scrolling
- Core Mechanic: Hold = Flight Mode (float up, intangible, fire projectiles)
                 Release = Impact Mode (plummet to floor, slam enemies, slide)
- Enemies: Data Blockers, Chaser Bots, Gravity Flares
- Visual: Retro Arcade Voxel — neon pinks, cyans, purples on synthwave grid
- Dev Scope: 3/10
```

### Acceptance Criteria

- [ ] **AC-1**: Holding Space/touch engages Flight Mode — player floats upward, is intangible, fires energy bursts downward automatically
- [ ] **AC-2**: Releasing Space/touch engages Impact Mode — player plummets to ground level, damages enemies on slam, slides horizontally
- [ ] **AC-3**: Three enemy types spawn: Data Blockers (floating obstacles), Chaser Bots (ground pursuers), Gravity Flares (pull player down)
- [ ] **AC-4**: XP Orbs drop from killed enemies and are collected for scoring
- [ ] **AC-5**: Camera auto-scrolls upward at increasing speed; world wraps/regenerates
- [ ] **AC-6**: All rendering uses Graphics API with neon voxel aesthetic (no sprites)
- [ ] **AC-7**: Synthwave grid background scrolls with the camera
- [ ] **AC-8**: Mobile touch: hold anywhere = Flight, release = Impact; horizontal swipe/tilt for X movement
- [ ] **AC-9**: Difficulty ramps over time (more enemies, faster scroll, new types unlock)
- [ ] **AC-10**: Game over when health reaches 0; high score persists

### Clarifications from Interview

| Question | Answer | Implication |
|----------|--------|-------------|
| MVP scope? | Core mechanics only, defer upgrades | No upgrade UI, no Flight Durability/Impact Mass stats |
| Scroll type? | Auto-scroll upward | Camera moves up constantly; player controls X position only |
| Impact mechanic? | Auto-bounce | Release → slam → slide → hold again to fly. Continuous loop. |
| Visual approach? | All Graphics API | No sprite assets needed; blocky geometric shapes with neon glow |

---

## Architecture

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    VECTOR DRIFT — GAME LOOP                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT (Hold/Release)                                           │
│     │                                                           │
│     ▼                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ InputSystem  │───▶│    Player    │───▶│  Collision   │      │
│  │ (hold/release│    │ (Flight or  │    │  System      │      │
│  │  + X-axis)  │    │  Impact)    │    │ (state-aware)│      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│                                                  │              │
│  ┌──────────────┐    ┌──────────────┐           │              │
│  │ SpawnSystem  │───▶│ EntityMgr   │◀──────────┘              │
│  │ (top-spawn,  │    │ (blockers,  │                           │
│  │  vertical)   │    │  chasers,   │                           │
│  └──────────────┘    │  flares,    │                           │
│                      │  xpOrbs)    │                           │
│  ┌──────────────┐    └──────┬───────┘                           │
│  │  Difficulty  │           │                                   │
│  │  (time-based │           ▼                                   │
│  │   ramp)      │    ┌──────────────┐    ┌──────────────┐      │
│  └──────────────┘    │ Renderer    │    │     HUD      │      │
│                      │ (Graphics   │    │ (flight meter│      │
│  ┌──────────────┐    │  API, neon  │    │  score, mode)│      │
│  │   Camera     │    │  voxel)     │    └──────────────┘      │
│  │ (auto-scroll │    └──────────────┘                           │
│  │  upward)     │                                               │
│  └──────────────┘    ┌──────────────┐                           │
│                      │   Effects   │                           │
│                      │ (slam FX,   │                           │
│                      │  particles) │                           │
│                      └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Player State Machine

```
                    ┌─────────────────────┐
                    │                     │
        HOLD ──────▶│   FLIGHT MODE       │
        (Space/     │   • Intangible      │
         Touch)     │   • Float upward    │
                    │   • Auto-fire down  │
                    │   • Move X freely   │
                    │   • Flight meter    │
                    │     depletes        │
                    └─────────┬───────────┘
                              │
                     RELEASE  │  (or meter depleted)
                              │
                              ▼
                    ┌─────────────────────┐
                    │                     │
                    │   FALLING           │
                    │   • Accelerate down │
                    │   • Still move X    │
                    │   • Building kinetic│
                    │     energy          │
                    └─────────┬───────────┘
                              │
                     HIT GROUND (y >= groundLevel)
                              │
                              ▼
                    ┌─────────────────────┐
                    │                     │
                    │   IMPACT MODE       │
                    │   • Slam damage     │◀─── Deals AOE damage
                    │   • Solid (hittable)│      on landing
                    │   • Slide on ground │
                    │   • Magnetize XP    │
                    │   • Flight meter    │
                    │     recharges       │
                    └─────────┬───────────┘
                              │
                     HOLD again
                              │
                              ▼
                    (back to FLIGHT MODE)
```

### Entity Hierarchy (New)

```
Entity (base — keep as-is)
├── Player (REWRITE — dual-state Flight/Impact)
├── EnergyBurst (NEW — replaces Bullet, auto-fires downward in Flight)
├── XPOrb (NEW — replaces PowerUp, dropped by enemies)
├── DataBlocker (NEW — floating obstacle, blocks flight path)
├── ChaserBot (NEW — ground enemy, chases player during Impact)
└── GravityFlare (NEW — floating hazard, pulls player downward)

DELETED: Enemy.js, FastEnemy.js, TankEnemy.js, Bullet.js, PowerUp.js
```

### Data Flow: One Game Frame

```
1. InputSystem.update()
   → Returns { holding, horizontal, justPressed, justReleased }

2. Player.update(dt, input, scrollSpeed)
   → Updates state machine (FLIGHT / FALLING / IMPACT)
   → Updates position (X from input, Y from state physics)
   → Auto-fires EnergyBursts if in FLIGHT mode
   → Recharges flight meter if in IMPACT mode
   → Returns slamEvent if just hit ground

3. Camera.scrollY -= scrollSpeed * dt
   → World scrolls upward continuously

4. SpawnSystem.update(dt, cameraY)
   → Spawns entities above camera view
   → Respects difficulty curve and density caps

5. EntityManager.updateAll(dt, player, cameraY)
   → All entities update positions
   → Entities below camera are killed (off-screen cleanup)

6. CollisionSystem.update(player, entityManager)
   → Flight mode: only EnergyBurst→enemy collisions
   → Impact mode: player→enemy, player→XPOrb collisions
   → Slam: AOE damage around landing point

7. EntityManager.removeAllDead()
   → Clean up killed entities

8. EffectsManager.update(dt)
   → Update particles, screen effects

9. EntityRenderer.draw(gfx, player, entityManager, cameraY)
   → Draw synthwave grid (scrolling)
   → Draw all entities with voxel aesthetic
   → Draw player with mode-specific visuals

10. HUD.update(gameState)
    → Flight meter, score, health, mode indicator
```

---

## Implementation Phases

### Phase Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│               Phase 1: Foundation & Config                      │
│     (Rename project, new CONFIG, updated GameState)             │
│                      Estimate: 3 pts                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │  ← PARALLEL SUB-AGENTS
               ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │ Phase 2A  │   │ Phase 2B  │   │ Phase 2C  │
        │ Player &  │   │ Input &   │   │ Rendering │
        │ Entities  │   │ Systems   │   │ & Effects │
        │  8 pts    │   │   5 pts   │   │   5 pts   │
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Phase 3: Integrate  │
                   │  Scenes + HUD +     │
                   │  Mobile + CLAUDE.md │
                   │     Estimate: 5 pts │
                   └─────────────────────┘
```

---

### Phase 1: Foundation & Config

> **Depends On**: Nothing
> **Can Run With**: Nothing
> **Estimate**: 3 points
> **Status**: ⬜ Not Started

#### Objectives

- [x] Rename project from "Game Starter Kit" to "Vector Drift" everywhere
- [x] Rewrite `config.js` with Vector Drift constants
- [x] Update `GameState.js` for new tracking (flight meter, XP, player mode)
- [x] Update `highScore.js` storage key

#### Tasks

##### Task 1.1: Rename Project (Estimate: 1)

**Files to modify:**

**`package.json` (MODIFY):**
- Change `"name"` from `"game-boilerplate"` to `"vector-drift"`

**`index.html` (MODIFY):**
- Change `<title>` to "Vector Drift"
- Change heading text to "VECTOR DRIFT"
- Update description to match game concept

**`game.html` (MODIFY):**
- Change `<title>` to "Vector Drift"

**`capacitor.config.json` (MODIFY):**
- Change `appId` to `"com.vectordrift.game"`
- Change `appName` to `"Vector Drift"`

**`src/game/utils/highScore.js` (MODIFY):**
- Change `STORAGE_KEY` from `'game_boilerplate_highscore'` to `'vector_drift_highscore'`

##### Task 1.2: Rewrite CONFIG (Estimate: 1)

**`src/game/config.js` (REWRITE):**

Replace all existing constants with Vector Drift constants:

```javascript
export const CONFIG = Object.freeze({
  // Canvas
  WIDTH: 800,
  HEIGHT: 600,
  CENTER_X: 400,
  CENTER_Y: 300,

  // Scrolling
  SCROLL_SPEED_BASE: 60,        // pixels/sec upward scroll
  SCROLL_SPEED_MAX: 200,        // max scroll speed
  SCROLL_ACCELERATION: 0.5,     // speed increase per second

  // Player
  PLAYER_HORIZONTAL_SPEED: 250, // X-axis movement speed
  PLAYER_WIDTH: 20,             // visual width (blocky voxel)
  PLAYER_HEIGHT: 20,            // visual height
  PLAYER_RADIUS: 10,            // collision radius
  PLAYER_MAX_HEALTH: 100,
  PLAYER_INVULN_MS: 1500,

  // Flight Mode
  FLIGHT_RISE_SPEED: 120,       // upward float speed
  FLIGHT_METER_MAX: 100,        // flight meter capacity
  FLIGHT_METER_DRAIN: 20,       // drain per second while flying
  FLIGHT_METER_RECHARGE: 35,    // recharge per second on ground
  FLIGHT_FIRE_COOLDOWN_MS: 300, // auto-fire interval in flight
  FLIGHT_FIRE_SPEED: 400,       // energy burst speed (downward)

  // Impact Mode
  IMPACT_FALL_ACCEL: 800,       // gravity acceleration (px/s^2)
  IMPACT_MAX_FALL_SPEED: 600,   // terminal velocity
  IMPACT_SLAM_RADIUS: 60,       // AOE damage radius on landing
  IMPACT_SLAM_DAMAGE: 2,        // damage dealt on slam
  IMPACT_SLIDE_SPEED: 180,      // ground slide speed (decays)
  IMPACT_SLIDE_FRICTION: 0.95,  // slide deceleration per frame
  IMPACT_XP_MAGNET_RADIUS: 80,  // XP orb attraction radius on ground

  // Ground level (Y position of the "floor" relative to screen)
  GROUND_Y: 500,                // ground level (pixels from top)

  // Energy Burst (projectile in Flight)
  BURST_RADIUS: 5,
  BURST_DAMAGE: 1,
  BURST_LIFETIME_MS: 2000,

  // Data Blocker (floating obstacle)
  BLOCKER_WIDTH: 50,
  BLOCKER_HEIGHT: 16,
  BLOCKER_RADIUS: 20,
  BLOCKER_HP: 2,
  BLOCKER_SPEED: 30,            // slow horizontal drift
  BLOCKER_SCORE: 50,

  // Chaser Bot (ground enemy)
  CHASER_SPEED: 100,
  CHASER_RADIUS: 10,
  CHASER_HP: 1,
  CHASER_SCORE: 100,

  // Gravity Flare (pulls player down)
  FLARE_RADIUS: 14,
  FLARE_PULL_RADIUS: 120,       // gravitational pull range
  FLARE_PULL_STRENGTH: 200,     // downward pull force
  FLARE_HP: 1,
  FLARE_SCORE: 150,

  // XP Orb
  XP_ORB_RADIUS: 6,
  XP_ORB_VALUE: 10,
  XP_ORB_LIFETIME_MS: 10000,
  XP_ORB_MAGNET_SPEED: 300,     // speed when magnetized toward player

  // Scoring
  SCORE_PER_XP: 10,
  MULTIPLIER_INCREMENT: 0.1,
  MULTIPLIER_MAX: 5.0,
  MULTIPLIER_DECAY_MS: 4000,

  // Arena
  ARENA_LEFT: 40,
  ARENA_RIGHT: 760,
  ARENA_MARGIN: 40,
  SPAWN_AHEAD_DISTANCE: 100,    // how far above camera to spawn

  // Colors — Neon Voxel Palette
  BG: 0x0a0614,                 // deep purple-black
  GRID_COLOR: 0x2a1050,         // synthwave grid lines
  GRID_HIGHLIGHT: 0x6020a0,     // brighter grid accent
  PLAYER_FLIGHT: 0x00ffff,      // cyan (flight mode)
  PLAYER_IMPACT: 0xff00ff,      // magenta (impact mode)
  PLAYER_FALLING: 0xff6600,     // orange (falling)
  BURST_COLOR: 0x00ffdd,        // cyan-green energy burst
  BLOCKER_COLOR: 0xff2080,      // hot pink (data blocker)
  CHASER_COLOR: 0xffaa00,       // amber (chaser bot)
  FLARE_COLOR: 0xaa00ff,        // purple (gravity flare)
  XP_ORB_COLOR: 0x88ff00,       // lime green (XP orb)
  SLAM_FLASH: 0xff00ff,         // magenta slam flash
  HUD_COLOR: '#00ffff',         // cyan HUD text
  HUD_WARN: '#ff2080',          // pink warning text
});
```

##### Task 1.3: Update GameState (Estimate: 1)

**`src/game/state/GameState.js` (REWRITE):**

Replace with Vector Drift state tracking:

```javascript
export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.health = 100;
    this.flightMeter = 100;       // current flight fuel
    this.xpCollected = 0;          // total XP orbs collected
    this.multiplier = 1.0;
    this.multiplierTimer = 0;
    this.kills = 0;
    this.slamCount = 0;            // total impact slams
    this.maxAltitude = 0;          // highest point reached
    this.elapsed = 0;
    this.gameOver = false;
    this.playerMode = 'impact';    // 'flight' | 'falling' | 'impact'
  }

  update(dt) {
    this.elapsed += dt;
    // Decay multiplier
    if (this.multiplierTimer > 0) {
      this.multiplierTimer -= dt * 1000;
    } else if (this.multiplier > 1.0) {
      this.multiplier = Math.max(1.0, this.multiplier - 0.1 * dt);
    }
  }

  addScore(base) {
    this.score += Math.floor(base * this.multiplier);
  }

  bumpMultiplier(amount) {
    this.multiplier = Math.min(this.multiplier + amount, 5.0);
    this.multiplierTimer = 4000;
  }
}
```

#### Definition of Done (Quality Gate)

- [x] `npm run dev` starts without errors
- [x] Browser title shows "Vector Drift"
- [x] CONFIG exports all new constants without errors
- [x] GameState tracks flightMeter, playerMode, slamCount, maxAltitude
- [x] High score uses `vector_drift_highscore` key
- [x] No import errors in any file

#### Context Checkpoint
- [x] **CHECKPOINT: Run `/compact focus on: Phase 1 complete, project renamed to Vector Drift, CONFIG has all new constants (flight/impact/enemy/colors), GameState tracks flight meter and player mode, Phase 2 builds entities and systems`**

---

### Phase 2A: Player & Entities

> **Depends On**: Phase 1
> **Can Run With**: Phase 2B, Phase 2C (USE PARALLEL SUB-AGENTS)
> **Estimate**: 8 points
> **Status**: ✅ Complete

#### Objectives

- [x] Rewrite Player.js with dual-state Flight/Impact mechanics
- [x] Create EnergyBurst.js (replaces Bullet.js)
- [x] Create DataBlocker.js (floating obstacle)
- [x] Create ChaserBot.js (ground enemy)
- [x] Create GravityFlare.js (pull-down hazard)
- [x] Create XPOrb.js (collectible)
- [x] Update EntityManager.js for new entity arrays
- [x] Delete old entity files (Enemy.js, FastEnemy.js, TankEnemy.js, Bullet.js, PowerUp.js)

#### Tasks

##### Task 2A.1: Rewrite Player.js (Estimate: 3)

**`src/game/entities/Player.js` (REWRITE):**

The player has three states: `flight`, `falling`, `impact`.

```javascript
import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { clamp } from '../utils/math.js';

export class Player extends Entity {
  constructor(x, y) {
    super(x, y, 'player');
    this.radius = CONFIG.PLAYER_RADIUS;
    this.health = CONFIG.PLAYER_MAX_HEALTH;
    this.invulnTimer = 0;

    // State machine
    this.mode = 'impact';  // 'flight' | 'falling' | 'impact'

    // Flight
    this.flightMeter = CONFIG.FLIGHT_METER_MAX;
    this.fireCooldown = 0;

    // Physics
    this.vx = 0;           // horizontal velocity (slide)
    this.vy = 0;           // vertical velocity (fall)
    this.slideVx = 0;      // residual slide from impact

    // Slam tracking
    this.justSlammed = false;
    this.slamX = 0;
    this.slamY = 0;
    this.fallStartY = 0;   // Y when falling began (for kinetic energy calc)
  }

  update(dt, input, scrollSpeed) {
    super.update(dt);
    this.justSlammed = false;

    if (this.invulnTimer > 0) this.invulnTimer -= dt * 1000;

    // Horizontal movement (always active)
    const hSpeed = CONFIG.PLAYER_HORIZONTAL_SPEED;
    this.x += input.horizontal * hSpeed * dt;
    this.x = clamp(this.x, CONFIG.ARENA_LEFT, CONFIG.ARENA_RIGHT);

    // State machine
    switch (this.mode) {
      case 'flight':
        this._updateFlight(dt, input, scrollSpeed);
        break;
      case 'falling':
        this._updateFalling(dt, input);
        break;
      case 'impact':
        this._updateImpact(dt, input);
        break;
    }

    // Fire cooldown
    if (this.fireCooldown > 0) this.fireCooldown -= dt * 1000;
  }

  _updateFlight(dt, input, scrollSpeed) {
    // Rise upward (relative to scroll)
    this.y -= CONFIG.FLIGHT_RISE_SPEED * dt;

    // Clamp to top of screen (don't fly off)
    this.y = Math.max(40, this.y);

    // Drain flight meter
    this.flightMeter -= CONFIG.FLIGHT_METER_DRAIN * dt;

    // Transition: release or meter depleted
    if (!input.holding || this.flightMeter <= 0) {
      this.mode = 'falling';
      this.vy = 0;
      this.flightMeter = Math.max(0, this.flightMeter);
      this.fallStartY = this.y;
    }
  }

  _updateFalling(dt, input) {
    // Accelerate downward
    this.vy += CONFIG.IMPACT_FALL_ACCEL * dt;
    this.vy = Math.min(this.vy, CONFIG.IMPACT_MAX_FALL_SPEED);
    this.y += this.vy * dt;

    // Can re-enter flight if holding and has meter
    if (input.holding && this.flightMeter > 10) {
      this.mode = 'flight';
      this.vy = 0;
      return;
    }

    // Hit ground
    if (this.y >= CONFIG.GROUND_Y) {
      this.y = CONFIG.GROUND_Y;
      this._slam();
    }
  }

  _updateImpact(dt, input) {
    // Slide with friction
    this.slideVx *= CONFIG.IMPACT_SLIDE_FRICTION;
    this.x += this.slideVx * dt;
    this.x = clamp(this.x, CONFIG.ARENA_LEFT, CONFIG.ARENA_RIGHT);

    // Recharge flight meter
    this.flightMeter = Math.min(
      CONFIG.FLIGHT_METER_MAX,
      this.flightMeter + CONFIG.FLIGHT_METER_RECHARGE * dt
    );

    // Stay on ground
    this.y = CONFIG.GROUND_Y;

    // Transition to flight
    if (input.holding && this.flightMeter > 10) {
      this.mode = 'flight';
      this.vy = 0;
      this.slideVx = 0;
    }
  }

  _slam() {
    this.mode = 'impact';
    this.justSlammed = true;
    this.slamX = this.x;
    this.slamY = this.y;
    // Convert fall speed to slide speed (directional from horizontal input)
    this.slideVx = this.vx || (Math.random() > 0.5 ? 1 : -1) * CONFIG.IMPACT_SLIDE_SPEED;
    this.vy = 0;
  }

  canFire() {
    return this.mode === 'flight' && this.fireCooldown <= 0;
  }

  fire() {
    if (!this.canFire()) return null;
    this.fireCooldown = CONFIG.FLIGHT_FIRE_COOLDOWN_MS;
    return { x: this.x, y: this.y + this.radius };
  }

  hit(damage = 10) {
    if (this.invulnTimer > 0) return false;
    this.health -= damage;
    this.invulnTimer = CONFIG.PLAYER_INVULN_MS;
    return true;
  }

  isIntangible() {
    return this.mode === 'flight';
  }

  isOnGround() {
    return this.mode === 'impact';
  }

  getColor() {
    switch (this.mode) {
      case 'flight': return CONFIG.PLAYER_FLIGHT;
      case 'falling': return CONFIG.PLAYER_FALLING;
      case 'impact': return CONFIG.PLAYER_IMPACT;
    }
  }
}
```

##### Task 2A.2: Create EnergyBurst.js (Estimate: 1)

**`src/game/entities/EnergyBurst.js` (CREATE):**

Replaces Bullet.js — auto-fires downward during Flight mode.

```javascript
import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class EnergyBurst extends Entity {
  constructor(x, y) {
    super(x, y, 'burst');
    this.radius = CONFIG.BURST_RADIUS;
    this.speed = CONFIG.FLIGHT_FIRE_SPEED;
    this.damage = CONFIG.BURST_DAMAGE;
    this.lifetime = CONFIG.BURST_LIFETIME_MS;
    this.elapsed = 0;
  }

  update(dt) {
    super.update(dt);
    // Move downward
    this.y += this.speed * dt;
    this.elapsed += dt * 1000;
    if (this.elapsed >= this.lifetime) {
      this.kill();
    }
  }

  getColor() {
    return CONFIG.BURST_COLOR;
  }
}
```

##### Task 2A.3: Create DataBlocker.js (Estimate: 1)

**`src/game/entities/DataBlocker.js` (CREATE):**

Floating platform that blocks flight path. Wide and flat — forces player to land.

```javascript
import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';

export class DataBlocker extends Entity {
  constructor(x, y) {
    super(x, y, 'blocker');
    this.width = CONFIG.BLOCKER_WIDTH;
    this.height = CONFIG.BLOCKER_HEIGHT;
    this.radius = CONFIG.BLOCKER_RADIUS;
    this.hp = CONFIG.BLOCKER_HP;
    this.maxHp = CONFIG.BLOCKER_HP;
    this.scoreValue = CONFIG.BLOCKER_SCORE;
    this.driftDir = Math.random() > 0.5 ? 1 : -1;
    this.driftSpeed = CONFIG.BLOCKER_SPEED;
  }

  update(dt) {
    super.update(dt);
    // Slow horizontal drift
    this.x += this.driftDir * this.driftSpeed * dt;
    if (this.x <= CONFIG.ARENA_LEFT || this.x >= CONFIG.ARENA_RIGHT) {
      this.driftDir *= -1;
    }
  }

  hit(damage = 1) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.kill();
      return false; // dead
    }
    return true; // survived
  }

  getColor() {
    return CONFIG.BLOCKER_COLOR;
  }
}
```

##### Task 2A.4: Create ChaserBot.js (Estimate: 1)

**`src/game/entities/ChaserBot.js` (CREATE):**

Ground enemy that spawns and chases player only when player is on ground.

```javascript
import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { normalize } from '../utils/math.js';

export class ChaserBot extends Entity {
  constructor(x, y) {
    super(x, y, 'chaser');
    this.radius = CONFIG.CHASER_RADIUS;
    this.speed = CONFIG.CHASER_SPEED;
    this.hp = CONFIG.CHASER_HP;
    this.scoreValue = CONFIG.CHASER_SCORE;
    // Always on ground
    this.y = CONFIG.GROUND_Y;
  }

  update(dt, player) {
    super.update(dt);
    // Chase player horizontally (ground only)
    if (player && player.isOnGround()) {
      const dir = player.x > this.x ? 1 : -1;
      this.x += dir * this.speed * dt;
    }
    // Stay on ground
    this.y = CONFIG.GROUND_Y;
  }

  hit(damage = 1) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.kill();
      return false;
    }
    return true;
  }

  getColor() {
    return CONFIG.CHASER_COLOR;
  }
}
```

##### Task 2A.5: Create GravityFlare.js (Estimate: 1)

**`src/game/entities/GravityFlare.js` (CREATE):**

Floating hazard that pulls the player downward when in range.

```javascript
import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { distanceSq } from '../utils/math.js';

export class GravityFlare extends Entity {
  constructor(x, y) {
    super(x, y, 'flare');
    this.radius = CONFIG.FLARE_RADIUS;
    this.pullRadius = CONFIG.FLARE_PULL_RADIUS;
    this.pullStrength = CONFIG.FLARE_PULL_STRENGTH;
    this.hp = CONFIG.FLARE_HP;
    this.scoreValue = CONFIG.FLARE_SCORE;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    super.update(dt);
    this.pulsePhase += dt * 3;
  }

  applyGravityTo(player, dt) {
    const dSq = distanceSq(this.x, this.y, player.x, player.y);
    const pullRadSq = this.pullRadius * this.pullRadius;
    if (dSq < pullRadSq && dSq > 0) {
      // Pull strength scales inversely with distance
      const factor = 1 - Math.sqrt(dSq) / this.pullRadius;
      player.y += this.pullStrength * factor * dt;
    }
  }

  hit(damage = 1) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.kill();
      return false;
    }
    return true;
  }

  getColor() {
    return CONFIG.FLARE_COLOR;
  }
}
```

##### Task 2A.6: Create XPOrb.js (Estimate: 1)

**`src/game/entities/XPOrb.js` (CREATE):**

```javascript
import { Entity } from './Entity.js';
import { CONFIG } from '../config.js';
import { distanceSq } from '../utils/math.js';

export class XPOrb extends Entity {
  constructor(x, y) {
    super(x, y, 'xp_orb');
    this.radius = CONFIG.XP_ORB_RADIUS;
    this.value = CONFIG.XP_ORB_VALUE;
    this.lifetime = CONFIG.XP_ORB_LIFETIME_MS;
    this.elapsed = 0;
    this.magnetized = false;
  }

  update(dt, player) {
    super.update(dt);
    this.elapsed += dt * 1000;

    if (this.elapsed >= this.lifetime) {
      this.kill();
      return;
    }

    // Magnetize toward player if player is on ground and in range
    if (player && player.isOnGround()) {
      const dSq = distanceSq(this.x, this.y, player.x, player.y);
      const magnetRadSq = CONFIG.IMPACT_XP_MAGNET_RADIUS * CONFIG.IMPACT_XP_MAGNET_RADIUS;
      if (dSq < magnetRadSq) {
        this.magnetized = true;
        const dist = Math.sqrt(dSq);
        if (dist > 1) {
          const nx = (player.x - this.x) / dist;
          const ny = (player.y - this.y) / dist;
          this.x += nx * CONFIG.XP_ORB_MAGNET_SPEED * dt;
          this.y += ny * CONFIG.XP_ORB_MAGNET_SPEED * dt;
        }
      }
    }
  }

  getColor() {
    return CONFIG.XP_ORB_COLOR;
  }
}
```

##### Task 2A.7: Update EntityManager.js (Estimate: 1)

**`src/game/entities/EntityManager.js` (REWRITE):**

```javascript
export class EntityManager {
  constructor() {
    this.player = null;
    this.bursts = [];      // EnergyBurst (player projectiles)
    this.blockers = [];    // DataBlocker
    this.chasers = [];     // ChaserBot
    this.flares = [];      // GravityFlare
    this.xpOrbs = [];      // XPOrb
  }

  setPlayer(player) { this.player = player; }
  addBurst(b) { this.bursts.push(b); }
  addBlocker(b) { this.blockers.push(b); }
  addChaser(c) { this.chasers.push(c); }
  addFlare(f) { this.flares.push(f); }
  addXPOrb(o) { this.xpOrbs.push(o); }

  getAllEnemies() {
    return [...this.blockers, ...this.chasers, ...this.flares];
  }

  updateAll(dt, player) {
    this.bursts.forEach(b => { if (b.alive) b.update(dt); });
    this.blockers.forEach(b => { if (b.alive) b.update(dt); });
    this.chasers.forEach(c => { if (c.alive) c.update(dt, player); });
    this.flares.forEach(f => {
      if (f.alive) {
        f.update(dt);
        f.applyGravityTo(player, dt);
      }
    });
    this.xpOrbs.forEach(o => { if (o.alive) o.update(dt, player); });
  }

  removeAllDead() {
    this.bursts = this.bursts.filter(b => b.alive);
    this.blockers = this.blockers.filter(b => b.alive);
    this.chasers = this.chasers.filter(c => c.alive);
    this.flares = this.flares.filter(f => f.alive);
    this.xpOrbs = this.xpOrbs.filter(o => o.alive);
  }

  removeOffScreen(cameraTop, cameraBottom) {
    const margin = 100;
    const killIfOff = (entity) => {
      if (entity.y < cameraTop - margin || entity.y > cameraBottom + margin) {
        entity.kill();
      }
    };
    this.blockers.forEach(killIfOff);
    this.chasers.forEach(killIfOff);
    this.flares.forEach(killIfOff);
    this.xpOrbs.forEach(killIfOff);
    this.bursts.forEach(killIfOff);
  }

  getAll() {
    return [
      this.player,
      ...this.bursts,
      ...this.blockers,
      ...this.chasers,
      ...this.flares,
      ...this.xpOrbs,
    ].filter(e => e && e.alive);
  }

  getCounts() {
    return {
      blockers: this.blockers.filter(b => b.alive).length,
      chasers: this.chasers.filter(c => c.alive).length,
      flares: this.flares.filter(f => f.alive).length,
      xpOrbs: this.xpOrbs.filter(o => o.alive).length,
    };
  }

  clear() {
    this.bursts = [];
    this.blockers = [];
    this.chasers = [];
    this.flares = [];
    this.xpOrbs = [];
  }
}
```

##### Task 2A.8: Delete Old Entity Files (Estimate: 0)

Delete the following files (no longer needed):
- `src/game/entities/Enemy.js`
- `src/game/entities/FastEnemy.js`
- `src/game/entities/TankEnemy.js`
- `src/game/entities/Bullet.js`
- `src/game/entities/PowerUp.js`

#### Definition of Done (Quality Gate)

- [x] Player state machine transitions correctly: impact → flight → falling → impact
- [x] All 4 new entity types (DataBlocker, ChaserBot, GravityFlare, XPOrb) instantiate without errors
- [x] EnergyBurst fires downward and expires
- [x] EntityManager tracks all new arrays correctly
- [x] No import errors (old entities fully removed)
- [x] Entity.js base class unchanged

#### Context Checkpoint
- [x] **CHECKPOINT: Run `/compact focus on: Phase 2A complete, Player has Flight/Falling/Impact state machine, 4 new entities created (DataBlocker, ChaserBot, GravityFlare, XPOrb), EnergyBurst replaces Bullet, EntityManager updated, old entities deleted, Phase 3 wires into GameScene`**

---

### Phase 2B: Input & Game Systems

> **Depends On**: Phase 1
> **Can Run With**: Phase 2A, Phase 2C (USE PARALLEL SUB-AGENTS)
> **Estimate**: 5 points
> **Status**: ✅ Complete

#### Objectives

- [x] Rewrite InputSystem.js for hold/release + horizontal
- [x] Rewrite CollisionSystem.js for state-dependent collisions
- [x] Rewrite SpawnSystem.js for vertical trench spawning
- [x] Update difficulty.js for bullet heaven progression

#### Tasks

##### Task 2B.1: Rewrite InputSystem.js (Estimate: 2)

**`src/game/systems/InputSystem.js` (REWRITE):**

```javascript
export class InputSystem {
  constructor(scene) {
    this._holding = false;
    this._horizontal = 0;
    this._justPressed = false;
    this._justReleased = false;

    this._onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!this._holding) this._justPressed = true;
        this._holding = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this._leftHeld = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this._rightHeld = true;
    };

    this._onKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (this._holding) this._justReleased = true;
        this._holding = false;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this._leftHeld = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this._rightHeld = false;
    };

    this._leftHeld = false;
    this._rightHeld = false;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Cleanup on scene shutdown
    scene.events.on('shutdown', () => {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
    });
  }

  update() {
    const result = {
      holding: this._holding,
      horizontal: 0,
      justPressed: this._justPressed,
      justReleased: this._justReleased,
    };

    if (this._leftHeld) result.horizontal -= 1;
    if (this._rightHeld) result.horizontal += 1;

    // Clear one-shot flags
    this._justPressed = false;
    this._justReleased = false;

    return result;
  }
}
```

##### Task 2B.2: Rewrite CollisionSystem.js (Estimate: 2)

**`src/game/systems/CollisionSystem.js` (REWRITE):**

State-dependent collision: Flight mode = intangible to enemies, Impact mode = solid.

```javascript
import { distanceSq } from '../utils/math.js';
import { CONFIG } from '../config.js';

export class CollisionSystem {
  constructor() {
    // Callbacks
    this.onEnemyKilled = null;    // (enemy, source) => {}
    this.onEnemyHit = null;       // (enemy) => {}
    this.onPlayerHit = null;      // (enemy) => {}
    this.onXPCollected = null;    // (orb) => {}
    this.onSlam = null;           // (x, y, enemiesHit) => {}
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
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const rSum = CONFIG.IMPACT_SLAM_RADIUS + enemy.radius;
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
  }
}
```

##### Task 2B.3: Rewrite SpawnSystem.js (Estimate: 1)

**`src/game/systems/SpawnSystem.js` (REWRITE):**

Spawns entities from top (above camera) in vertical trench layout.

```javascript
import { CONFIG } from '../config.js';
import { DataBlocker } from '../entities/DataBlocker.js';
import { ChaserBot } from '../entities/ChaserBot.js';
import { GravityFlare } from '../entities/GravityFlare.js';
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

    const spawnY = cameraTop - CONFIG.SPAWN_AHEAD_DISTANCE;
    const spawnX = randomBetween(CONFIG.ARENA_LEFT + 20, CONFIG.ARENA_RIGHT - 20);

    switch (type) {
      case 'blocker':
        this.em.addBlocker(new DataBlocker(spawnX, spawnY));
        break;
      case 'chaser':
        // Chasers spawn at ground level, from screen edges
        const edge = Math.random() > 0.5 ? CONFIG.ARENA_LEFT - 20 : CONFIG.ARENA_RIGHT + 20;
        this.em.addChaser(new ChaserBot(edge, CONFIG.GROUND_Y));
        break;
      case 'flare':
        this.em.addFlare(new GravityFlare(spawnX, spawnY + randomBetween(0, 100)));
        break;
    }
  }

  _getUnlocked(elapsed) {
    const types = ['blocker'];
    if (elapsed >= 15) types.push('chaser');
    if (elapsed >= 30) types.push('flare');
    return types;
  }

  _pickType(unlocked, counts) {
    const WEIGHTS = { blocker: 50, chaser: 30, flare: 20 };
    const CAPS = { blocker: 8, chaser: 6, flare: 4 };

    // Filter by density cap
    const available = unlocked.filter(t => (counts[t + 's'] || 0) < CAPS[t]);
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
```

##### Task 2B.4: Update difficulty.js (Estimate: 1)

**`src/game/config/difficulty.js` (REWRITE):**

```javascript
export function getDifficulty(elapsedSeconds) {
  const t = elapsedSeconds;

  // Spawn interval: starts at 2500ms, drops to 600ms
  const spawnInterval = Math.max(600, 2500 - t * 10);

  // Scroll speed multiplier: 1.0 → 2.5 over 200s
  const scrollMultiplier = Math.min(2.5, 1.0 + t * 0.0075);

  // Enemy speed multiplier: 1.0 → 2.0 over 200s
  const speedMultiplier = Math.min(2.0, 1.0 + t * 0.005);

  // Phase names for debugging/HUD
  let phase;
  if (t < 30) phase = 'WARMUP';
  else if (t < 60) phase = 'RAMP';
  else if (t < 120) phase = 'MIDGAME';
  else phase = 'LATEGAME';

  return { spawnInterval, scrollMultiplier, speedMultiplier, phase, elapsedSeconds: t };
}
```

#### Definition of Done (Quality Gate)

- [x] InputSystem returns `{ holding, horizontal, justPressed, justReleased }`
- [x] CollisionSystem only damages player when NOT in flight mode
- [x] CollisionSystem processes slam AOE on landing
- [x] SpawnSystem spawns blockers from above, chasers from edges, flares from above
- [x] Difficulty ramps spawn rate and scroll speed over time
- [x] No import errors

#### Context Checkpoint
- [x] **CHECKPOINT: Run `/compact focus on: Phase 2B complete, InputSystem does hold/release, CollisionSystem is state-aware (intangible in flight), SpawnSystem spawns vertically, difficulty ramps scroll+spawn, Phase 3 wires into GameScene`**

---

### Phase 2C: Rendering & Effects

> **Depends On**: Phase 1
> **Can Run With**: Phase 2A, Phase 2B (USE PARALLEL SUB-AGENTS)
> **Estimate**: 5 points
> **Status**: ✅ Complete

#### Objectives

- [x] Rewrite EntityRenderer.js — all Graphics API, neon voxel aesthetic
- [x] Add synthwave grid background rendering
- [x] Update EffectsManager.js with slam effects and mode transition particles
- [x] Neon color palette with glow effects

#### Tasks

##### Task 2C.1: Rewrite EntityRenderer.js (Estimate: 3)

**`src/game/rendering/EntityRenderer.js` (REWRITE):**

All Graphics API rendering. No sprites. Blocky voxel shapes.

```javascript
import { CONFIG } from '../config.js';
import { lerp } from '../utils/math.js';

export class EntityRenderer {
  constructor(scene) {
    this.scene = scene;
    this.gridOffset = 0;
  }

  draw(gfx, player, entityManager, dt) {
    gfx.clear();

    // 1. Synthwave Grid Background
    this._drawGrid(gfx, dt);

    // 2. XP Orbs (draw first, below everything)
    entityManager.xpOrbs.forEach(o => {
      if (o.alive) this._drawXPOrb(gfx, o);
    });

    // 3. Data Blockers
    entityManager.blockers.forEach(b => {
      if (b.alive) this._drawBlocker(gfx, b);
    });

    // 4. Gravity Flares
    entityManager.flares.forEach(f => {
      if (f.alive) this._drawFlare(gfx, f);
    });

    // 5. Chaser Bots
    entityManager.chasers.forEach(c => {
      if (c.alive) this._drawChaser(gfx, c);
    });

    // 6. Energy Bursts
    entityManager.bursts.forEach(b => {
      if (b.alive) this._drawBurst(gfx, b);
    });

    // 7. Player (on top)
    if (player.alive) this._drawPlayer(gfx, player);

    // 8. Ground line
    this._drawGround(gfx);
  }

  _drawGrid(gfx, dt) {
    this.gridOffset = (this.gridOffset + dt * 60) % 40;
    const gridColor = CONFIG.GRID_COLOR;
    const w = CONFIG.WIDTH;
    const h = CONFIG.HEIGHT;

    gfx.lineStyle(1, gridColor, 0.3);

    // Vertical lines
    for (let x = 0; x < w; x += 40) {
      gfx.beginPath();
      gfx.moveTo(x, 0);
      gfx.lineTo(x, h);
      gfx.strokePath();
    }

    // Horizontal lines (scrolling)
    for (let y = -40 + this.gridOffset; y < h; y += 40) {
      gfx.beginPath();
      gfx.moveTo(0, y);
      gfx.lineTo(w, y);
      gfx.strokePath();
    }

    // Brighter center column highlight
    gfx.lineStyle(1, CONFIG.GRID_HIGHLIGHT, 0.2);
    gfx.beginPath();
    gfx.moveTo(CONFIG.CENTER_X, 0);
    gfx.lineTo(CONFIG.CENTER_X, h);
    gfx.strokePath();
  }

  _drawGround(gfx) {
    // Ground line
    gfx.lineStyle(2, CONFIG.PLAYER_IMPACT, 0.6);
    gfx.beginPath();
    gfx.moveTo(0, CONFIG.GROUND_Y + CONFIG.PLAYER_RADIUS);
    gfx.lineTo(CONFIG.WIDTH, CONFIG.GROUND_Y + CONFIG.PLAYER_RADIUS);
    gfx.strokePath();

    // Ground fill (subtle)
    gfx.fillStyle(CONFIG.GRID_COLOR, 0.2);
    gfx.fillRect(0, CONFIG.GROUND_Y + CONFIG.PLAYER_RADIUS, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);
  }

  _drawPlayer(gfx, player) {
    // Invulnerability blink
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer / 100) % 2 === 0) return;

    const x = player.x;
    const y = player.y;
    const s = CONFIG.PLAYER_WIDTH / 2;
    const color = player.getColor();

    // Blocky voxel square with mode-specific details
    gfx.fillStyle(color, 0.8);
    gfx.fillRect(x - s, y - s, s * 2, s * 2);

    // Outline
    gfx.lineStyle(2, color, 1);
    gfx.strokeRect(x - s, y - s, s * 2, s * 2);

    // Mode indicator
    if (player.mode === 'flight') {
      // Upward arrow inside
      gfx.lineStyle(2, 0xffffff, 0.8);
      gfx.beginPath();
      gfx.moveTo(x, y - s + 3);
      gfx.lineTo(x - 4, y);
      gfx.moveTo(x, y - s + 3);
      gfx.lineTo(x + 4, y);
      gfx.strokePath();
      // Glow aura
      gfx.fillStyle(color, 0.15);
      gfx.fillCircle(x, y, s * 2.5);
    } else if (player.mode === 'falling') {
      // Downward arrow + trail
      gfx.lineStyle(2, 0xffffff, 0.8);
      gfx.beginPath();
      gfx.moveTo(x, y + s - 3);
      gfx.lineTo(x - 4, y);
      gfx.moveTo(x, y + s - 3);
      gfx.lineTo(x + 4, y);
      gfx.strokePath();
      // Speed lines above
      gfx.lineStyle(1, CONFIG.PLAYER_FALLING, 0.4);
      for (let i = 0; i < 3; i++) {
        const lx = x + (Math.random() - 0.5) * s * 2;
        gfx.beginPath();
        gfx.moveTo(lx, y - s - 5 - i * 6);
        gfx.lineTo(lx, y - s - 15 - i * 6);
        gfx.strokePath();
      }
    } else {
      // Impact mode: wider stance
      gfx.lineStyle(1, color, 0.5);
      gfx.strokeRect(x - s - 2, y + s - 4, s * 2 + 4, 4);
    }

    // Flight meter bar (below player in flight, above in impact)
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

  _drawBurst(gfx, burst) {
    const bx = lerp(burst.prevX, burst.x, 0.5);
    const by = lerp(burst.prevY, burst.y, 0.5);

    // Neon energy bolt (small blocky square)
    gfx.fillStyle(CONFIG.BURST_COLOR, 0.9);
    gfx.fillRect(bx - burst.radius, by - burst.radius, burst.radius * 2, burst.radius * 2);

    // Glow
    gfx.fillStyle(CONFIG.BURST_COLOR, 0.2);
    gfx.fillCircle(bx, by, burst.radius * 3);
  }

  _drawBlocker(gfx, blocker) {
    const x = blocker.x;
    const y = blocker.y;
    const hw = blocker.width / 2;
    const hh = blocker.height / 2;

    // Solid blocky platform
    gfx.fillStyle(CONFIG.BLOCKER_COLOR, 0.7);
    gfx.fillRect(x - hw, y - hh, blocker.width, blocker.height);

    // Outline
    gfx.lineStyle(2, CONFIG.BLOCKER_COLOR, 1);
    gfx.strokeRect(x - hw, y - hh, blocker.width, blocker.height);

    // HP indicator dots
    for (let i = 0; i < blocker.hp; i++) {
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(x - 6 + i * 12, y, 2);
    }

    // Warning stripes (diagonal lines)
    gfx.lineStyle(1, CONFIG.BLOCKER_COLOR, 0.3);
    for (let sx = x - hw; sx < x + hw; sx += 8) {
      gfx.beginPath();
      gfx.moveTo(sx, y - hh);
      gfx.lineTo(sx + blocker.height, y + hh);
      gfx.strokePath();
    }
  }

  _drawChaser(gfx, chaser) {
    const x = chaser.x;
    const y = chaser.y;
    const r = chaser.radius;

    // Blocky triangle pointing toward player
    gfx.fillStyle(CONFIG.CHASER_COLOR, 0.8);
    gfx.fillTriangle(
      x, y - r,           // top
      x - r, y + r,       // bottom-left
      x + r, y + r        // bottom-right
    );

    // Outline
    gfx.lineStyle(2, CONFIG.CHASER_COLOR, 1);
    gfx.beginPath();
    gfx.moveTo(x, y - r);
    gfx.lineTo(x - r, y + r);
    gfx.lineTo(x + r, y + r);
    gfx.closePath();
    gfx.strokePath();

    // Eye dot
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillCircle(x, y, 2);
  }

  _drawFlare(gfx, flare) {
    const x = flare.x;
    const y = flare.y;
    const r = flare.radius;
    const pulse = Math.sin(flare.pulsePhase) * 0.2 + 0.8;

    // Pull radius indicator (faint circle)
    gfx.lineStyle(1, CONFIG.FLARE_COLOR, 0.1 * pulse);
    gfx.strokeCircle(x, y, flare.pullRadius);

    // Inner diamond shape
    gfx.fillStyle(CONFIG.FLARE_COLOR, 0.7 * pulse);
    gfx.fillTriangle(x, y - r, x - r, y, x + r, y);
    gfx.fillTriangle(x, y + r, x - r, y, x + r, y);

    // Outline
    gfx.lineStyle(2, CONFIG.FLARE_COLOR, pulse);
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

  _drawXPOrb(gfx, orb) {
    const x = orb.x;
    const y = orb.y;
    const r = orb.radius;
    const pulse = Math.sin(orb.elapsed / 200) * 0.3 + 0.7;

    // Glowing square
    gfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.6 * pulse);
    gfx.fillRect(x - r, y - r, r * 2, r * 2);

    // Glow
    gfx.fillStyle(CONFIG.XP_ORB_COLOR, 0.15 * pulse);
    gfx.fillCircle(x, y, r * 3);
  }

  destroy() {
    // No sprites to clean up in Graphics-only mode
  }
}
```

##### Task 2C.2: Update EffectsManager.js (Estimate: 2)

**`src/game/effects/EffectsManager.js` (MODIFY):**

Add slam shockwave effect and mode transition particles. Keep existing particle system and screen shake/flash.

Add these new methods to the existing EffectsManager:

```javascript
// Add to existing EffectsManager class:

spawnSlamEffect(x, y) {
  // Ring of particles expanding outward from slam point
  this.spawnExplosion(x, y, CONFIG.PLAYER_IMPACT, 20);
  this.screenShake(8, 200);
  this.screenFlash(CONFIG.SLAM_FLASH, 0.3);
}

spawnFlightTrail(x, y) {
  // Small upward particles when entering flight
  const count = 5;
  for (let i = 0; i < count; i++) {
    const p = this._pool.get();
    if (!p) break;
    p.x = x + (Math.random() - 0.5) * 20;
    p.y = y + 10;
    p.vx = (Math.random() - 0.5) * 30;
    p.vy = 30 + Math.random() * 50;  // downward (player goes up)
    p.color = CONFIG.PLAYER_FLIGHT;
    p.alpha = 0.7;
    p.life = 400;
    p.maxLife = 400;
    p.radius = 2 + Math.random() * 2;
    this._particles.push(p);
  }
}

spawnEnemyDeathEffect(x, y, color) {
  this.spawnExplosion(x, y, color, 8);
}

spawnXPCollectEffect(x, y) {
  this.spawnExplosion(x, y, CONFIG.XP_ORB_COLOR, 4);
}
```

Also update particle drawing to use blocky squares instead of circles for voxel aesthetic:

In the `_drawParticles` method, replace `fillCircle` with `fillRect`:
```javascript
// Change particle rendering from circle to square
gfx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
```

#### Definition of Done (Quality Gate)

- [x] Synthwave grid renders and scrolls
- [x] All entity types render with distinct neon voxel shapes
- [x] Player visual changes per mode (cyan flight, orange falling, magenta impact)
- [x] Ground line renders at GROUND_Y
- [x] Flight meter bar renders on player
- [x] Slam effect creates shockwave particles + screen shake
- [x] No sprite loading required
- [x] Particles are squares (voxel aesthetic)

#### Context Checkpoint
- [x] **CHECKPOINT: Run `/compact focus on: Phase 2C complete, all Graphics API rendering (no sprites), synthwave grid background, neon voxel entity visuals, slam/flight effects, ground line, flight meter on player, Phase 3 wires into scenes`**

---

### Phase 3: Scenes, HUD, Mobile & Polish

> **Depends On**: Phase 2A, Phase 2B, Phase 2C
> **Can Run With**: Nothing
> **Estimate**: 5 points
> **Status**: ✅ Complete

#### Objectives

- [x] Rewrite GameScene.js — wire all new systems together
- [x] Rewrite HUD.js — flight meter, score, mode indicator
- [x] Update SplashScene.js, TitleScene.js, GameOverScene.js
- [x] Update game.html mobile touch layout
- [x] Update CLAUDE.md documentation

#### Tasks

##### Task 3.1: Rewrite GameScene.js (Estimate: 2)

**`src/game/scenes/GameScene.js` (REWRITE):**

```javascript
import { Player } from '../entities/Player.js';
import { EnergyBurst } from '../entities/EnergyBurst.js';
import { EntityManager } from '../entities/EntityManager.js';
import { GameState } from '../state/GameState.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { EntityRenderer } from '../rendering/EntityRenderer.js';
import { EffectsManager } from '../effects/EffectsManager.js';
import { HUD } from '../hud/HUD.js';
import { XPOrb } from '../entities/XPOrb.js';
import { CONFIG } from '../config.js';
import { getDifficulty } from '../config/difficulty.js';
import { checkHighScore, setHighScore } from '../utils/highScore.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // No sprites to load — all Graphics API
  }

  create() {
    this.gameState = new GameState();
    this.entityManager = new EntityManager();

    // Player starts on the ground
    this.player = new Player(CONFIG.CENTER_X, CONFIG.GROUND_Y);
    this.entityManager.setPlayer(this.player);

    // Systems
    this.inputSystem = new InputSystem(this);
    this.collisionSystem = new CollisionSystem();
    this.spawnSystem = new SpawnSystem(this.entityManager, this.gameState);

    // Rendering & FX
    this.gfx = this.add.graphics();
    this.entityRenderer = new EntityRenderer(this);
    this.effects = new EffectsManager(this);
    this.hud = new HUD(this, this.gameState);

    // Camera/scroll tracking
    this.scrollY = 0;
    this.scrollSpeed = CONFIG.SCROLL_SPEED_BASE;

    // Sound
    this.soundEngine = this.game.registry.get('soundEngine');
    if (this.soundEngine) this.soundEngine.startMusic();

    // Wire collision callbacks
    this._wireCollisions();

    // Pause on ESC
    this.input.keyboard.on('keydown-ESC', () => {
      this._paused = !this._paused;
    });

    this._paused = false;
    this._gameOverTriggered = false;
  }

  _wireCollisions() {
    this.collisionSystem.onEnemyKilled = (enemy, source) => {
      this.gameState.kills++;
      this.gameState.addScore(enemy.scoreValue || 100);
      this.gameState.bumpMultiplier(CONFIG.MULTIPLIER_INCREMENT);
      this.effects.spawnEnemyDeathEffect(enemy.x, enemy.y, enemy.getColor());
      if (this.soundEngine) this.soundEngine.playSound('explode');

      // Drop XP orb
      this.entityManager.addXPOrb(new XPOrb(enemy.x, enemy.y));
    };

    this.collisionSystem.onEnemyHit = (enemy) => {
      if (this.soundEngine) this.soundEngine.playSound('hit');
    };

    this.collisionSystem.onPlayerHit = (enemy) => {
      const wasHit = this.player.hit(10);
      if (wasHit) {
        this.gameState.health = this.player.health;
        this.effects.screenShake(4, 150);
        this.effects.screenFlash(0xff0000, 0.2);
        if (this.soundEngine) this.soundEngine.playSound('hit');
      }
    };

    this.collisionSystem.onXPCollected = (orb) => {
      this.gameState.xpCollected += orb.value;
      this.gameState.addScore(CONFIG.SCORE_PER_XP);
      this.gameState.bumpMultiplier(CONFIG.MULTIPLIER_INCREMENT);
      this.effects.spawnXPCollectEffect(orb.x, orb.y);
      if (this.soundEngine) this.soundEngine.playSound('powerup');
    };

    this.collisionSystem.onSlam = (x, y, count) => {
      this.gameState.slamCount++;
      this.effects.spawnSlamEffect(x, y);
      if (this.soundEngine) this.soundEngine.playSound('explode');
    };
  }

  update(time, delta) {
    const dt = delta / 1000;

    if (this._paused) {
      this.hud.update(this.gameState, this.player, this._paused);
      return;
    }

    if (this.gameState.gameOver) {
      if (!this._gameOverTriggered) {
        this._triggerGameOver();
      }
      return;
    }

    // 1. Input
    const input = this.inputSystem.update();

    // 2. Scroll speed (increases with difficulty)
    const diff = getDifficulty(this.gameState.elapsed);
    this.scrollSpeed = CONFIG.SCROLL_SPEED_BASE * diff.scrollMultiplier;

    // 3. Player update
    const prevMode = this.player.mode;
    this.player.update(dt, input, this.scrollSpeed);

    // Mode transition effects
    if (prevMode !== this.player.mode) {
      if (this.player.mode === 'flight') {
        this.effects.spawnFlightTrail(this.player.x, this.player.y);
      }
    }

    // Auto-fire in flight mode
    const fireData = this.player.fire();
    if (fireData) {
      this.entityManager.addBurst(new EnergyBurst(fireData.x, fireData.y));
      if (this.soundEngine) this.soundEngine.playSound('shoot');
    }

    // 4. Spawn enemies
    this.spawnSystem.update(dt, 0); // cameraTop = 0 (no actual scroll in v1)

    // 5. Update entities
    this.entityManager.updateAll(dt, this.player);

    // 6. Collision
    this.collisionSystem.update(this.player, this.entityManager);

    // 7. Remove dead
    this.entityManager.removeAllDead();

    // 8. Update state
    this.gameState.update(dt);
    this.gameState.health = this.player.health;
    this.gameState.flightMeter = this.player.flightMeter;
    this.gameState.playerMode = this.player.mode;

    // 9. Effects
    this.effects.update(dt, this.gfx);

    // 10. Render
    this.entityRenderer.draw(this.gfx, this.player, this.entityManager, dt);

    // 11. Draw effects on top
    this.effects.drawParticles(this.gfx);

    // 12. HUD
    this.hud.update(this.gameState, this.player, this._paused);

    // 13. Game over check
    if (this.player.health <= 0) {
      this.gameState.gameOver = true;
    }
  }

  _triggerGameOver() {
    this._gameOverTriggered = true;
    if (this.soundEngine) {
      this.soundEngine.playSound('death');
      this.soundEngine.stopMusic();
    }
    const isHighScore = checkHighScore(this.gameState.score);
    if (isHighScore) setHighScore(this.gameState.score);

    this.time.delayedCall(2000, () => {
      this.scene.start('GameOverScene', {
        score: this.gameState.score,
        kills: this.gameState.kills,
        slamCount: this.gameState.slamCount,
        isHighScore,
      });
    });
  }
}
```

##### Task 3.2: Rewrite HUD.js (Estimate: 1)

**`src/game/hud/HUD.js` (REWRITE):**

```javascript
import { CONFIG } from '../config.js';

export class HUD {
  constructor(scene, gameState) {
    this.scene = scene;

    // Score
    this.scoreText = scene.add.text(16, 16, 'SCORE: 0', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: CONFIG.HUD_COLOR,
    }).setDepth(100);

    // Multiplier
    this.multiplierText = scene.add.text(16, 40, '', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#ffaa00',
    }).setDepth(100);

    // Mode indicator
    this.modeText = scene.add.text(CONFIG.WIDTH - 16, 16, 'IMPACT', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: CONFIG.HUD_COLOR,
    }).setOrigin(1, 0).setDepth(100);

    // Health bar
    this.healthLabel = scene.add.text(CONFIG.WIDTH - 16, 40, 'HP', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: CONFIG.HUD_COLOR,
    }).setOrigin(1, 0).setDepth(100);

    // Flight meter bar (drawn with graphics in update)
    this.hudGfx = scene.add.graphics().setDepth(100);

    // Pause text
    this.pauseText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y, 'PAUSED', {
      fontFamily: 'Courier New',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Low health warning
    this._warnFlash = 0;
    this.warnText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 80, 'LOW HEALTH!', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: CONFIG.HUD_WARN,
    }).setOrigin(0.5).setDepth(100).setVisible(false);
  }

  update(gameState, player, paused) {
    // Score
    this.scoreText.setText(`SCORE: ${gameState.score}`);

    // Multiplier
    if (gameState.multiplier > 1.0) {
      this.multiplierText.setText(`x${gameState.multiplier.toFixed(1)}`);
      this.multiplierText.setVisible(true);
    } else {
      this.multiplierText.setVisible(false);
    }

    // Mode
    const modeNames = { flight: 'FLIGHT', falling: 'FALLING', impact: 'IMPACT' };
    const modeColors = {
      flight: '#00ffff',
      falling: '#ff6600',
      impact: '#ff00ff',
    };
    this.modeText.setText(modeNames[gameState.playerMode] || 'IMPACT');
    this.modeText.setColor(modeColors[gameState.playerMode] || '#00ffff');

    // HUD graphics (health bar + flight meter)
    this.hudGfx.clear();

    // Health bar (top right)
    const hbX = CONFIG.WIDTH - 120;
    const hbY = 58;
    const hbW = 100;
    const hbH = 8;
    const hpFill = gameState.health / CONFIG.PLAYER_MAX_HEALTH;

    this.hudGfx.fillStyle(0x333333, 0.6);
    this.hudGfx.fillRect(hbX, hbY, hbW, hbH);

    const hpColor = hpFill > 0.5 ? 0x00ff88 : hpFill > 0.25 ? 0xffaa00 : 0xff4444;
    this.hudGfx.fillStyle(hpColor, 0.8);
    this.hudGfx.fillRect(hbX, hbY, hbW * hpFill, hbH);

    this.hudGfx.lineStyle(1, 0xffffff, 0.3);
    this.hudGfx.strokeRect(hbX, hbY, hbW, hbH);

    // Flight meter (below health bar)
    const fmY = hbY + 14;
    const fmFill = gameState.flightMeter / CONFIG.FLIGHT_METER_MAX;

    this.hudGfx.fillStyle(0x333333, 0.6);
    this.hudGfx.fillRect(hbX, fmY, hbW, hbH);

    this.hudGfx.fillStyle(CONFIG.PLAYER_FLIGHT, 0.8);
    this.hudGfx.fillRect(hbX, fmY, hbW * fmFill, hbH);

    this.hudGfx.lineStyle(1, 0xffffff, 0.3);
    this.hudGfx.strokeRect(hbX, fmY, hbW, hbH);

    // Pause
    this.pauseText.setVisible(paused);

    // Low health warning
    if (gameState.health <= 25 && gameState.health > 0 && !gameState.gameOver) {
      this._warnFlash += 0.1;
      this.warnText.setVisible(Math.sin(this._warnFlash) > 0);
    } else {
      this.warnText.setVisible(false);
    }
  }
}
```

##### Task 3.3: Update Scene Text & Flow (Estimate: 1)

**`src/game/scenes/SplashScene.js` (MODIFY):**
- Change splash text from "GAME STARTER KIT" to "VECTOR DRIFT"

**`src/game/scenes/TitleScene.js` (MODIFY):**
- Change title to "VECTOR DRIFT"
- Change description to game concept
- Change control legend to "HOLD SPACE = FLY | RELEASE = SLAM | ARROWS = MOVE"
- Keep high score display and "PRESS SPACE / TAP TO START"

**`src/game/scenes/GameOverScene.js` (MODIFY):**
- Keep existing structure (score, high score, restart)
- Add slam count display: `"SLAMS: ${data.slamCount}"`
- Keep SPACE → GameScene, M → TitleScene

##### Task 3.4: Update Mobile Touch Layout (Estimate: 1)

**`game.html` (MODIFY):**

Replace D-pad + action buttons with:
- **Left half of screen**: Hold = Flight, release = Impact (dispatches Space keydown/keyup)
- **Left edge**: Left movement (dispatches ArrowLeft)
- **Right edge**: Right movement (dispatches ArrowRight)
- **Or simpler**: Full screen hold = flight, left/right buttons at bottom

The mobile layout should be:

```
┌─────────────────────────────────┐
│                                 │
│        GAME CANVAS              │
│     (tap & hold = FLIGHT)       │
│     (release = IMPACT)          │
│                                 │
├─────────────────────────────────┤
│  [  ◄  ]     [ HOLD ]    [  ►  ]│
│  (LEFT)      (FLIGHT)    (RIGHT)│
└─────────────────────────────────┘
```

Touch zone changes:
- Remove D-pad (UP/DOWN/LEFT/RIGHT grid)
- Remove FIRE button
- Add large center HOLD button (dispatches Space)
- Keep LEFT/RIGHT buttons (dispatches ArrowLeft/ArrowRight)
- Keep PAUSE button

##### Task 3.5: Update CLAUDE.md (Estimate: 1)

**`CLAUDE.md` (MODIFY):**

Update these sections:
1. **Project Overview** — "Vector Drift" name, kinetic survival genre, core mechanic description
2. **Entity System** — New hierarchy (Player dual-state, DataBlocker, ChaserBot, GravityFlare, XPOrb, EnergyBurst)
3. **Systems** — InputSystem (hold/release), CollisionSystem (state-dependent), SpawnSystem (vertical)
4. **Difficulty** — Updated phases and progression
5. **CONFIG Reference** — All new constants
6. **How-To Recipes** — Updated for Vector Drift
7. **File Structure** — Updated entity/system file list
8. Keep: Architecture docs, gotchas, platform info, audio, rendering approach docs

#### Definition of Done (Quality Gate)

- [x] `npm run dev` launches Vector Drift and is playable
- [x] Hold Space → player floats up (Flight mode), fires energy bursts
- [x] Release Space → player falls and slams (Impact mode)
- [x] Arrow keys move player horizontally
- [x] Data Blockers appear as floating platforms
- [x] Chaser Bots chase player on ground
- [x] Gravity Flares pull player downward
- [x] XP Orbs drop from killed enemies
- [x] HUD shows score, health, flight meter, mode indicator
- [x] Slam creates particle + screen shake effect
- [x] Difficulty ramps over time
- [x] Game over triggers on health = 0
- [x] High score persists between sessions
- [x] Title screen says "VECTOR DRIFT"
- [x] Mobile touch layout works (hold/release + L/R)
- [x] CLAUDE.md is updated

#### Context Checkpoint (Final)
- [x] **CHECKPOINT: Run `/compact focus on: Vector Drift implementation COMPLETE, all 5 phases done, game playable with Flight/Impact toggle, 3 enemy types, XP orbs, neon voxel aesthetic, mobile controls, updated docs`**

---

## Assumptions & Known Unknowns

### Assumptions

| # | Assumption | Risk if Wrong | Mitigation | Validated |
|---|------------|---------------|------------|-----------|
| 1 | No actual camera scrolling needed for MVP — enemies spawn from top, scroll down via their own velocity | Game may feel static without world scroll | Add camera offset in v2 | ⬜ |
| 2 | Graphics API is sufficient for neon voxel aesthetic | May look too flat/simple | Add glow passes or RetroZone shader in v2 | ⬜ |
| 3 | Existing SoundEngine and placeholder sounds work without modification | May sound mismatched | Replace sounds in v2 | ⬜ |
| 4 | Flight meter drain/recharge rates feel balanced at configured values | May be too easy/hard | Tune in playtesting | ⬜ |

### Known Unknowns

| # | Unknown | Impact | How to Resolve | Resolved |
|---|---------|--------|----------------|----------|
| 1 | Exact flight meter drain rate for best feel | Core gameplay feel | Playtest and tune | ⬜ |
| 2 | Slam AOE radius for satisfying impact | Reward feedback | Playtest and tune | ⬜ |
| 3 | XP orb magnet radius balance | Collection satisfaction | Playtest and tune | ⬜ |

---

## Appendix

### Files Modified/Created/Deleted Summary

| File | Action | Phase |
|------|--------|-------|
| `package.json` | MODIFY | 1 |
| `index.html` | MODIFY | 1 |
| `game.html` | MODIFY | 1, 3 |
| `capacitor.config.json` | MODIFY | 1 |
| `src/game/config.js` | REWRITE | 1 |
| `src/game/state/GameState.js` | REWRITE | 1 |
| `src/game/utils/highScore.js` | MODIFY | 1 |
| `src/game/entities/Player.js` | REWRITE | 2A |
| `src/game/entities/EnergyBurst.js` | CREATE | 2A |
| `src/game/entities/DataBlocker.js` | CREATE | 2A |
| `src/game/entities/ChaserBot.js` | CREATE | 2A |
| `src/game/entities/GravityFlare.js` | CREATE | 2A |
| `src/game/entities/XPOrb.js` | CREATE | 2A |
| `src/game/entities/EntityManager.js` | REWRITE | 2A |
| `src/game/entities/Enemy.js` | DELETE | 2A |
| `src/game/entities/FastEnemy.js` | DELETE | 2A |
| `src/game/entities/TankEnemy.js` | DELETE | 2A |
| `src/game/entities/Bullet.js` | DELETE | 2A |
| `src/game/entities/PowerUp.js` | DELETE | 2A |
| `src/game/systems/InputSystem.js` | REWRITE | 2B |
| `src/game/systems/CollisionSystem.js` | REWRITE | 2B |
| `src/game/systems/SpawnSystem.js` | REWRITE | 2B |
| `src/game/config/difficulty.js` | REWRITE | 2B |
| `src/game/rendering/EntityRenderer.js` | REWRITE | 2C |
| `src/game/effects/EffectsManager.js` | MODIFY | 2C |
| `src/game/scenes/GameScene.js` | REWRITE | 3 |
| `src/game/hud/HUD.js` | REWRITE | 3 |
| `src/game/scenes/SplashScene.js` | MODIFY | 3 |
| `src/game/scenes/TitleScene.js` | MODIFY | 3 |
| `src/game/scenes/GameOverScene.js` | MODIFY | 3 |
| `CLAUDE.md` | MODIFY | 3 |

**Total: 31 file operations** (6 CREATE, 12 REWRITE, 8 MODIFY, 5 DELETE)

### Glossary

| Term | Definition |
|------|------------|
| Flight Mode | Player state when holding input — float up, intangible, auto-fire |
| Impact Mode | Player state on ground — solid, slides, recharges flight meter |
| Falling | Transition state between flight and impact — accelerating downward |
| Slam | AOE damage event when player hits ground from falling |
| Data Blocker | Floating platform enemy — blocks flight path |
| Chaser Bot | Ground enemy — chases player during Impact mode |
| Gravity Flare | Floating hazard — pulls player downward |
| XP Orb | Collectible dropped by enemies — magnetizes to player on ground |
| Flight Meter | Resource that drains during flight, recharges on ground |
| Kinetic Inversion | The core mechanic toggle between Flight and Impact |
