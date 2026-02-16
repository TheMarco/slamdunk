export class EntityManager {
  constructor() {
    this.player = null;
    this.bursts = [];         // EnergyBurst (player projectiles)
    this.blockers = [];       // DataBlocker
    this.chasers = [];        // ChaserBot
    this.flares = [];         // GravityFlare
    this.xpOrbs = [];         // XPOrb
    this.shieldDrones = [];   // ShieldDrone
    this.laserGates = [];     // LaserGate (containers)
    this.laserAnchors = [];   // LaserGateAnchor (for collision)
    this.powerUps = [];       // PowerUp
  }

  setPlayer(player) { this.player = player; }
  addBurst(b) { this.bursts.push(b); }
  addBlocker(b) { this.blockers.push(b); }
  addChaser(c) { this.chasers.push(c); }
  addFlare(f) { this.flares.push(f); }
  addXPOrb(o) { this.xpOrbs.push(o); }
  addShieldDrone(d) { this.shieldDrones.push(d); }
  addPowerUp(p) { this.powerUps.push(p); }

  addLaserGate(lg) {
    this.laserGates.push(lg);
    this.laserAnchors.push(lg.anchor1, lg.anchor2);
  }

  getAllEnemies() {
    return [...this.blockers, ...this.chasers, ...this.flares, ...this.shieldDrones, ...this.laserAnchors];
  }

  updateAll(dt, player) {
    this.bursts.forEach(b => { if (b.alive) b.update(dt); });
    this.blockers.forEach(b => { if (b.alive) b.update(dt); });
    this.chasers.forEach(c => { if (c.alive) c.update(dt, player); });
    this.flares.forEach(f => {
      if (f.alive) {
        f.update(dt);
        f.applyGravityTo(player, dt);
      }
    });
    this.xpOrbs.forEach(o => { if (o.alive) o.update(dt, player); });
    this.shieldDrones.forEach(d => { if (d.alive) d.update(dt); });
    this.laserGates.forEach(lg => lg.update(dt));
    this.laserAnchors.forEach(a => { if (a.alive) a.update(dt); });
    this.powerUps.forEach(p => { if (p.alive) p.update(dt); });
  }

  removeAllDead() {
    this.bursts = this.bursts.filter(b => b.alive);
    this.blockers = this.blockers.filter(b => b.alive);
    this.chasers = this.chasers.filter(c => c.alive);
    this.flares = this.flares.filter(f => f.alive);
    this.xpOrbs = this.xpOrbs.filter(o => o.alive);
    this.shieldDrones = this.shieldDrones.filter(d => d.alive);
    this.laserGates = this.laserGates.filter(lg => lg.alive);
    this.laserAnchors = this.laserAnchors.filter(a => a.alive);
    this.powerUps = this.powerUps.filter(p => p.alive);
  }

  removeOffScreen(cameraTop, cameraBottom) {
    const margin = 100;
    const killIfOff = (entity) => {
      if (entity.y < cameraTop - margin || entity.y > cameraBottom + margin) {
        entity.kill();
      }
    };
    this.blockers.forEach(killIfOff);
    this.chasers.forEach(killIfOff);
    this.flares.forEach(killIfOff);
    this.xpOrbs.forEach(killIfOff);
    this.bursts.forEach(killIfOff);
    this.shieldDrones.forEach(killIfOff);
    this.laserAnchors.forEach(killIfOff);
    this.powerUps.forEach(killIfOff);
  }

  getAll() {
    return [
      this.player,
      ...this.bursts,
      ...this.blockers,
      ...this.chasers,
      ...this.flares,
      ...this.xpOrbs,
      ...this.shieldDrones,
      ...this.laserAnchors,
      ...this.powerUps,
    ].filter(e => e && e.alive);
  }

  getCounts() {
    return {
      blockers: this.blockers.filter(b => b.alive).length,
      chasers: this.chasers.filter(c => c.alive).length,
      flares: this.flares.filter(f => f.alive).length,
      xpOrbs: this.xpOrbs.filter(o => o.alive).length,
      shieldDrones: this.shieldDrones.filter(d => d.alive).length,
      laserGates: this.laserGates.filter(lg => lg.alive).length,
      powerUps: this.powerUps.filter(p => p.alive).length,
    };
  }

  clear() {
    this.bursts = [];
    this.blockers = [];
    this.chasers = [];
    this.flares = [];
    this.xpOrbs = [];
    this.shieldDrones = [];
    this.laserGates = [];
    this.laserAnchors = [];
    this.powerUps = [];
  }
}
