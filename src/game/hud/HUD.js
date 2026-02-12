import { CONFIG } from '../config.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;

    // Score text (top left)
    this.scoreText = scene.add.text(16, 16, 'SCORE: 0', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: CONFIG.COLORS.HUD,
    }).setDepth(100);

    // Multiplier (top left, below score)
    this.multiText = scene.add.text(16, 40, '', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#ffdd44',
    }).setDepth(100);

    // Health bar (top right)
    this.healthLabel = scene.add.text(CONFIG.WIDTH - 16, 16, 'HEALTH', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: CONFIG.COLORS.HUD,
      align: 'right',
    }).setOrigin(1, 0).setDepth(100);

    // Health bar graphics
    this.healthGfx = scene.add.graphics().setDepth(100);

    // Warning text (center, flashes)
    this.warningText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y - 100, '', {
      fontFamily: 'Courier New',
      fontSize: '20px',
      color: '#ff4444',
      align: 'center',
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this._warningTimer = 0;
  }

  update(state, player) {
    // Score
    this.scoreText.setText(`SCORE: ${state.score}`);

    // Multiplier
    if (state.multiplier > 1.0) {
      this.multiText.setText(`x${state.multiplier.toFixed(2)}`);
      this.multiText.setAlpha(1);
    } else {
      this.multiText.setAlpha(0);
    }

    // Health bar
    this.healthGfx.clear();
    const barW = 150;
    const barH = 12;
    const barX = CONFIG.WIDTH - 16 - barW;
    const barY = 32;

    // Background
    this.healthGfx.fillStyle(0x333333, 0.8);
    this.healthGfx.fillRect(barX, barY, barW, barH);

    // Health fill
    const pct = state.health / CONFIG.PLAYER_MAX_HEALTH;
    const fillColor = pct > 0.5 ? 0x00ff88 : pct > 0.25 ? 0xffaa00 : 0xff4444;
    this.healthGfx.fillStyle(fillColor, 0.9);
    this.healthGfx.fillRect(barX, barY, barW * pct, barH);

    // Border
    this.healthGfx.lineStyle(1, 0x666666, 1);
    this.healthGfx.strokeRect(barX, barY, barW, barH);

    // Low health warning
    if (pct <= 0.25 && !state.gameOver) {
      this._warningTimer += 16;
      const flash = Math.sin(this._warningTimer / 200) > 0 ? 1 : 0;
      this.warningText.setText('LOW HEALTH!');
      this.warningText.setAlpha(flash * 0.8);
    } else {
      this.warningText.setAlpha(0);
      this._warningTimer = 0;
    }

    // Pause overlay
    if (this.scene._paused) {
      this.warningText.setText('PAUSED');
      this.warningText.setAlpha(1);
      this.warningText.setColor('#ffffff');
    } else {
      this.warningText.setColor('#ff4444');
    }
  }
}
