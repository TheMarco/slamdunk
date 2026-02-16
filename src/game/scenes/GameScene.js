import Phaser from 'phaser';
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
import { PowerUp } from '../entities/PowerUp.js';
import { CONFIG } from '../config.js';
import { getDifficulty } from '../config/difficulty.js';
import { checkHighScore, setHighScore } from '../utils/highScore.js';
import { getPerformanceProfile } from '../utils/deviceDetection.js';
import { CRTPostFXPipeline } from '../rendering/CRTPostFXPipeline.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // No sprites to load — all Graphics API
  }

  create() {
    this.cameras.main.setBackgroundColor(CONFIG.BG);

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

    // Additive glow layer (Phase 2) — behind main gfx
    this.glowGfx = this.add.graphics().setDepth(-1);
    this.glowGfx.setBlendMode(Phaser.BlendModes.ADD);

    // Camera/scroll tracking
    this.scrollY = 0;
    this.scrollSpeed = CONFIG.SCROLL_SPEED_BASE;

    // Sound
    this.soundEngine = this.game.registry.get('soundEngine');
    if (this.soundEngine) this.soundEngine.startMusic();

    // Wire collision callbacks
    this._wireCollisions();

    // PostFX setup (Phase 1 + Phase 3)
    this._setupPostFX();

    // Camera breathe state (Phase 7)
    this._breathePhase = 0;

    // Pause on ESC
    this.input.keyboard.on('keydown-ESC', () => {
      this._paused = !this._paused;
    });

    this._paused = false;
    this._gameOverTriggered = false;
  }

  // =============================================
  //  PostFX SETUP (Phases 1 + 3)
  // =============================================
  _setupPostFX() {
    const profile = getPerformanceProfile();
    const cam = this.cameras.main;

    this._bloom = null;
    this._crtPipeline = null;

    if (profile !== 'low') {
      // Phase 1: Bloom — all neon colors bleed light
      this._bloom = cam.postFX.addBloom(0xffffff, 1, 1, 1, 1.2, 4);

      // Phase 1: Barrel distortion — subtle CRT screen bulge
      cam.postFX.addBarrel(1.02);

      // Phase 3: CRT scanline shader (high perf only)
      if (profile === 'high') {
        try {
          const renderer = this.game.renderer;
          if (renderer && renderer.pipelines) {
            renderer.pipelines.addPostPipeline('CRTPostFX', CRTPostFXPipeline);
            cam.setPostPipeline(CRTPostFXPipeline);
            const pipelines = cam.getPostPipeline(CRTPostFXPipeline);
            this._crtPipeline = Array.isArray(pipelines) ? pipelines[0] : pipelines;
          }
        } catch (e) {
          // CRT shader failed to initialize — skip gracefully
        }
      }
    }
  }

  // =============================================
  //  DYNAMIC PostFX (Phases 1 + 3 + 7)
  // =============================================
  _updatePostFX(dt) {
    // Phase 1: Dynamic bloom — intensifies in flight mode
    if (this._bloom) {
      const targetStrength = this.player.mode === 'flight' ? 1.4 : 1.2;
      this._bloom.strength += (targetStrength - this._bloom.strength) * 0.1;
    }

    // Phase 7: Camera breathe — tiny sine oscillation
    if (this._shakeElapsed >= this._shakeDuration) {
      this._breathePhase += dt * 2;
      const cam = this.cameras.main;
      const bx = Math.sin(this._breathePhase) * 0.5;
      const by = Math.cos(this._breathePhase * 0.7) * 0.3;
      cam.setScroll(bx, by);
    }
  }

  // =============================================
  //  SCREEN JUICE HELPERS (Phase 7)
  // =============================================
  _zoomPulse() {
    const cam = this.cameras.main;
    cam.zoomTo(1.02, 80, 'Sine.easeOut', false, (cam, progress) => {
      if (progress === 1) {
        cam.zoomTo(1.0, 120, 'Sine.easeIn');
      }
    });
  }

  _hitFreeze(durationMs) {
    this.time.timeScale = 0.1;
    this.time.delayedCall(durationMs * 0.1, () => {
      this.time.timeScale = 1.0;
    });
  }

  _chromaSpike(amount, durationMs) {
    if (this._crtPipeline) {
      this._crtPipeline.spikeChroma(amount, durationMs);
    }
  }

  get _shakeElapsed() {
    return this.effects ? this.effects._shakeElapsed : 0;
  }

  get _shakeDuration() {
    return this.effects ? this.effects._shakeDuration : 0;
  }

  _wireCollisions() {
    this.collisionSystem.onEnemyKilled = (enemy, source) => {
      this.gameState.kills++;
      this.gameState.registerKill();
      this.gameState.addScore(enemy.scoreValue || 100);
      this.gameState.bumpMultiplier(CONFIG.MULTIPLIER_INCREMENT);
      this.effects.spawnEnemyDeathEffect(enemy.x, enemy.y, enemy.getColor());
      if (this.soundEngine) this.soundEngine.playSound('explode');

      // Drop XP orb
      this.entityManager.addXPOrb(new XPOrb(enemy.x, enemy.y));

      // Power-up drop chance (15%)
      if (Math.random() < CONFIG.POWERUP_DROP_CHANCE) {
        this.entityManager.addPowerUp(new PowerUp(enemy.x, enemy.y));
      }

      // Score popup
      if (this.hud.spawnPopup) {
        const comboMult = this.gameState.getComboMultiplier();
        const score = Math.floor((enemy.scoreValue || 100) * this.gameState.multiplier * comboMult);
        this.hud.spawnPopup(enemy.x, enemy.y - 20, `+${score}`, '#ffffff', 14);
      }

      // Combo milestone popups + Phase 7 juice
      const combo = this.gameState.comboCount;
      if (combo === 3 && this.hud.spawnPopup) {
        this.hud.spawnPopup(this.player.x, this.player.y - 40, 'COMBO x2!', '#ffdd44', 18);
      } else if (combo === 5 && this.hud.spawnPopup) {
        this.hud.spawnPopup(this.player.x, this.player.y - 40, 'COMBO x3!', '#ff6600', 20);
        // Phase 7: hit-freeze at combo 5
        this._hitFreeze(50);
        this.effects.screenFlash(0xffaa00, 0.08);
      } else if (combo === 10 && this.hud.spawnPopup) {
        this.hud.spawnPopup(this.player.x, this.player.y - 40, 'COMBO x5!', '#ff00ff', 24);
        // Phase 7: hit-freeze at combo 10
        this._hitFreeze(50);
        this.effects.screenFlash(0xff00ff, 0.1);
      } else if (combo === 20 && this.hud.spawnPopup) {
        this.hud.spawnPopup(this.player.x, this.player.y - 40, 'INSANE!', '#ff0000', 28);
        // Phase 7: hit-freeze at combo 20
        this._hitFreeze(50);
        this.effects.screenFlash(0xff4400, 0.12);
      }
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
        // Phase 3: chroma spike on damage
        this._chromaSpike(0.003, 200);
      } else if (this.player.shieldActive === false && this.player.invulnTimer > 0) {
        this.effects.spawnExplosion(this.player.x, this.player.y, 0x00ff88, 10);
        this.effects.screenFlash(0x00ff88, 0.15);
        if (this.soundEngine) this.soundEngine.playSound('powerup');
      }
    };

    this.collisionSystem.onXPCollected = (orb) => {
      this.gameState.xpCollected += orb.value;
      this.gameState.addScore(CONFIG.SCORE_PER_XP);
      this.gameState.bumpMultiplier(CONFIG.MULTIPLIER_INCREMENT);
      this.effects.spawnXPCollectEffect(orb.x, orb.y);
      if (this.soundEngine) this.soundEngine.playSound('powerup');
      // Phase 7: lime flash on XP collect
      this.effects.screenFlash(0x88ff00, 0.05);
    };

    this.collisionSystem.onSlam = (x, y, count) => {
      this.gameState.slamCount++;
      this.effects.spawnSlamEffect(x, y);
      if (this.soundEngine) this.soundEngine.playSound('explode');
      // Phase 7: zoom pulse on slam
      this._zoomPulse();
      // Phase 3: chroma spike on slam
      this._chromaSpike(0.004, 150);
    };

    this.collisionSystem.onShieldBlock = (drone, burst) => {
      this.effects.spawnDeflectEffect(drone.x, drone.y);
      if (this.soundEngine) this.soundEngine.playSound('hit');
    };

    this.collisionSystem.onPowerUpCollected = (pu) => {
      if (this.soundEngine) this.soundEngine.playSound('powerup');
      switch (pu.powerType) {
        case 'FLIGHT_RECHARGE':
          this.player.flightMeter = CONFIG.FLIGHT_METER_MAX;
          if (this.hud.spawnPopup) this.hud.spawnPopup(pu.x, pu.y - 20, 'FLIGHT RECHARGED!', '#00ffff', 16);
          break;
        case 'SCORE_BOOST':
          this.gameState.scoreBoostTimer = CONFIG.SCORE_BOOST_DURATION_MS;
          if (this.hud.spawnPopup) this.hud.spawnPopup(pu.x, pu.y - 20, 'SCORE x2!', '#ffdd44', 16);
          break;
        case 'SHIELD':
          this.player.shieldActive = true;
          if (this.hud.spawnPopup) this.hud.spawnPopup(pu.x, pu.y - 20, 'SHIELD!', '#00ff88', 16);
          break;
        case 'SLAM_PLUS':
          this.player.slamPlusActive = true;
          if (this.hud.spawnPopup) this.hud.spawnPopup(pu.x, pu.y - 20, 'MEGA SLAM!', '#ff00ff', 16);
          break;
      }
      this.effects.spawnExplosion(pu.x, pu.y, pu.getColor(), 8);
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
    this.gameState.phaseReached = diff.phase;

    // 3. Player update
    const prevMode = this.player.mode;
    this.player.update(dt, input, this.scrollSpeed);

    // Mode transition effects
    if (prevMode !== this.player.mode) {
      if (this.player.mode === 'flight') {
        this.effects.spawnFlightTrail(this.player.x, this.player.y);
        this.effects.screenFlash(CONFIG.PLAYER_FLIGHT, 0.15);
        this.effects.spawnRing(this.player.x, this.player.y, 30, CONFIG.PLAYER_FLIGHT);
      } else if (this.player.mode === 'falling') {
        this.effects.screenFlash(CONFIG.PLAYER_FALLING, 0.1);
      }
    }

    // Continuous flight trail particles
    if (this.player.mode === 'flight') {
      this.effects.spawnFlightParticle(this.player.x, this.player.y);
    }

    // Speed lines during falling
    if (this.player.mode === 'falling' && this.player.vy > 100) {
      this.effects.spawnSpeedLines(this.player.x, this.player.y, this.player.vy);
    }

    // Auto-fire in flight mode
    const fireData = this.player.fire();
    if (fireData) {
      this.entityManager.addBurst(new EnergyBurst(fireData.x, fireData.y));
      if (this.soundEngine) this.soundEngine.playSound('shoot');
    }

    // 4. Spawn enemies
    this.spawnSystem.update(dt, 0);

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
    this.effects.update(delta);

    // 10. Render (pass gameState for phase-based grid tinting)
    this.entityRenderer.draw(this.gfx, this.player, this.entityManager, dt, this.gameState);

    // 10.5 Additive glow layer (Phase 2)
    this.entityRenderer.drawGlowLayer(this.glowGfx, this.player, this.entityManager);

    // 11. Draw effects on top
    this.effects.drawParticles(this.gfx);

    // 12. HUD
    this.hud.update(this.gameState, this.player, this._paused);

    // 13. Dynamic PostFX + camera breathe (Phases 1, 3, 7)
    this._updatePostFX(dt);

    // 14. Game over check
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

    // Death sequence: slow-mo + massive explosion + rings + shake + flash
    this.time.timeScale = 0.3;

    // Massive explosion
    this.effects.spawnExplosion(this.player.x, this.player.y, this.player.getColor(), 40);
    this.effects.spawnExplosion(this.player.x, this.player.y, 0xffffff, 20);

    // Expanding rings
    this.effects.spawnRing(this.player.x, this.player.y, 100, CONFIG.PLAYER_IMPACT);
    this.effects.spawnRing(this.player.x, this.player.y, 150, CONFIG.PLAYER_FLIGHT);

    // Screen effects
    this.effects.screenShake(15, 1000);
    this.effects.screenFlash(0xffffff, 0.6);

    // Phase 3: heavy chroma spike on death
    this._chromaSpike(0.006, 800);

    const isHighScore = checkHighScore(this.gameState.score);
    if (isHighScore) setHighScore(this.gameState.score);

    this.time.delayedCall(1500, () => {
      this.time.timeScale = 1.0;
      this.scene.start('GameOverScene', {
        score: this.gameState.score,
        kills: this.gameState.kills,
        slamCount: this.gameState.slamCount,
        bestCombo: this.gameState.bestCombo,
        phaseReached: this.gameState.phaseReached,
        isHighScore,
      });
    });
  }
}
