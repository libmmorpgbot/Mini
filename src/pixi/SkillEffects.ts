import * as PIXI from 'pixi.js';

interface Ring {
  graphics: PIXI.Graphics;
  x: number;
  y: number;
  radius: number;
  color: number;
  life: number;
}

const RING_DURATION = 0.4;

/** Purely visual: an expanding, fading ring where an area skill lands. */
export class SkillEffectEmitter {
  readonly container: PIXI.Container;
  private rings: Ring[] = [];

  constructor() {
    this.container = new PIXI.Container();
  }

  ring(x: number, y: number, radius: number, color: number): void {
    const graphics = new PIXI.Graphics();
    this.rings.push({ graphics, x, y, radius, color, life: 0 });
    this.container.addChild(graphics);
  }

  update(deltaSeconds: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += deltaSeconds;
      const t = r.life / RING_DURATION;
      if (t >= 1) {
        r.graphics.destroy();
        this.rings.splice(i, 1);
        continue;
      }
      const g = r.graphics;
      g.clear();
      g.lineStyle(4 * (1 - t) + 1, r.color, 1 - t);
      g.beginFill(r.color, 0.18 * (1 - t));
      // Flattened ellipse: the ring lies on the ground plane.
      g.drawEllipse(r.x, r.y, r.radius * (0.4 + 0.6 * t), r.radius * 0.3 * (0.4 + 0.6 * t));
      g.endFill();
    }
  }

  destroy(): void {
    for (const r of this.rings) r.graphics.destroy();
    this.rings = [];
    this.container.destroy({ children: true });
  }
}
