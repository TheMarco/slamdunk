import { CONFIG } from '../config.js';

export class HUD {
  constructor(scene, gameState) {
    this.scene = scene;
    this._displayScore = 0;
    this._popups = [];

    // Score
    this.scoreText = scene.add.text(16, 16, 'SCORE: 0', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: CONFIG.HUD_COLOR,
    }).setDepth(100);

    // Multiplier
    this.multiplierText = scene.add.text(16, 40, '', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#cc8800',
    }).setDepth(100);

    // Combo display (center-top)
    this.comboText = scene.add.text(CONFIG.CENTER_X, 16, '', {
      fontFamily: 'Courier New',
      fontSize: '20px',
      color: '#ccaa33',
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(100).setVisible(false);

    // Kills display
    this.killsText = scene.add.text(16, 58, '', {
      fontFamily: 'Courier New',
      fontSize: '11px',
      color: '#446644',
    }).setDepth(100);

    // Phase display
    this.phaseText = scene.add.text(CONFIG.CENTER_X, CONFIG.HEIGHT - 16, '', {
      fontFamily: 'Courier New',
      fontSize: '10px',
      color: '#223322',
      align: 'center',
    }).setOrigin(0.5, 1).setDepth(100);

    // Active power-ups display
    this.powerUpText = scene.add.text(16, 74, '', {
      fontFamily: 'Courier New',
      fontSize: '11px',
      color: '#33aa66',
    }).setDepth(100);

    // Mode indicator
    this.modeText = scene.add.text(CONFIG.WIDTH - 16, 16, 'IMPACT', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: CONFIG.HUD_COLOR,
    }).setOrigin(1, 0).setDepth(100);

    // Health bar
    this.healthLabel = scene.add.text(CONFIG.WIDTH - 16, 40, 'HP', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: CONFIG.HUD_COLOR,
    }).setOrigin(1, 0).setDepth(100);

    // Flight meter bar (drawn with graphics in update)
    this.hudGfx = scene.add.graphics().setDepth(100);

    // Pause text
    this.pauseText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y, 'PAUSED', {
      fontFamily: 'Courier New',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Zone announcement
    this.zoneAnnounce = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y - 40, '', {
      fontFamily: 'Courier New',
      fontSize: '22px',
      color: CONFIG.HUD_COLOR,
      align: 'center',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.zoneSubtext = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y - 12, '', {
      fontFamily: 'Courier New',
      fontSize: '11px',
      color: CONFIG.HUD_COLOR,
      align: 'center',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this._zoneAnnounceTimer = 0;

    // Low health warning
    this._warnFlash = 0;
    this.warnText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 80, 'LOW HEALTH!', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: CONFIG.HUD_WARN,
    }).setOrigin(0.5).setDepth(100).setVisible(false);
  }

  announceZone(zoneName, isPlateau) {
    if (isPlateau) {
      this.zoneAnnounce.setText('// STABILIZING');
      this.zoneSubtext.setText(`[ ${zoneName} PLATEAU ]`);
    } else {
      this.zoneAnnounce.setText(`>> ${zoneName}`);
      this.zoneSubtext.setText('[ THREAT LEVEL INCREASED ]');
    }
    this.zoneAnnounce.setVisible(true);
    this.zoneSubtext.setVisible(true);
    this.zoneAnnounce.setAlpha(1);
    this.zoneSubtext.setAlpha(1);
    this._zoneAnnounceTimer = 2500;
  }

  spawnPopup(x, y, message, color, fontSize) {
    const text = this.scene.add.text(x, y, message, {
      fontFamily: 'Courier New',
      fontSize: `${fontSize || 14}px`,
      color: color || '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setDepth(110);

    this._popups.push({
      text,
      life: 0,
      maxLife: 1000,
      startY: y,
    });
  }

  update(gameState, player, paused) {
    // --- Task 3.1: Animated score counter ---
    this._displayScore += (gameState.score - this._displayScore) * 0.1;
    if (Math.abs(this._displayScore - gameState.score) < 1) {
      this._displayScore = gameState.score;
    }
    this.scoreText.setText(`SCORE: ${Math.floor(this._displayScore)}`);

    // Multiplier
    if (gameState.multiplier > 1.0) {
      this.multiplierText.setText(`x${gameState.multiplier.toFixed(1)}`);
      this.multiplierText.setVisible(true);
    } else {
      this.multiplierText.setVisible(false);
    }

    // --- Task 3.3: Combo counter ---
    if (gameState.comboCount >= 3) {
      const comboMult = gameState.getComboMultiplier();
      const comboColors = { 2: '#ccaa33', 3: '#cc6600', 5: '#cc4400' };
      this.comboText.setText(`COMBO ${gameState.comboCount} (x${comboMult})`);
      this.comboText.setColor(comboColors[comboMult] || '#ffdd44');
      this.comboText.setVisible(true);
    } else {
      this.comboText.setVisible(false);
    }

    // Kills
    this.killsText.setText(`KILLS: ${gameState.kills}`);

    // Phase (zone name with bracket styling)
    this.phaseText.setText(gameState.currentZone ? `[ ${gameState.currentZone} ]` : '');

    // Active power-ups
    const activeBuffs = [];
    if (gameState.scoreBoostTimer > 0) activeBuffs.push(`SCORE x2 ${Math.ceil(gameState.scoreBoostTimer / 1000)}s`);
    if (player.shieldActive) activeBuffs.push('SHIELD');
    if (player.slamPlusActive) activeBuffs.push('MEGA SLAM');
    this.powerUpText.setText(activeBuffs.join(' | '));

    // Mode
    const modeNames = { flight: 'FLIGHT', falling: 'FALLING', impact: 'IMPACT' };
    const modeColors = {
      flight: '#00cc99',
      falling: '#ffaa22',
      impact: '#cc4400',
    };
    this.modeText.setText(modeNames[gameState.playerMode] || 'IMPACT');
    this.modeText.setColor(modeColors[gameState.playerMode] || '#00cc99');

    // HUD graphics (health bar + flight meter)
    this.hudGfx.clear();

    // Health bar (top right)
    const hbX = CONFIG.WIDTH - 120;
    const hbY = 58;
    const hbW = 100;
    const hbH = 8;
    const hpFill = gameState.health / CONFIG.PLAYER_MAX_HEALTH;

    this.hudGfx.fillStyle(0x1a1a1a, 0.6);
    this.hudGfx.fillRect(hbX, hbY, hbW, hbH);

    const hpColor = hpFill > 0.5 ? 0x33aa66 : hpFill > 0.25 ? 0xcc8800 : 0xcc3333;
    this.hudGfx.fillStyle(hpColor, 0.8);
    this.hudGfx.fillRect(hbX, hbY, hbW * hpFill, hbH);

    this.hudGfx.lineStyle(1, 0x33aa77, 0.25);
    this.hudGfx.strokeRect(hbX, hbY, hbW, hbH);

    // Flight meter (below health bar)
    const fmY = hbY + 14;
    const fmFill = gameState.flightMeter / CONFIG.FLIGHT_METER_MAX;

    this.hudGfx.fillStyle(0x1a1a1a, 0.6);
    this.hudGfx.fillRect(hbX, fmY, hbW, hbH);

    this.hudGfx.fillStyle(CONFIG.PLAYER_FLIGHT, 0.8);
    this.hudGfx.fillRect(hbX, fmY, hbW * fmFill, hbH);

    this.hudGfx.lineStyle(1, 0x33aa77, 0.25);
    this.hudGfx.strokeRect(hbX, fmY, hbW, hbH);

    // Pause
    this.pauseText.setVisible(paused);

    // Low health warning
    if (gameState.health <= 25 && gameState.health > 0 && !gameState.gameOver) {
      this._warnFlash += 0.1;
      this.warnText.setVisible(Math.sin(this._warnFlash) > 0);
    } else {
      this.warnText.setVisible(false);
    }

    // Zone announcement fade
    if (this._zoneAnnounceTimer > 0) {
      this._zoneAnnounceTimer -= 16; // approximate 60fps
      if (this._zoneAnnounceTimer <= 500) {
        const fade = Math.max(0, this._zoneAnnounceTimer / 500);
        this.zoneAnnounce.setAlpha(fade);
        this.zoneSubtext.setAlpha(fade);
      }
      if (this._zoneAnnounceTimer <= 0) {
        this.zoneAnnounce.setVisible(false);
        this.zoneSubtext.setVisible(false);
      }
    }

    // Update popups
    for (let i = this._popups.length - 1; i >= 0; i--) {
      const popup = this._popups[i];
      popup.life += 16; // approximate 60fps
      const t = popup.life / popup.maxLife;
      popup.text.setY(popup.startY - 60 * t);
      popup.text.setAlpha(1 - t);
      if (popup.life >= popup.maxLife) {
        popup.text.destroy();
        this._popups.splice(i, 1);
      }
    }
  }
}
