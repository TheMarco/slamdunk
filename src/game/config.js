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

  // Colors — Cyberpunk Terminal Palette
  BG: 0x080c10,                 // cold blue-black
  GRID_COLOR: 0x1a2a1a,         // dark terminal green
  GRID_HIGHLIGHT: 0x2a4a2a,     // muted green accent
  PLAYER_FLIGHT: 0x00cc99,      // teal-green (flight mode)
  PLAYER_IMPACT: 0xcc4400,      // burnt orange (impact mode)
  PLAYER_FALLING: 0xffaa22,     // amber-yellow (falling)
  BURST_COLOR: 0x00aa77,        // dark teal energy burst
  BLOCKER_COLOR: 0x4488aa,      // steel blue (data blocker)
  CHASER_COLOR: 0xcc3333,       // dark red (chaser bot)
  FLARE_COLOR: 0x8844cc,        // desaturated purple (gravity flare)
  XP_ORB_COLOR: 0x33dd66,       // data green (XP orb)
  SLAM_FLASH: 0xcc4400,         // burnt orange slam flash

  // Shield Drone
  SHIELD_DRONE_RADIUS: 7,
  SHIELD_DRONE_HP: 1,
  SHIELD_DRONE_SPEED: 120,
  SHIELD_DRONE_SCORE: 75,
  SHIELD_DRONE_ORBIT_RADIUS: 40,
  SHIELD_DRONE_ORBIT_SPEED: 3,
  SHIELD_DRONE_COLOR: 0x336699,

  // Laser Gate
  LASER_ANCHOR_RADIUS: 8,
  LASER_ANCHOR_HP: 2,
  LASER_ANCHOR_SCORE: 100,
  LASER_CYCLE_MS: 1500,
  LASER_BEAM_ON_MS: 900,
  LASER_DRIFT_VY: 12,
  LASER_COLOR: 0xcc2222,
  LASER_BEAM_COLOR: 0xff3300,

  // Power-ups
  POWERUP_RADIUS: 10,
  POWERUP_LIFETIME_MS: 8000,
  POWERUP_DROP_CHANCE: 0.15,
  POWERUP_FALL_VY: 20,
  SCORE_BOOST_DURATION_MS: 10000,

  // Combo
  COMBO_WINDOW_MS: 3000,

  // Colors
  HUD_COLOR: '#33aa77',         // terminal green HUD text
  HUD_WARN: '#cc3333',          // alert red warning text
});
