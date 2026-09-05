import * as PIXI from 'pixi.js';

const RADIUS = 28;
const BOB_FREQUENCY = 10;
const BOB_AMPLITUDE = 6;

export class Player {
  readonly container: PIXI.Container;
  private readonly baseY: number;
  private time = 0;

  constructor(x: number, y: number) {
    this.baseY = y;
    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;
    this.container.addChild(this.createBody());
  }

  private createBody(): PIXI.Graphics {
    const g = new PIXI.Graphics();

    g.beginFill(0x3ba3ff);
    g.lineStyle(3, 0x1c5f99);
    g.drawCircle(0, 0, RADIUS);
    g.endFill();

    g.lineStyle(0);
    g.beginFill(0xffffff);
    g.drawCircle(-10, -6, 7);
    g.drawCircle(10, -6, 7);
    g.endFill();

    g.beginFill(0x1c1c1c);
    g.drawCircle(-8, -6, 3);
    g.drawCircle(12, -6, 3);
    g.endFill();

    return g;
  }

  update(deltaSeconds: number, speedMultiplier: number): void {
    this.time += deltaSeconds * speedMultiplier;
    const phase = this.time * BOB_FREQUENCY;
    this.container.y = this.baseY - Math.abs(Math.sin(phase)) * BOB_AMPLITUDE;
    this.container.rotation = Math.sin(phase) * 0.05;
  }

  get bounds() {
    return { x: this.container.x, y: this.container.y, radius: RADIUS };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
