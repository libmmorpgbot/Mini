import * as PIXI from 'pixi.js';

interface DustParticle {
  graphic: PIXI.Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

const GRAVITY = 50;
const DUST_COLOR = 0xcbb994;

export class DustEmitter {
  readonly container: PIXI.Container;
  private particles: DustParticle[] = [];

  constructor() {
    this.container = new PIXI.Container();
  }

  spawnBurst(x: number, y: number, count = 3): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle(x, y);
    }
  }

  private spawnParticle(x: number, y: number): void {
    const radius = 3 + Math.random() * 3;
    const graphic = new PIXI.Graphics();
    graphic.beginFill(DUST_COLOR, 0.55);
    graphic.drawCircle(0, 0, radius);
    graphic.endFill();
    graphic.x = x + (Math.random() - 0.5) * 10;
    graphic.y = y;

    this.particles.push({
      graphic,
      vx: -40 - Math.random() * 40,
      vy: -30 - Math.random() * 20,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.3,
      baseScale: 1,
    });
    this.container.addChild(graphic);
  }

  update(deltaSeconds: number, scrollSpeed: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life += deltaSeconds;
      const t = particle.life / particle.maxLife;

      if (t >= 1) {
        particle.graphic.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      particle.vy += GRAVITY * deltaSeconds;
      particle.graphic.x += (particle.vx - scrollSpeed) * deltaSeconds;
      particle.graphic.y += particle.vy * deltaSeconds;
      particle.graphic.alpha = 1 - t;
      particle.graphic.scale.set(particle.baseScale * (1 + t * 0.6));
    }
  }

  destroy(): void {
    for (const particle of this.particles) {
      particle.graphic.destroy();
    }
    this.particles = [];
    this.container.destroy({ children: true });
  }
}
