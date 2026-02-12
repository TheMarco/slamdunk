import { Enemy } from './Enemy.js';
import { CONFIG } from '../config.js';

export class TankEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'tank_enemy';
    this.radius = CONFIG.TANK_ENEMY_RADIUS;
    this.speed = CONFIG.TANK_ENEMY_SPEED;
    this.hp = CONFIG.TANK_ENEMY_HP;
    this.maxHp = CONFIG.TANK_ENEMY_HP;
    this.scoreValue = CONFIG.SCORE_PER_KILL * 3;
  }

  getColor() {
    if (this.hp < this.maxHp) return CONFIG.COLORS.TANK_ENEMY_DAMAGED;
    return CONFIG.COLORS.TANK_ENEMY;
  }
}
