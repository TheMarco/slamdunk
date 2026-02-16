# Vector Drift — CLAUDE.md

> This file turns Claude Code into an expert Vector Drift game dev partner.
> Read this entire file before making any changes to the project.

## 1. Project Overview

**What this is:** Vector Drift — a kinetic survival (bullet heaven) game built on Phaser 3 + Vite + Capacitor. Players toggle between Flight Mode (hold = float upward, intangible, auto-fire energy bursts) and Impact Mode (release = plummet, slam enemies with AOE, slide on ground, collect XP orbs). All Graphics API rendering with neon voxel aesthetic on synthwave grid.

**Core mechanic:** Hold Space = fly upward (intangible, drains flight meter, auto-fires downward). Release = fall and slam ground (AOE damage, slides, recharges flight meter, magnetizes XP orbs). Arrow keys = horizontal movement.

**Scope:** Kinetic survival / bullet heaven with dual-state player, three enemy types, XP orb collection, and difficulty ramp.

**Tech stack:**
- **Engine:** Phaser 3 (WebGL)
- **Bundler:** Vite (multi-entry: index.html + game.html)
- **Mobile:** Capacitor (iOS/Android)
- **Desktop:** Electron
- **Language:** ES6 modules, plain JavaScript (no TypeScript)
- **Audio:** Custom Web Audio API wrapper (not Phaser Sound)

**Quick start:**
```bash
npm install
npm run dev        # → http://localhost:8080
npm run build      # → dist/ folder
npm run electron   # → Desktop window
```

## 2. Architecture

### Entry Point Chain

```
game.html
  → src/main.js (bootstrap)
    → document.fonts.ready (wait for custom fonts)
    → isMobile() → toggle desktop/mobile layout
    → StartGame(containerId) → creates Phaser.Game
    → SoundEngine → stored in game.registry
    → Audio init on first user gesture (iOS requirement)
    → Mobile: wire touch zones → synthetic KeyboardEvents
```

### File Structure

```
src/
├── main.js                      # Bootstrap: fonts → detect → game → audio → mobile
└── game/
    ├── main.js                  # Phaser.Game factory (StartGame function)
    ├── config.js                # All constants (frozen CONFIG object)
    ├── state/
    │   └── GameState.js         # score, health, gameOver, elapsed, multiplier
    ├── entities/
    │   ├── Entity.js            # Base: x, y, type, alive, radius, update(), kill()
    │   ├── Player.js            # Dual-state: flight/falling/impact, flight meter, slam
    │   ├── EnergyBurst.js       # Downward projectile (auto-fires in flight mode)
    │   ├── DataBlocker.js       # Floating platform obstacle, drifts horizontally
    │   ├── ChaserBot.js         # Ground enemy, chases player when on ground
    │   ├── GravityFlare.js      # Pull-down hazard with gravity radius
    │   ├── XPOrb.js             # Collectible, magnetizes to player on ground
    │   └── EntityManager.js     # Tracks bursts, blockers, chasers, flares, xpOrbs
    ├── systems/
    │   ├── InputSystem.js       # Hold/release + horizontal, synthetic mobile events
    │   ├── CollisionSystem.js   # State-dependent: intangible in flight, slam AOE
    │   └── SpawnSystem.js       # Vertical trench spawning, density caps, unlock times
    ├── config/
    │   └── difficulty.js        # Phases, spawn intervals, speed curves
    ├── audio/
    │   └── SoundEngine.js       # Web Audio API: iOS-safe lazy init, SFX/music gain nodes
    ├── effects/
    │   └── EffectsManager.js    # Particle explosions, screen shake, screen flash
    ├── rendering/
    │   └── EntityRenderer.js    # All Graphics API, neon voxel aesthetic, synthwave grid
    ├── hud/
    │   └── HUD.js               # Score, health bar, multiplier, warnings
    ├── scenes/
    │   ├── SplashScene.js       # 2s splash → TitleScene
    │   ├── TitleScene.js        # Title + high score + "PRESS SPACE / TAP"
    │   ├── GameScene.js         # Main loop: wires all systems
    │   └── GameOverScene.js     # Final score, high score, restart/menu
    └── utils/
        ├── scaleManager.js      # PIXEL_RATIO cap at 2, scale() function
        ├── deviceDetection.js   # high/medium/low profiles, isMobile()
        ├── math.js              # clamp, lerp, distance, distanceSq, normalize, randomBetween
        ├── highScore.js         # localStorage high score manager
        └── objectPool.js        # Reusable object pool for particles/bullets
```

### Scene Flow

```
SplashScene (2s) → TitleScene → GameScene → GameOverScene → TitleScene
                                    ↑                           │
                                    └───── restart ─────────────┘
```

## 3. Rendering — All Graphics API

