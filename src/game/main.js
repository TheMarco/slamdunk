import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { SplashScene } from './scenes/SplashScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

export function StartGame(containerId) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    width: CONFIG.WIDTH,
    height: CONFIG.HEIGHT,
    parent: containerId,
    backgroundColor: CONFIG.COLORS.BG,
    scene: [SplashScene, TitleScene, GameScene, GameOverScene],
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      keyboard: true,
    },
    audio: {
      noAudio: true, // We use custom SoundEngine, not Phaser audio
    },
  });
}
