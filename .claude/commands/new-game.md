You are reshaping this game boilerplate into the user's specific game. This is the most important workflow in the project.

## Step 1: Gather the Vision

Ask the user to describe their game. Use these questions to guide the conversation:

1. **What kind of game?** (e.g., "side-scrolling space shooter", "tower defense", "platformer", "bullet hell", "racing game")
2. **What's the theme/setting?** (e.g., "retro sci-fi", "medieval fantasy", "underwater", "cyberpunk")
3. **Core mechanic?** (e.g., "dodge and shoot", "place towers to stop waves", "jump between platforms")
4. **Visual style preference?** ("programmatic/vector shapes" or "sprite-based" or "mix of both")

## Step 2: Rename the Project

Once you understand the vision:

1. Update `package.json` — change `name` field to the game's name (kebab-case)
2. Update `index.html` — change `<title>` and heading text
3. Update `game.html` — change `<title>`
4. Update scene title text in `TitleScene.js` and `SplashScene.js`
5. Update `capacitor.config.json` — change `appId` and `appName`
6. Update `src/game/utils/highScore.js` — change `STORAGE_KEY` to match new game name

## Step 3: Reshape Entity Types

Based on the game type, adapt the entity hierarchy:

**Top-down shooter** (current default): Player, Enemy, FastEnemy, TankEnemy, Bullet, PowerUp — keep as-is
**Side-scroller**: Player (gravity + jump), Enemy (patrol patterns), Bullet, Platform, Collectible
**Platformer**: Player (jump/run), Enemy (AI patrol), Platform, Hazard, Collectible, Checkpoint
**Tower defense**: Tower, Creep, Projectile, Wave, Path — restructure EntityManager for tower placement
**Bullet hell**: Player, Boss, BulletPattern, PowerUp — focus on bullet spawning patterns
**Racing**: Vehicle, Obstacle, Track, Checkpoint, PowerUp

For each adaptation:
- Create/modify entity classes in `src/game/entities/`
- Update `EntityManager.js` to track the new entity types
- Keep the base `Entity.js` class — just extend it differently

## Step 4: Adapt InputSystem

Reshape `src/game/systems/InputSystem.js` based on game type:

- **360 movement** (top-down): WASD/arrows for 8-direction movement + space to fire (current)
- **Platformer**: Left/right movement + jump + optional fire
- **Side-scroller**: Up/down/left/right + fire
- **Tower defense**: Mouse/touch for tower placement + keyboard shortcuts
- **Racing**: Left/right steering + accelerate/brake

Update the `update()` method to return the appropriate input state for the game type.
Update the mobile touch layout in `game.html` to match the new controls.

## Step 5: Reshape SpawnSystem

Adapt `src/game/systems/SpawnSystem.js`:

- **Wave-based**: Predefined waves with specific enemy compositions
- **Continuous** (current): Enemies spawn at intervals based on difficulty
- **Triggered**: Enemies spawn based on player position/actions
- **Level-based**: Entities placed at level load time, not spawned dynamically

## Step 6: Adjust CollisionSystem

Adapt `src/game/systems/CollisionSystem.js` callbacks:

For each game type, identify the collision pairs:
- What hits what? (bullets → enemies, player → hazards, player → collectibles, etc.)
- What happens on collision? (damage, score, pickup, bounce, etc.)

Keep the callback pattern (`onEnemyKilled`, `onPlayerHit`, etc.) — just rename and rewire.

## Step 7: Update Difficulty

Adapt `src/game/config/difficulty.js`:

- **Arcade**: Continuous escalation (current) — speed, spawn rate, enemy variety
- **Level-based**: Discrete difficulty jumps between levels
- **Wave-based**: Difficulty increases per wave, with breather waves
- **Adaptive**: Difficulty adjusts based on player performance

## Step 8: Update CONFIG

Modify `src/game/config.js`:

- Rename game-specific constants
- Adjust speeds, sizes, colors to match the new game's feel
- Add any new constants the game type needs (gravity, jump force, etc.)

## Step 9: Suggest Rendering Approach

Based on the game type and visual style:

- **Programmatic/Vector**: Use Phaser Graphics API — great for geometric games, retro aesthetics
  - Show how to modify `EntityRenderer.js` to draw all entities with Graphics
  - Explain the glow/vector aesthetic patterns from the reference projects

- **Sprite-based**: Use spritesheets — great for detailed characters, animations
  - Show how to modify `EntityRenderer.js` to use sprites for everything
  - Explain the asset pipeline: create sprites → place in `public/sprites/` → preload in scene

- **Mix** (current default): Best of both worlds
  - Player/effects with Graphics, characters/items with sprites

## Step 10: Update CLAUDE.md

This is critical. After reshaping:

1. Update the project overview section with the new game's name and description
2. Update the entity system documentation to match new entity types
3. Update the systems documentation for changed Input/Collision/Spawn behavior
4. Update the difficulty section if the progression changed
5. Add game-specific "How to..." recipes relevant to the new game type
6. Keep all the architecture docs, gotchas, and platform info intact

## Checklist Before Done

- [ ] `npm run dev` works and shows the reshaped game
- [ ] All renamed files compile without errors
- [ ] Entity types match the game vision
- [ ] Input controls match the game type
- [ ] Collision callbacks are wired correctly
- [ ] CONFIG constants make sense for the new game
- [ ] CLAUDE.md is updated with game-specific info
- [ ] High score storage key is unique to this game

---

Remember: The goal is to get the user from "generic boilerplate" to "MY game's foundation" in one session. Don't just rename things — reshape the systems to genuinely fit what they described.