Vector Drift uses **only** the Graphics API for rendering. No sprites. Blocky voxel shapes with neon synthwave aesthetic.

### Neon Voxel Style
- Player: mode-colored square (cyan=flight, orange=falling, magenta=impact) with directional indicators
- Data Blockers: wide flat rectangles with warning stripes and HP dots
- Chaser Bots: triangles with eye dots
- Gravity Flares: pulsing diamonds with pull radius indicator
- XP Orbs: glowing squares
- Energy Bursts: small neon squares with glow
- Background: scrolling synthwave grid with center highlight
- Ground: magenta line at GROUND_Y with subtle fill below
- Particles: blocky squares (not circles)

```javascript
// Example: drawing a voxel square
gfx.fillStyle(color, 0.8);
gfx.fillRect(x - s, y - s, s * 2, s * 2);
gfx.lineStyle(2, color, 1);
gfx.strokeRect(x - s, y - s, s * 2, s * 2);
```

## 4. Entity System

### Base Class Pattern

```javascript
export class Entity {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.prevX = x; this.prevY = y;  // for lerp rendering
    this.type = type;
    this.alive = true;
    this.radius = 10;  // collision radius
  }
  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
  }
  kill() { this.alive = false; }
  getColor() { return 0xffffff; }
}
```

### Entity Lifecycle
1. **Created** by SpawnSystem or Player (bullets)
2. **Updated** each frame — `entity.update(dt, player)`
3. **Collision checked** by CollisionSystem
4. **Killed** — `entity.kill()` sets `alive = false`
5. **Removed** — `entityManager.removeAllDead()` runs AFTER all collision callbacks

**Critical pattern:** Dead entity filtering runs after ALL collision callbacks, not during. This prevents issues where killing an entity mid-collision-loop causes skipped checks.

### Adding a New Entity Type

1. Create `src/game/entities/MyEntity.js` extending `Entity`
2. Add type-specific update logic (movement, behavior)
3. Add to `EntityManager` (new array + add/remove methods)
4. Add to `SpawnSystem` (weight, unlock time, density cap)
5. Add rendering method in `EntityRenderer` (Graphics API)
6. Add collision handling in `CollisionSystem` if it interacts differently
7. Add to `CONFIG` (speed, radius, colors, etc.)
8. Add to `difficulty.js` unlock table if gated

## 5. Systems

### InputSystem
- Tracks hold state (Space/W/ArrowUp) for flight toggle
- Tracks horizontal movement (ArrowLeft/A, ArrowRight/D)
- Returns `{ holding, horizontal, justPressed, justReleased }` each frame
- `holding` = true while Space/W/ArrowUp is held (flight mode)
- `horizontal` = -1/0/+1 for left/neutral/right
- Mobile touch zones dispatch synthetic `KeyboardEvent`s — game code never branches on input type
- Clean up listeners on scene shutdown to prevent leaks

### CollisionSystem
- Circle-based collision: `distanceSq(a, b) < (a.radius + b.radius)²`
- State-dependent: player is intangible during flight mode (enemies pass through)
- Slam AOE: when player lands, damages all enemies within `IMPACT_SLAM_RADIUS`
- Callback-driven: `onEnemyKilled`, `onEnemyHit`, `onPlayerHit`, `onXPCollected`, `onSlam`
- Callbacks fire during collision check; actual entity removal happens later in `removeAllDead()`

### SpawnSystem
- **Weighted pool:** Each entity type has a base weight for random selection
- **Unlock times:** Blockers at 0s, Chasers at 15s, Flares at 30s
- **Density caps:** Max concurrent: 8 blockers, 6 chasers, 4 flares
- **Spawn position:** Blockers/Flares from above camera, Chasers from screen edges at ground level
- **Difficulty scaling:** Spawn interval and scroll speed from `difficulty.js`

## 6. Difficulty System

Located in `src/game/config/difficulty.js`. Returns difficulty parameters based on elapsed time:

| Phase | Time | What Changes |
|-------|------|-------------|
| WARMUP | 0-30s | Slow spawns (2500ms), blockers only |
| RAMP | 30-60s | Chasers unlock at 15s, flares at 30s, spawn rate increases |
| MIDGAME | 60-120s | All types active, faster spawns, scroll speeds up |
| LATEGAME | 120s+ | Everything maxed, spawn interval floors at 600ms |

**Tuning guide:**
- `spawnInterval`: Starts at 2500ms, drops by 10ms/sec, floors at 600ms.
- `scrollMultiplier`: Ramps from 1.0 to 2.5 over 200s.
- `speedMultiplier`: Applied to enemy speeds. Caps at 2.0.
- Unlock times in `SpawnSystem.js` control when new enemy types appear.
- Density caps in `SpawnSystem.js` prevent any one type from dominating.

