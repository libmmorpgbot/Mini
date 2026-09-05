import type { Player } from './Player';
import type { Monster } from './Monster';

const OVERLAP_TOLERANCE = 15;

export class CollisionManager {
  static checkCollision(player: Player, monster: Monster): boolean {
    const p = player.bounds;
    const m = monster.bounds;
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < p.radius + m.radius - OVERLAP_TOLERANCE;
  }
}
