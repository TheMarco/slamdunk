const STORAGE_KEY = 'game_boilerplate_highscore';

export function getHighScore() {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function setHighScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // localStorage unavailable
  }
}

export function checkHighScore(score) {
  const current = getHighScore();
  if (score > current) {
    setHighScore(score);
    return true;
  }
  return false;
}
