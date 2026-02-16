// Zone-based difficulty system with plateaus for breathing room
const ZONES = Object.freeze([
  { name: 'FIREWALL',  start: 0,   end: 40,  spawnStart: 2500, spawnEnd: 2500, speedStart: 1.0, speedEnd: 1.0, scrollStart: 1.0, scrollEnd: 1.0, isPlateau: false, gridTint: 0x1a2a1a },
  { name: 'PROXY',     start: 40,  end: 70,  spawnStart: 2500, spawnEnd: 2000, speedStart: 1.0, speedEnd: 1.1, scrollStart: 1.0, scrollEnd: 1.1, isPlateau: false, gridTint: 0x1a2a1a },
  { name: 'BUFFER',    start: 70,  end: 85,  spawnStart: 2000, spawnEnd: 2000, speedStart: 1.1, speedEnd: 1.1, scrollStart: 1.15, scrollEnd: 1.15, isPlateau: true,  gridTint: 0x1a2a2a },
  { name: 'GATEWAY',   start: 85,  end: 120, spawnStart: 2000, spawnEnd: 1500, speedStart: 1.1, speedEnd: 1.3, scrollStart: 1.15, scrollEnd: 1.3, isPlateau: false, gridTint: 0x2a2a1a },
  { name: 'CACHE',     start: 120, end: 140, spawnStart: 1500, spawnEnd: 1500, speedStart: 1.3, speedEnd: 1.3, scrollStart: 1.35, scrollEnd: 1.35, isPlateau: true,  gridTint: 0x2a2a2a },
  { name: 'MAINFRAME', start: 140, end: 190, spawnStart: 1500, spawnEnd: 1100, speedStart: 1.3, speedEnd: 1.5, scrollStart: 1.35, scrollEnd: 1.5, isPlateau: false, gridTint: 0x2a1a1a },
  { name: 'KERNEL',    start: 190, end: 210, spawnStart: 1100, spawnEnd: 1100, speedStart: 1.5, speedEnd: 1.5, scrollStart: 1.55, scrollEnd: 1.55, isPlateau: true,  gridTint: 0x2a1a2a },
  { name: 'ROOT',      start: 210, end: Infinity, spawnStart: 800, spawnEnd: 800, speedStart: 1.8, speedEnd: 1.8, scrollStart: 1.8, scrollEnd: 1.8, isPlateau: false, gridTint: 0x2a0a0a },
]);

export { ZONES };

export function getZoneByTime(t) {
  for (const zone of ZONES) {
    if (t < zone.end) return zone;
  }
  return ZONES[ZONES.length - 1];
}

export function getDifficulty(elapsedSeconds) {
  const t = elapsedSeconds;
  const zone = getZoneByTime(t);

  // Interpolate within the zone
  const duration = zone.end === Infinity ? 1 : zone.end - zone.start;
  const progress = zone.end === Infinity ? 1 : Math.min(1, (t - zone.start) / duration);

  const spawnInterval = zone.spawnStart + (zone.spawnEnd - zone.spawnStart) * progress;
  const speedMultiplier = zone.speedStart + (zone.speedEnd - zone.speedStart) * progress;
  const scrollMultiplier = zone.scrollStart + (zone.scrollEnd - zone.scrollStart) * progress;

  return {
    spawnInterval,
    scrollMultiplier,
    speedMultiplier,
    phase: zone.name,
    isPlateau: zone.isPlateau,
    gridTint: zone.gridTint,
    elapsedSeconds: t,
  };
}
