import { StartGame } from './game/main.js';
import { SoundEngine } from './game/audio/SoundEngine.js';
import { isMobile } from './game/utils/deviceDetection.js';

// Wait for fonts to load before starting the game
document.fonts.ready.then(() => {
  const mobile = isMobile();

  // On mobile, activate touch layout before creating the game
  if (mobile) {
    document.body.classList.add('mobile-mode');
    document.getElementById('mobile-wrapper').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
  }

  // Create game — on mobile, parent inside the mobile game area
  const containerId = mobile ? 'mobile-game-area' : 'game-container';
  const game = StartGame(containerId);

  // Initialize audio on first user gesture (required by iOS)
  const soundEngine = new SoundEngine();
  game.registry.set('soundEngine', soundEngine);
  const initAudio = () => {
    soundEngine.init();
    document.removeEventListener('touchstart', initAudio);
    document.removeEventListener('touchend', initAudio);
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  };
  document.addEventListener('touchstart', initAudio);
  document.addEventListener('touchend', initAudio);
  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);

  // Mobile: wire up touch zones → synthetic KeyboardEvents
  if (mobile) {
    const KEY_MAP = {
      ArrowUp: { keyCode: 38, code: 'ArrowUp', key: 'ArrowUp' },
      ArrowDown: { keyCode: 40, code: 'ArrowDown', key: 'ArrowDown' },
      ArrowLeft: { keyCode: 37, code: 'ArrowLeft', key: 'ArrowLeft' },
      ArrowRight: { keyCode: 39, code: 'ArrowRight', key: 'ArrowRight' },
      Space: { keyCode: 32, code: 'Space', key: ' ' },
      Escape: { keyCode: 27, code: 'Escape', key: 'Escape' },
    };

    const sendKey = (type, keyName) => {
      const k = KEY_MAP[keyName];
      if (!k) return;
      window.dispatchEvent(new KeyboardEvent(type, { ...k, bubbles: true }));
    };

    const flashButton = (el) => {
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 150);
    };

    document.querySelectorAll('.touch-zone[data-key]').forEach(zone => {
      const keyName = zone.dataset.key;
      if (!keyName) return;

      zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        flashButton(zone);
        sendKey('keydown', keyName);
      });
      zone.addEventListener('touchend', (e) => {
        e.preventDefault();
        sendKey('keyup', keyName);
      });
    });
  }
});
