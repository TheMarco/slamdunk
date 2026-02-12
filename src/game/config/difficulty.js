// Difficulty progression system
// Returns difficulty parameters based on elapsed game time (seconds)
//
// Phases:
//   0-30s:   WARMUP    — Slow spawns, basic enemies only
//   30-60s:  RAMP      — Fast enemies unlock, speed increases
//   60-120s: MIDGAME   — Tanks unlock, faster spawns
//   120s+:   LATEGAME  — Everything unlocked, maximum pressure

export function getDifficulty(elapsedSeconds) {
  const t = elapsedSeconds;

  // Spawn interval (ms) — how often new entities appear
  // Starts at 2000ms, decreases over time, floor at 400ms
  const spawnInterval = Math.max(400, 2000 - t * 12);

  // Speed multiplier — enemies get faster over time
  // Starts at 1.0, caps at 2.0
  const speedMultiplier = Math.min(2.0, 1.0 + t * 0.005);

  // Phase name (for debugging/HUD)
  let phase = 'WARMUP';
  if (t >= 120) phase = 'LATEGAME';
  else if (t >= 60) phase = 'MIDGAME';
  else if (t >= 30) phase = 'RAMP';

  return {
    spawnInterval,
    speedMultiplier,
    phase,
    elapsedSeconds: t,
  };
}
