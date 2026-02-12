export class EntityManager {
  constructor() {
    this.player = null;
    this.bullets = [];
    this.enemies = [];
    this.powerups = [];
  }

  setPlayer(player) {
    this.player = player;
  }

  addBullet(bullet) {
    this.bullets.push(bullet);
  }

  addEnemy(enemy) {
    this.enemies.push(enemy);
  }

  addPowerUp(powerup) {
    this.powerups.push(powerup);
  }

  updateAll(dt, player) {
    for (const b of this.bullets) {
      if (b.alive) b.update(dt);
    }
    for (const e of this.enemies) {
      if (e.alive) e.update(dt, player);
    }
    for (const p of this.powerups) {
      if (p.alive) p.update(dt);
    }
  }

  removeAllDead() {
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemies = this.enemies.filter(e => e.alive);
    this.powerups = this.powerups.filter(p => p.alive);
  }

  getAll() {
    return [...this.bullets, ...this.enemies, ...this.powerups];
  }

  clear() {
    this.bullets = [];
    this.enemies = [];
    this.powerups = [];
  }
}
