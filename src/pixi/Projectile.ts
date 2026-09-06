import * as PIXI from 'pixi.js';

export type ProjectileKind = 'arrow' | 'ice';

const ARROW_SPEED = 900; // px / second
const ICE_SPEED = 650; // px / second
const IMPACT_DURATION = 0.18; // seconds

interface ActiveProjectile {
  graphics: PIXI.Graphics;
  kind: ProjectileKind;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  duration: number;
  elapsed: number;
  phase: 'flying' | 'impact';
  impactElapsed: number;
}

function drawArrow(g: PIXI.Graphics): void {
  g.beginFill(0xd9c38a);
  g.drawRect(-14, -1.5, 20, 3);
  g.endFill();

  g.beginFill(0xe8e8e8);
  g.drawPolygon([6, -4, 15, 0, 6, 4]);
  g.endFill();

  g.beginFill(0x8a6a42);
  g.drawPolygon([-14, -4, -7, 0, -14, 4, -19, 0]);
  g.endFill();
}

function drawIceSphere(g: PIXI.Graphics): void {
  g.beginFill(0x8fd6ff, 0.35);
  g.drawCircle(0, 0, 11);
  g.endFill();

  g.beginFill(0xbfeeff, 0.9);
  g.drawCircle(0, 0, 7);
  g.endFill();

  g.beginFill(0xffffff, 0.95);
  g.drawCircle(-1.5, -1.5, 3);
  g.endFill();
}

function drawImpact(g: PIXI.Graphics, kind: ProjectileKind, t: number): void {
  g.clear();
  const radius = 6 + t * 15;
  const alpha = 1 - t;
  const color = kind === 'arrow' ? 0xffe066 : 0xbfeeff;

  g.lineStyle(2, color, alpha);
  g.drawCircle(0, 0, radius);
  g.lineStyle(0);
  g.beginFill(color, alpha * 0.5);
  g.drawCircle(0, 0, radius * 0.35);
  g.endFill();
}

/** Purely visual: fires a short-lived sprite from origin to target, then a brief impact flash. */
export class ProjectileEmitter {
  readonly container: PIXI.Container;
  private active: ActiveProjectile[] = [];

  constructor() {
    this.container = new PIXI.Container();
  }

  spawn(kind: ProjectileKind, startX: number, startY: number, targetX: number, targetY: number): void {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.hypot(dx, dy) || 1;
    const speed = kind === 'arrow' ? ARROW_SPEED : ICE_SPEED;

    const graphics = new PIXI.Graphics();
    graphics.x = startX;
    graphics.y = startY;
    graphics.rotation = Math.atan2(dy, dx);
    if (kind === 'arrow') {
      drawArrow(graphics);
    } else {
      drawIceSphere(graphics);
    }

    this.active.push({
      graphics,
      kind,
      startX,
      startY,
      targetX,
      targetY,
      duration: distance / speed,
      elapsed: 0,
      phase: 'flying',
      impactElapsed: 0,
    });
    this.container.addChild(graphics);
  }

  update(deltaSeconds: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];

      if (p.phase === 'flying') {
        p.elapsed += deltaSeconds;
        const t = Math.min(1, p.elapsed / p.duration);
        p.graphics.x = p.startX + (p.targetX - p.startX) * t;
        p.graphics.y = p.startY + (p.targetY - p.startY) * t;

        if (t >= 1) {
          p.phase = 'impact';
          p.graphics.rotation = 0;
        }
        continue;
      }

      p.impactElapsed += deltaSeconds;
      const t = Math.min(1, p.impactElapsed / IMPACT_DURATION);
      drawImpact(p.graphics, p.kind, t);

      if (t >= 1) {
        p.graphics.destroy();
        this.active.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const p of this.active) {
      p.graphics.destroy();
    }
    this.active = [];
    this.container.destroy({ children: true });
  }
}
