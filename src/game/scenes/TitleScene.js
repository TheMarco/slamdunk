import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { getHighScore } from '../utils/highScore.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(CONFIG.BG);
    const cx = CONFIG.CENTER_X;
    const cy = CONFIG.CENTER_Y;

    this.add.text(cx, cy - 80, 'VECTOR DRIFT', {
      fontFamily: 'Courier New',
      fontSize: '36px',
      color: '#33aa77',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 40, 'Hold to Fly — Release to Slam', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#336644',
      align: 'center',
    }).setOrigin(0.5);

    // High score
    const hi = getHighScore();
    if (hi > 0) {
      this.add.text(cx, cy + 10, `HIGH SCORE: ${hi}`, {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#ccaa33',
        align: 'center',
      }).setOrigin(0.5);
    }

    // Pulsing prompt
    this.prompt = this.add.text(cx, cy + 60, 'PRESS SPACE / TAP TO START', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#33aa77',
      align: 'center',
    }).setOrigin(0.5);

    this.promptAlpha = 1;
    this.promptDir = -1;

    // Controls info
    this.add.text(cx, cy + 120, 'HOLD SPACE = FLY | RELEASE = SLAM | ARROWS = MOVE', {
      fontFamily: 'Courier New',
      fontSize: '11px',
      color: '#223322',
      align: 'center',
    }).setOrigin(0.5);

    // Start on space or click
    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
    this.input.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }

  update(_time, delta) {
    // Pulse the prompt text
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
