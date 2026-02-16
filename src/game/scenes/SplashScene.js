import Phaser from 'phaser';
import { CONFIG } from '../config.js';

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(CONFIG.BG);

    const cx = CONFIG.CENTER_X;
    const cy = CONFIG.CENTER_Y;

    this.add.text(cx, cy - 20, 'VECTOR DRIFT', {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: '#00ffff',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, 'Kinetic Survival', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#555555',
      align: 'center',
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.scene.start('TitleScene');
    });
  }
}
