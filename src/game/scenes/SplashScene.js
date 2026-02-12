import Phaser from 'phaser';
import { CONFIG } from '../config.js';

export class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(CONFIG.COLORS.BG);

    const cx = CONFIG.CENTER_X;
    const cy = CONFIG.CENTER_Y;

    this.add.text(cx, cy - 20, 'GAME STARTER KIT', {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: '#00ff88',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 20, 'Action/Arcade Boilerplate', {
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
