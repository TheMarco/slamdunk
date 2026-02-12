# Game Starter Kit

Action/arcade game boilerplate for Phaser 3. Ships as a playable top-down arena shooter demo. Designed to be reshaped into any action/arcade game using Claude Code.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:8080` and click PLAY. Controls: WASD/Arrows to move, Space to shoot.

## Using with Claude Code

This boilerplate is built for use with Claude Code. The `CLAUDE.md` file turns Claude Code into an expert action game dev partner.

1. Clone this repo and `npm install`
2. Open Claude Code in the project directory
3. Run `/new-game` to describe your game vision
4. Claude Code reshapes the boilerplate to match your game
5. Iterate: "add a boss", "make enemies faster", "add a shield power-up"

## Demo Game

The included demo is a **top-down arena shooter**: player at center, enemies spawn from edges, shoot to survive. It demonstrates:

- **Graphics API rendering** (player, bullets) — programmatic shapes, no assets needed
- **Sprite-based rendering** (enemies, powerups) — full asset pipeline with spritesheets
- Both approaches side-by-side so you can see how each works

## Architecture

```
src/main.js        → Bootstrap (fonts, device detect, audio init, mobile wiring)
src/game/main.js   → Phaser.Game factory
src/game/config.js → All game constants (frozen CONFIG object)
src/game/scenes/   → SplashScene → TitleScene → GameScene → GameOverScene
src/game/entities/ → Entity hierarchy (Player, Enemy types, Bullet, PowerUp)
src/game/systems/  → InputSystem, CollisionSystem, SpawnSystem
src/game/config/   → difficulty.js (progression tuning)
src/game/audio/    → SoundEngine (iOS-safe Web Audio API)
src/game/effects/  → EffectsManager (particles, shake, flash)
src/game/rendering/→ EntityRenderer (Graphics API + Sprites)
src/game/hud/      → HUD (score, health, multiplier, warnings)
src/game/utils/    → math, highScore, objectPool, scaleManager, deviceDetection
```

## Audio

Sound files are placeholders — silent MP3s showing the audio pipeline. Replace them with real sounds:

- `public/sounds/shoot.mp3` — Player fires
- `public/sounds/explode.mp3` — Enemy killed
- `public/sounds/hit.mp3` — Player hit
- `public/sounds/powerup.mp3` — Power-up collected
- `public/sounds/death.mp3` — Game over
- `public/music/track.mp3` — Background music

Generate game sounds with ElevenLabs Sound Effects, Freesound, or record your own.

## Sprites

Placeholder spritesheets in `public/sprites/`. Replace with your own:

- `enemy.png` — 32x32 spritesheet
- `fast_enemy.png` — 32x32 spritesheet
- `tank_enemy.png` — 32x32 spritesheet
- `powerup.png` — 24x24 spritesheet
- `explosion.png` — 32x32 spritesheet

The game works without custom sprites — it falls back to Graphics API rendering with colored shapes.

## Building

```bash
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run electron     # Desktop (Electron)
```

## Mobile (Capacitor)

```bash
npm run build
npx cap add ios      # First time only
npx cap sync ios
npx cap open ios     # Opens Xcode
```

## Project Patterns

This boilerplate is built on patterns from 6 shipped games:

- **iOS audio:** Lazy AudioContext init on first gesture + ctx.resume() before every play
- **Mobile input:** Touch zones dispatch synthetic KeyboardEvents — game code never branches on input type
- **Entity lifecycle:** Create → update → collide → kill → removeAllDead (dead filtering runs AFTER all callbacks)
- **Difficulty gating:** New entity types unlock at specific elapsed times
- **Density caps:** Max concurrent entities of each type to prevent screen flooding
- **PIXEL_RATIO cap at 2:** Prevents GPU meltdown on iPhone Pro (3x) devices
- **Frozen CONFIG:** All constants inspectable at a glance, never modified at runtime

## Support me!

If like this and you want to support my efforts, consider purchasing one of my games in the [Apple App Store](https://apps.apple.com/us/developer/marco-van-hylckama-vlieg/id1869986586).


## License

MIT
