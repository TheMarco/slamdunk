# Game Starter Kit — CLAUDE.md

> This file turns Claude Code into an expert action/arcade game dev partner.
> Read this entire file before making any changes to the project.

## 1. Project Overview

**What this is:** An action/arcade game boilerplate built on Phaser 3 + Vite + Capacitor. Ships as a playable top-down arena shooter demo, designed to be reshaped into any action/arcade game via the `/new-game` skill.

**Scope:** Top-down shooters, side-scrollers, space shooters, bullet hell, platformers, tower defense, beat-em-ups, racing — the full action/arcade spectrum. NOT puzzle, card, or narrative games.

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
    │   ├── Player.js            # Movement, health, fire cooldown, aim direction
    │   ├── Enemy.js             # Moves toward player, hp=1
    │   ├── FastEnemy.js         # 1.8x speed, diamond shape
    │   ├── TankEnemy.js         # hp=3, square shape, color shifts per hit
    │   ├── Bullet.js            # Directional with prevX/prevY for lerp rendering
    │   ├── PowerUp.js           # Health restore or score bonus, lifetime timer
    │   └── EntityManager.js     # Tracks arrays by type, removeAllDead()
    ├── systems/
    │   ├── InputSystem.js       # Held keys + fire queue, works with synthetic mobile events
    │   ├── CollisionSystem.js   # Circle collision, callback-based
    │   └── SpawnSystem.js       # Weighted pool, entity unlock times, density caps
    ├── config/
    │   └── difficulty.js        # Phases, spawn intervals, speed curves
    ├── audio/
    │   └── SoundEngine.js       # Web Audio API: iOS-safe lazy init, SFX/music gain nodes
    ├── effects/
    │   └── EffectsManager.js    # Particle explosions, screen shake, screen flash
    ├── rendering/
    │   └── EntityRenderer.js    # BOTH Graphics API and Sprite rendering
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

## 3. Rendering — Two Approaches

This boilerplate demonstrates **both** rendering approaches side by side:

### A. Graphics API (Programmatic)
Used for: Player, Bullets, HUD elements

```javascript
// Drawing a player ship (triangle)
gfx.fillStyle(color, 0.8);
gfx.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
gfx.lineStyle(2, color, 1);
gfx.beginPath();
gfx.moveTo(tipX, tipY);
gfx.lineTo(leftX, leftY);
gfx.lineTo(rightX, rightY);
gfx.closePath();
gfx.strokePath();
```

**When to use:** Prototyping, vector aesthetics, procedural effects, games with geometric shapes.

### B. Sprite-Based
Used for: Enemies, PowerUps (with Graphics API fallback)

```javascript
// In scene preload():
this.load.spritesheet('enemy', 'sprites/enemy.png', { frameWidth: 32, frameHeight: 32 });

// In EntityRenderer, sprites are synced with entity positions:
sprite = this.scene.add.sprite(entity.x, entity.y, textureKey);
sprite.setScale(entity.radius / 16);
```

**When to use:** Detailed characters, animation frames, pixel art, production games.

### Switching Everything to One Approach

To go **all Graphics API**: Remove sprite preloading from GameScene, set `_useFallbackGraphics = true` in EntityRenderer.

To go **all Sprites**: Create spritesheets for player and bullets, add sprite sync for those entity types in EntityRenderer.

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

1. Create `src/game/entities/MyEntity.js` extending `Entity` or `Enemy`
2. Add type-specific update logic (movement, behavior)
3. Add to `EntityManager` (new array + add/remove methods if needed)
4. Add to `SpawnSystem` (weight, unlock time, density cap)
5. Add rendering in `EntityRenderer` (Graphics and/or sprite)
6. Add collision handling in `CollisionSystem` if it interacts differently
7. Add to `CONFIG` (speed, radius, colors, etc.)
8. Add to `difficulty.js` unlock table if gated

## 5. Systems

### InputSystem
- Tracks held keys via `keydown`/`keyup` window events
- Returns `{ left, right, up, down, fire }` state each frame
- Fire uses a queue (FIFO) to prevent input loss on rapid taps
- Mobile touch zones dispatch synthetic `KeyboardEvent`s — game code never branches on input type
- Clean up listeners on scene shutdown to prevent leaks

