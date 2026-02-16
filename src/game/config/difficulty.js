export function getDifficulty(elapsedSeconds) {
  const t = elapsedSeconds;

  // Spawn interval: starts at 2500ms, drops to 600ms
  const spawnInterval = Math.max(600, 2500 - t * 10);

  // Scroll speed multiplier: 1.0 → 2.5 over 200s
  const scrollMultiplier = Math.min(2.5, 1.0 + t * 0.0075);

  // Enemy speed multiplier: 1.0 → 2.0 over 200s
  const speedMultiplier = Math.min(2.0, 1.0 + t * 0.005);

  // Phase names for debugging/HUD
  let phase;
  if (t < 30) phase = 'WARMUP';
  else if (t < 60) phase = 'RAMP';
  else if (t < 120) phase = 'MIDGAME';
  else phase = 'LATEGAME';

  return { spawnInterval, scrollMultiplier, speedMultiplier, phase, elapsedSeconds: t };
}