## 7. Audio

### SoundEngine (iOS-Safe)

```javascript
// Stored in game registry — survives scene restarts
game.registry.set('soundEngine', soundEngine);

// Retrieved in any scene
this.soundEngine = this.game.registry.get('soundEngine');
this.soundEngine.playSound('shoot');
```

**iOS requirement:** AudioContext must be created/resumed on user gesture. SoundEngine handles this:
1. Constructor creates no AudioContext
2. `init()` called on first touch/click/keydown event
3. Every `playSound()` calls `ctx.resume()` before playing
4. Gesture listeners for `touchstart`, `touchend`, `click` ensure iOS compliance

**Sound files:** Located in `public/sounds/` and `public/music/`. Currently placeholder MP3s. Replace with real audio (ElevenLabs, Freesound, etc.).

## 8. Mobile

### Touch Layout
`game.html` has a mobile wrapper with:
- Game canvas area (top, flex-grows to fill)
- Touch control bar (bottom, fixed 140px height)
- LEFT button (ArrowLeft), center HOLD button (Space = flight), RIGHT button (ArrowRight)

### Synthetic Events
Touch zones dispatch synthetic `KeyboardEvent`s:
```javascript
window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 32, code: 'Space', key: ' ', bubbles: true }));
```
Game code never checks `isMobile()` for input — it always reads keyboard state.

### Device Detection
`deviceDetection.js` provides:
- `isMobile()` — UA detection
- `getPerformanceProfile()` — 'high', 'medium', 'low' based on hardware
- Override via URL: `?q=low`

### Scaling
- `PIXEL_RATIO` capped at 2 (prevents iPhone Pro 3x GPU melt)
- `scale(value)` multiplies by pixel ratio
- Phaser `Scale.FIT` + `CENTER_BOTH` handles canvas sizing

## 9. How-To Recipes for Claude Code

### How to add a new entity type
1. Create class in `entities/` extending `Entity`
2. Add constants to `config.js` (speed, radius, color, hp)
3. Add to `EntityManager` — new array + add method
4. Add spawn logic in `SpawnSystem` — weight, unlock time, density cap
5. Add rendering method in `EntityRenderer` (Graphics API only)
6. Wire collision callbacks in `GameScene._wireCollisions()` if special behavior

### How to add a new scene
1. Create `scenes/MyScene.js` extending `Phaser.Scene`
2. Import and add to scene list in `src/game/main.js`
3. Transition with `this.scene.start('MyScene', { optionalData })`

### How to add a sound effect
1. Place MP3 in `public/sounds/`
2. Add `this.loadSound('name', 'sounds/name.mp3')` in `SoundEngine.init()`
3. Call `this.soundEngine.playSound('name')` where needed

### How to add sprite rendering
Vector Drift uses all Graphics API rendering. To add sprites:
1. Place spritesheets in `public/sprites/`
2. Add `this.load.spritesheet()` calls in `GameScene.preload()`
3. In `EntityRenderer`, add sprite sync for the entity type
4. Replace or supplement the Graphics API draw method

### How to adjust difficulty curve
1. Edit `src/game/config/difficulty.js`
2. Change `spawnInterval` formula for spawn frequency
3. Change `speedMultiplier` formula for enemy speed
4. Edit unlock times in `SpawnSystem.js` for when types appear
5. Edit density caps in `SpawnSystem.js` for max concurrent

### How to add particle effects
1. Use `EffectsManager.spawnExplosion(x, y, color, count)`
2. For custom effects, add new particle types to `EffectsManager`
3. Particles use `ObjectPool` for memory efficiency

### How to add screen effects
- **Shake:** `this.effects.screenShake(intensity, duration)`
- **Flash:** `this.effects.screenFlash(color, alpha)`
- Both auto-decay over their duration

### How to deploy to iOS
```bash
npm run build
npx cap add ios         # first time only
npx cap sync ios
npx cap open ios        # opens Xcode
```

### How to deploy to Android
```bash
npm run build
npx cap add android     # first time only
npx cap sync android
npx cap open android    # opens Android Studio
```

### How to deploy to Desktop (Electron)
```bash
npm run build
npm run electron
```

### How to add RetroZone shader overlays
```bash
npm install retrozone
```
Then in `src/main.js`, after game creation:
```javascript
import { RetroDisplay } from 'retrozone';
const overlay = new RetroDisplay(game.canvas, { shader: 'crt' });
game.registry.set('shaderOverlay', overlay);
```

### How to adapt for a side-scroller
1. Add gravity to Player: `this.vy += GRAVITY * dt; this.y += this.vy * dt;`
2. Add platform collision (ground check)
3. Change InputSystem to return `{ left, right, jump, fire }` instead of 4-directional
4. Change SpawnSystem to spawn from the right edge only
5. Add scrolling camera: `this.cameras.main.startFollow(player)`
6. Update mobile touch layout for left/right/jump/fire