### CollisionSystem
- Circle-based collision: `distanceSq(a, b) < (a.radius + b.radius)²`
- Callback-driven: `onEnemyKilled`, `onPlayerHit`, `onPowerUpCollected`
- Callbacks fire during collision check; actual entity removal happens later in `removeAllDead()`

### SpawnSystem
- **Weighted pool:** Each entity type has a base weight for random selection
- **Unlock times:** Entity types unlock at specific elapsed seconds (not randomly from start)
- **Density caps:** Max concurrent entities of same type (prevents screen flooding)
- **Spawn position:** Random edge of screen (top/right/bottom/left)
- **Difficulty scaling:** Spawn interval and speed multiplier from `difficulty.js`

## 6. Difficulty System

Located in `src/game/config/difficulty.js`. Returns difficulty parameters based on elapsed time:

| Phase | Time | What Changes |
|-------|------|-------------|
| WARMUP | 0-30s | Slow spawns, basic enemies only |
| RAMP | 30-60s | Fast enemies unlock, speed increases |
| MIDGAME | 60-120s | Tanks unlock, faster spawns |
| LATEGAME | 120s+ | Everything unlocked, max pressure |

**Tuning guide:**
- `spawnInterval`: Lower = more enemies. Floor at 400ms prevents unplayable density.
- `speedMultiplier`: Applied to all enemy speeds. Caps at 2.0.
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
- D-pad: UP/DOWN/LEFT/RIGHT zones
- Action buttons: FIRE, PAUSE

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
1. Create class in `entities/` extending `Entity` or `Enemy`
2. Add constants to `config.js` (speed, radius, color, hp)
3. Add to `EntityManager` — usually just push to `enemies[]` array
4. Add spawn logic in `SpawnSystem` — weight, unlock time, density cap
5. Add rendering in `EntityRenderer._drawEnemyGraphics()` for Graphics, or load spritesheet
6. Wire collision callbacks in `GameScene.create()` if special behavior

### How to add a new scene
1. Create `scenes/MyScene.js` extending `Phaser.Scene`
2. Import and add to scene list in `src/game/main.js`
3. Transition with `this.scene.start('MyScene', { optionalData })`

### How to add a sound effect
1. Place MP3 in `public/sounds/`
2. Add `this.loadSound('name', 'sounds/name.mp3')` in `SoundEngine.init()`
3. Call `this.soundEngine.playSound('name')` where needed

### How to switch all rendering to sprites
1. Create spritesheets for player and bullets
2. In `EntityRenderer`, add sprite sync for player/bullet entity types
3. Remove Graphics drawing code for those types
4. Set `_useFallbackGraphics = false` (or remove the flag entirely)

### How to switch all rendering to Graphics API
1. In `EntityRenderer` constructor, set `this._useFallbackGraphics = true`
2. Remove sprite preloading from `GameScene.preload()`
3. Add custom Graphics drawing in `_drawEnemyGraphics()` for each type

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
| PLAYER_SPEED | 200 | Pixels per second |
| PLAYER_RADIUS | 12 | Collision circle radius |
| PLAYER_MAX_HEALTH | 100 | Starting health |
| PLAYER_INVULN_MS | 1500 | Invulnerability after hit |
| BULLET_SPEED | 500 | Bullet pixels per second |
| BULLET_RADIUS | 4 | Bullet collision radius |
| FIRE_COOLDOWN_MS | 150 | Min time between shots |
| ENEMY_SPEED | 80 | Basic enemy speed |
| ENEMY_RADIUS | 12 | Basic enemy collision radius |
| FAST_ENEMY_SPEED | 144 | 1.8x basic speed |
| TANK_ENEMY_SPEED | 50 | Slow but tough |
| TANK_ENEMY_HP | 3 | Hits to kill tank |
| POWERUP_LIFETIME_MS | 8000 | Time before powerup despawns |
| SCORE_PER_KILL | 100 | Base kill score (multiplied) |
| MULTIPLIER_MAX | 5.0 | Max score multiplier |
| MULTIPLIER_DECAY_MS | 3000 | Time before multiplier starts decaying |
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
