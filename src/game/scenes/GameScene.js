import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { GameState } from '../state/GameState.js';
import { EntityManager } from '../entities/EntityManager.js';
import { Player } from '../entities/Player.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { EntityRenderer } from '../rendering/EntityRenderer.js';
import { HUD } from '../hud/HUD.js';
import { EffectsManager } from '../effects/EffectsManager.js';
import { checkHighScore } from '../utils/highScore.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load sprite assets for enemies/powerups (demonstrating sprite pipeline)
    this.load.spritesheet('enemy', 'sprites/enemy.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fast_enemy', 'sprites/fast_enemy.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('tank_enemy', 'sprites/tank_enemy.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('powerup', 'sprites/powerup.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('explosion', 'sprites/explosion.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    this.cameras.main.setBackgroundColor(CONFIG.COLORS.BG);
    this.soundEngine = this.game.registry.get('soundEngine');

    // Core systems
    this.state = new GameState();
    this.entityManager = new EntityManager();
    this.player = new Player(CONFIG.CENTER_X, CONFIG.CENTER_Y);
    this.entityManager.setPlayer(this.player);

    this.inputSystem = new InputSystem(this);
    this.collisionSystem = new CollisionSystem();
    this.spawnSystem = new SpawnSystem(this.entityManager, this.state);
    this.effects = new EffectsManager(this);

    // Graphics layers
    this.gfx = this.add.graphics();

    // Renderer and HUD
    this.entityRenderer = new EntityRenderer(this);
    this.hud = new HUD(this);

    // Wire collision callbacks
    this.collisionSystem.onEnemyKilled = (enemy, bullet) => {
      this.state.addKill();
      if (this.soundEngine) this.soundEngine.playSound('explode');
      this.effects.spawnExplosion(enemy.x, enemy.y, enemy.getColor());
    };
    this.collisionSystem.onPlayerHit = (enemy) => {
      this.state.takeDamage(20);
      if (this.soundEngine) this.soundEngine.playSound('hit');
      this.effects.screenFlash(0xff0000, 0.3);
      this.effects.screenShake(4, 200);
      this.state.resetMultiplier();
      if (this.state.health <= 0) {
        this._gameOver();
      }
    };
    this.collisionSystem.onPowerUpCollected = (powerup) => {
      if (powerup.subtype === 'health') {
        this.state.heal(CONFIG.POWERUP_HEALTH_RESTORE);
        if (this.soundEngine) this.soundEngine.playSound('powerup');
      } else {
        this.state.addScore(CONFIG.POWERUP_SCORE_BONUS);
        if (this.soundEngine) this.soundEngine.playSound('powerup');
      }
      this.effects.spawnExplosion(powerup.x, powerup.y, powerup.getColor());
    };

    // Start music
    if (this.soundEngine) {
      this.soundEngine.startMusic();
    }

    // Pause
    this._paused = false;
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.state.gameOver) return;
      this._paused = !this._paused;
      if (this._paused && this.soundEngine) this.soundEngine.pauseMusic();
      if (!this._paused && this.soundEngine) this.soundEngine.resumeMusic();
    });
  }

  _gameOver() {
    this.state.gameOver = true;
    this.state.newHighScore = checkHighScore(this.state.score);
    if (this.soundEngine) {
      this.soundEngine.playSound('death');
      this.soundEngine.stopMusic();
    }
    this.effects.screenFlash(0xffffff, 0.5);
    this.effects.screenShake(8, 500);

    this.time.delayedCall(2000, () => {
      this.scene.start('GameOverScene', {
        score: this.state.score,
        newHighScore: this.state.newHighScore,
      });
    });
  }

  update(time, delta) {
    if (this._paused || this.state.gameOver) {
      this.hud.update(this.state, this.player);
      return;
    }

    const dt = delta / 1000;
    this.state.elapsed += delta;

    // Update systems
    const input = this.inputSystem.update(delta);
    this.player.update(dt, input);
    this.spawnSystem.update(delta, this.player);
    this.entityManager.updateAll(dt, this.player);
    this.collisionSystem.update(this.player, this.entityManager);
    this.entityManager.removeAllDead();
    this.effects.update(delta);

    // Fire bullets
    if (input.fire && this.player.canFire()) {
      const bullet = this.player.fire(input);
      if (bullet) {
        this.entityManager.addBullet(bullet);
        if (this.soundEngine) this.soundEngine.playSound('shoot');
      }
    }

    // Render
    this.gfx.clear();
    this.entityRenderer.draw(this.gfx, this.player, this.entityManager, dt);
    this.hud.update(this.state, this.player);
  }
}
