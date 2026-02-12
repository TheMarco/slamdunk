import { Enemy } from './Enemy.js';
import { CONFIG } from '../config.js';

export class FastEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'fast_enemy';
    this.radius = CONFIG.FAST_ENEMY_RADIUS;
    this.speed = CONFIG.FAST_ENEMY_SPEED;
    this.hp = 1;
  }

  getColor() {
    return CONFIG.COLORS.FAST_ENEMY;
  }
}
