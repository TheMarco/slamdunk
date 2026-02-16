export const CONFIG = Object.freeze({
  // Canvas
  WIDTH: 800,
  HEIGHT: 600,
  CENTER_X: 400,
  CENTER_Y: 300,

  // Scrolling
  SCROLL_SPEED_BASE: 60,        // pixels/sec upward scroll
  SCROLL_SPEED_MAX: 200,        // max scroll speed
  SCROLL_ACCELERATION: 0.5,     // speed increase per second

  // Player
  PLAYER_HORIZONTAL_SPEED: 250, // X-axis movement speed
  PLAYER_WIDTH: 20,             // visual width (blocky voxel)
  PLAYER_HEIGHT: 20,            // visual height
  PLAYER_RADIUS: 10,            // collision radius
  PLAYER_MAX_HEALTH: 100,
  PLAYER_INVULN_MS: 1500,

  // Flight Mode
  FLIGHT_RISE_SPEED: 120,       // upward float speed
  FLIGHT_METER_MAX: 100,        // flight meter capacity
  FLIGHT_METER_DRAIN: 20,       // drain per second while flying
  FLIGHT_METER_RECHARGE: 35,    // recharge per second on ground
  FLIGHT_FIRE_COOLDOWN_MS: 300, // auto-fire interval in flight
  FLIGHT_FIRE_SPEED: 400,       // energy burst speed (downward)

  // Impact Mode
  IMPACT_FALL_ACCEL: 800,       // gravity acceleration (px/s^2)
  IMPACT_MAX_FALL_SPEED: 600,   // terminal velocity
  IMPACT_SLAM_RADIUS: 60,       // AOE damage radius on landing
  IMPACT_SLAM_DAMAGE: 2,        // damage dealt on slam
  IMPACT_SLIDE_SPEED: 180,      // ground slide speed (decays)
  IMPACT_SLIDE_FRICTION: 0.95,  // slide deceleration per frame
  IMPACT_XP_MAGNET_RADIUS: 80,  // XP orb attraction radius on ground

  // Ground level (Y position of the "floor" relative to screen)
  GROUND_Y: 500,                // ground level (pixels from top)

  // Energy Burst (projectile in Flight)
  BURST_RADIUS: 5,
  BURST_DAMAGE: 1,
  BURST_LIFETIME_MS: 2000,

  // Data Blocker (floating obstacle)
  BLOCKER_WIDTH: 50,
  BLOCKER_HEIGHT: 16,
  BLOCKER_RADIUS: 20,
  BLOCKER_HP: 2,
  BLOCKER_SPEED: 30,            // slow horizontal drift
  BLOCKER_SCORE: 50,

  // Chaser Bot (ground enemy)
  CHASER_SPEED: 100,
  CHASER_RADIUS: 10,
  CHASER_HP: 1,
  CHASER_SCORE: 100,

  // Data Blocker drift
  BLOCKER_DRIFT_VY: 20,           // downward drift speed

  // Gravity Flare (pulls player down)
  FLARE_RADIUS: 14,
  FLARE_PULL_RADIUS: 120,       // gravitational pull range
  FLARE_PULL_STRENGTH: 200,     // downward pull force
  FLARE_HP: 1,
  FLARE_SCORE: 150,
  FLARE_DRIFT_VY: 14,             // downward drift speed

  // XP Orb
  XP_ORB_RADIUS: 6,
  XP_ORB_VALUE: 10,
  XP_ORB_LIFETIME_MS: 10000,
  XP_ORB_MAGNET_SPEED: 300,     // speed when magnetized toward player

  // Scoring
  SCORE_PER_XP: 10,
  MULTIPLIER_INCREMENT: 0.1,
  MULTIPLIER_MAX: 5.0,
  MULTIPLIER_DECAY_MS: 4000,

  // Arena
  ARENA_LEFT: 40,
  ARENA_RIGHT: 760,
  ARENA_MARGIN: 40,
  SPAWN_AHEAD_DISTANCE: 100,    // how far above camera to spawn

  // Colors — Neon Voxel Palette
  BG: 0x0a0614,                 // deep purple-black
  GRID_COLOR: 0x2a1050,         // synthwave grid lines
  GRID_HIGHLIGHT: 0x6020a0,     // brighter grid accent
  PLAYER_FLIGHT: 0x00ffff,      // cyan (flight mode)
  PLAYER_IMPACT: 0xff00ff,      // magenta (impact mode)
  PLAYER_FALLING: 0xff6600,     // orange (falling)
  BURST_COLOR: 0x00ffdd,        // cyan-green energy burst
  BLOCKER_COLOR: 0xff2080,      // hot pink (data blocker)
  CHASER_COLOR: 0xffaa00,       // amber (chaser bot)
  FLARE_COLOR: 0xaa00ff,        // purple (gravity flare)
  XP_ORB_COLOR: 0x88ff00,       // lime green (XP orb)
  SLAM_FLASH: 0xff00ff,         // magenta slam flash

  // Shield Drone
  SHIELD_DRONE_RADIUS: 7,
  SHIELD_DRONE_HP: 1,
  SHIELD_DRONE_SPEED: 120,
  SHIELD_DRONE_SCORE: 75,
  SHIELD_DRONE_ORBIT_RADIUS: 40,
  SHIELD_DRONE_ORBIT_SPEED: 3,
  SHIELD_DRONE_COLOR: 0x44ddff,

  // Laser Gate
  LASER_ANCHOR_RADIUS: 8,
  LASER_ANCHOR_HP: 2,
  LASER_ANCHOR_SCORE: 100,
  LASER_CYCLE_MS: 1500,
  LASER_BEAM_ON_MS: 900,
  LASER_DRIFT_VY: 12,
  LASER_COLOR: 0xff4444,
  LASER_BEAM_COLOR: 0xff2222,

  // Power-ups
  POWERUP_RADIUS: 10,
  POWERUP_LIFETIME_MS: 8000,
  POWERUP_DROP_CHANCE: 0.15,
  POWERUP_FALL_VY: 20,
  SCORE_BOOST_DURATION_MS: 10000,

  // Combo
  COMBO_WINDOW_MS: 3000,

  // Colors
  HUD_COLOR: '#00ffff',         // cyan HUD text
  HUD_WARN: '#ff2080',          // pink warning text
});
