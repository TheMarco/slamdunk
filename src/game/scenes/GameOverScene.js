import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { getHighScore } from '../utils/highScore.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.newHighScore = data.newHighScore || false;
  }

  create() {
    this.cameras.main.setBackgroundColor(CONFIG.COLORS.BG);
    const cx = CONFIG.CENTER_X;
    const cy = CONFIG.CENTER_Y;

    this.add.text(cx, cy - 80, 'GAME OVER', {
      fontFamily: 'Courier New',
      fontSize: '40px',
      color: '#ff4444',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 20, `SCORE: ${this.finalScore}`, {
      fontFamily: 'Courier New',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    if (this.newHighScore) {
      this.add.text(cx, cy + 20, 'NEW HIGH SCORE!', {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#ffdd44',
        align: 'center',
      }).setOrigin(0.5);
    } else {
      const hi = getHighScore();
      this.add.text(cx, cy + 20, `HIGH SCORE: ${hi}`, {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#888888',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Pulsing restart prompt
    this.prompt = this.add.text(cx, cy + 80, 'PRESS SPACE TO RESTART', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#00ff88',
      align: 'center',
    }).setOrigin(0.5);
    this.promptAlpha = 1;
    this.promptDir = -1;

    this.add.text(cx, cy + 120, 'PRESS M FOR MENU', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#444444',
      align: 'center',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
    this.input.keyboard.on('keydown-M', () => {
      this.scene.start('TitleScene');
    });
    this.input.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }

  update(_time, delta) {
    this.promptAlpha += this.promptDir * delta / 600;
    if (this.promptAlpha <= 0.3) {
      this.promptAlpha = 0.3;
      this.promptDir = 1;
    } else if (this.promptAlpha >= 1.0) {
      this.promptAlpha = 1.0;
      this.promptDir = -1;
    }
    this.prompt.setAlpha(this.promptAlpha);
  }
}
