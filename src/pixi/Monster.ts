import * as PIXI from 'pixi.js';

const HALF_SIZE = 24;
const RADIUS = 24;

let nextId = 0;

export class Monster {
  readonly id: number;
  readonly container: PIXI.Container;

  constructor(x: number, y: number) {
    this.id = nextId++;
    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;
    this.container.addChild(this.createBody());
  }

  private createBody(): PIXI.Graphics {
    const g = new PIXI.Graphics();

    g.beginFill(0xe74c3c);
    g.lineStyle(3, 0x8e2418);
    g.drawRoundedRect(-HALF_SIZE, -HALF_SIZE, HALF_SIZE * 2, HALF_SIZE * 2, 8);
    g.endFill();

    g.lineStyle(0);
    g.beginFill(0xffffff);
    g.drawCircle(-8, -4, 6);
    g.drawCircle(8, -4, 6);
    g.endFill();

    g.beginFill(0x1c1c1c);
    g.drawCircle(-8, -4, 2.5);
    g.drawCircle(8, -4, 2.5);
    g.endFill();

    return g;
  }

  update(deltaSeconds: number, speed: number): void {
    this.container.x -= speed * deltaSeconds;
    this.container.rotation = Math.sin(this.container.x * 0.03) * 0.12;
  }

  get bounds() {
    return { x: this.container.x, y: this.container.y, radius: RADIUS };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