### How to adapt for a platformer
1. Same as side-scroller, plus:
2. Add Platform entity with collision (one-way or solid)
3. Add wall jump / double jump if desired
4. SpawnSystem becomes level loader instead of continuous spawner
5. Add Checkpoint entity for respawn points

### How to adapt for tower defense
1. Replace Player with cursor/selector
2. Add Tower entity (placement, targeting, firing)
3. Add Creep entity (follows path, hp, speed)
4. Replace SpawnSystem with WaveSystem (predefined wave compositions)
5. InputSystem becomes click/tap for tower placement
6. Add Path/Waypoint system for creep movement

## 10. Gotchas & Pitfalls

**Every one of these was learned the hard way across 6 shipped projects:**

| Gotcha | Solution |
|--------|----------|
| iOS audio silent on load | Lazy AudioContext init on first gesture + `ctx.resume()` before every play |
| Fonts render as fallback | `document.fonts.ready` BEFORE Phaser game creation |
| SoundEngine lost on scene restart | Store in `game.registry` — persists across scenes |
| Mobile input doesn't work | Use synthetic `KeyboardEvent` dispatch from touch zones |
| Touch events fire multiple times | Use `e.preventDefault()` on touch handlers |
| Entities disappear mid-collision | Run `removeAllDead()` AFTER all collision callbacks, never during |
| iPhone 3x device lag | Cap `PIXEL_RATIO` at 2 — 3x melts mobile GPUs |
| Entity pops in/out visually | Use `prevX/prevY` for lerp rendering between frames |
| Score doesn't feel rewarding | Multiplier builds on consecutive kills, resets on hit |
| Game too hard immediately | Gate entity types behind elapsed time (unlock system) |
| Screen flooded with one type | Density caps per entity type in SpawnSystem |
| Memory leak on scene restart | Clean up event listeners in scene `shutdown` event |
| Build fails with import errors | All imports use `.js` extension — ES6 modules require it |
| Canvas blurry on retina | Use `scale()` utility for all render positions/sizes |

## 11. CONFIG Reference

All game constants in `src/game/config.js` (frozen, immutable at runtime):

| Constant | Value | Description |
|----------|-------|-------------|
| WIDTH / HEIGHT | 800 / 600 | Game canvas resolution |
| PLAYER_HORIZONTAL_SPEED | 250 | Left/right movement speed |
| PLAYER_RADIUS | 10 | Collision circle radius |
| PLAYER_MAX_HEALTH | 100 | Starting health |
| PLAYER_INVULN_MS | 1500 | Invulnerability after hit |
| FLIGHT_RISE_SPEED | 120 | Upward float speed |
| FLIGHT_METER_MAX | 100 | Flight meter capacity |
| FLIGHT_METER_DRAIN | 20 | Drain per second while flying |
| FLIGHT_METER_RECHARGE | 35 | Recharge per second on ground |
| FLIGHT_FIRE_COOLDOWN_MS | 300 | Auto-fire interval in flight |
| FLIGHT_FIRE_SPEED | 400 | Energy burst speed (downward) |
| IMPACT_FALL_ACCEL | 800 | Gravity acceleration (px/s^2) |
| IMPACT_SLAM_RADIUS | 60 | AOE damage radius on landing |
| IMPACT_SLAM_DAMAGE | 2 | Damage dealt on slam |
| IMPACT_SLIDE_SPEED | 180 | Ground slide speed |
| GROUND_Y | 500 | Ground level (pixels from top) |
| BLOCKER_HP | 2 | Hits to destroy data blocker |
| CHASER_SPEED | 100 | Chaser bot movement speed |
| FLARE_PULL_RADIUS | 120 | Gravity flare pull range |
| XP_ORB_MAGNET_SPEED | 300 | Speed when magnetized to player |
| MULTIPLIER_MAX | 5.0 | Max score multiplier |
| ARENA_MARGIN | 40 | Spawn distance from edge |

## 12. Optional Add-Ons

| Add-On | What | How |
|--------|------|-----|
| **RetroZone CRT/Vector** | WebGL post-processing | `npm i retrozone` + wrap canvas |
| **RetroZone glow** | Multi-pass glow effect | Import glow functions, ADD blend mode |
| **Tauri desktop** | Smaller than Electron | Add `src-tauri/` config |
| **Save system** | Persist progress | localStorage + JSON serialization |
| **Backend** | Leaderboards, analytics | Supabase / Firebase patterns |
| **Test suite** | Automated game tests | Vitest — test entity logic, collision math |
| **AI sounds** | Professional audio | Generate with ElevenLabs SFX, Freesound |
