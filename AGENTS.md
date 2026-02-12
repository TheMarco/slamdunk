# AGENTS.md — Agent Conventions & Workflows

## Code Style

- **ES6 modules** with `.js` extension on all imports
- **Plain JavaScript** — no TypeScript, no JSX
- **camelCase** for variables, functions, methods
- **PascalCase** for classes and scene names
- **UPPER_SNAKE_CASE** for constants in `config.js`
- **Single quotes** for strings in JavaScript
- **2-space indentation** throughout
- No semicolons? This project uses semicolons.

## File Organization

- One class per file, file named after the class
- Entities in `src/game/entities/`
- Systems in `src/game/systems/`
- Scenes in `src/game/scenes/`
- Utilities in `src/game/utils/`
- All game constants in `src/game/config.js` (frozen CONFIG object)
- Difficulty tuning isolated in `src/game/config/difficulty.js`

## Architecture Rules

1. **CONFIG is frozen.** Never modify CONFIG at runtime. If you need dynamic values, put them in GameState or difficulty.js.
2. **SoundEngine in registry.** Always access via `this.game.registry.get('soundEngine')`. Never create new instances.
3. **Callback-based systems.** Systems communicate via callbacks (`onEnemyKilled`, `onPlayerHit`), not event buses.
4. **Entity lifecycle.** Create → update → collide → kill → removeAllDead. Never remove entities during collision checks.
5. **Input abstraction.** Game code reads keyboard state only. Mobile uses synthetic KeyboardEvents.
6. **Scene data passing.** Use `this.scene.start('SceneName', { data })` and `init(data)` in the target scene.

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Entity class | PascalCase, descriptive | `FastEnemy`, `TankEnemy`, `PowerUp` |
| Entity type string | snake_case | `'fast_enemy'`, `'tank_enemy'` |
| System class | PascalCase + "System" | `InputSystem`, `CollisionSystem` |
| Scene class | PascalCase + "Scene" | `GameScene`, `TitleScene` |
| Config constant | UPPER_SNAKE_CASE | `PLAYER_SPEED`, `FIRE_COOLDOWN_MS` |
| Color constant | UPPER_SNAKE_CASE | `COLORS.ENEMY`, `COLORS.PLAYER` |
| Callback | camelCase with "on" prefix | `onEnemyKilled`, `onPlayerHit` |
| Private method | underscore prefix | `_getSpawnPosition()`, `_pickType()` |

## Workflow Patterns

### Adding a Feature
1. Read this file and CLAUDE.md first
2. Check if CONFIG needs new constants
3. Check if entities/systems need modification
4. Implement the change
5. Test with `npm run dev`
6. Verify mobile layout isn't broken

### Debugging
- Add `?q=low` to URL to test low-performance mode
- Check browser console for sound loading errors (expected with placeholders)
- Use Phaser's built-in physics debug: set `arcade: { debug: true }` in game config
- Check `GameState` values by logging in `GameScene.update()`

### Testing Builds
```bash
npm run build          # Production build → dist/
npm run preview        # Preview production build locally
npx cap sync ios       # Sync to iOS (after build)
npm run electron       # Desktop via Electron
```

## Common Tasks

| Task | Files to Touch |
|------|---------------|
| New entity type | `entities/`, `EntityManager.js`, `SpawnSystem.js`, `EntityRenderer.js`, `config.js` |
| New scene | `scenes/`, `src/game/main.js` |
| New sound | `public/sounds/`, `SoundEngine.js` |
| Change controls | `InputSystem.js`, `game.html` (touch layout) |
| Adjust difficulty | `config/difficulty.js`, `SpawnSystem.js` |
| Change rendering | `EntityRenderer.js` |
| Add HUD element | `hud/HUD.js` |
| Add visual effect | `effects/EffectsManager.js` |
