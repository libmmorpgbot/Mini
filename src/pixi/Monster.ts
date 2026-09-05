import * as PIXI from 'pixi.js';

const RADIUS = 24;
const PULSE_SPEED = 6;
const PULSE_AMOUNT = 0.05;

let nextId = 0;

export class Monster {
  readonly id: number;
  readonly container: PIXI.Container;
  private readonly body: PIXI.Container;
  private time: number;

  constructor(x: number, y: number) {
    this.id = nextId++;
    this.time = Math.random() * Math.PI * 2;

    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;

    this.body = this.createBody();
    this.container.addChild(this.body);
  }

  private createBody(): PIXI.Container {
    const container = new PIXI.Container();
    const g = new PIXI.Graphics();

    // tail
    g.beginFill(0xa5281c);
    g.drawPolygon([20, 10, 40, 2, 22, 20]);
    g.endFill();

    // body
    g.beginFill(0xe74c3c);
    g.lineStyle(3, 0x8e2418);
    g.drawRoundedRect(-24, -24, 48, 48, 10);
    g.endFill();

    // belly patch
    g.lineStyle(0);
    g.beginFill(0xf3a6a6, 0.7);
    g.drawRoundedRect(-14, -4, 28, 22, 8);
    g.endFill();

    // horns
    g.beginFill(0x3a2a2a);
    g.drawPolygon([-14, -24, -10, -38, -4, -24]);
    g.drawPolygon([4, -24, 10, -38, 14, -24]);
    g.endFill();

    // angry eyebrows
    g.beginFill(0x3a2a2a);
    g.drawPolygon([-16, -12, -4, -8, -16, -6]);
    g.drawPolygon([16, -12, 4, -8, 16, -6]);
    g.endFill();

    // eyes
    g.beginFill(0xffe066);
    g.drawCircle(-8, -4, 6);
    g.drawCircle(8, -4, 6);
    g.endFill();

    g.beginFill(0x1c1c1c);
    g.drawCircle(-8, -4, 2.5);
    g.drawCircle(8, -4, 2.5);
    g.endFill();

    // mouth + teeth
    g.beginFill(0x3a1414);
    g.drawRoundedRect(-12, 8, 24, 10, 4);
    g.endFill();

    g.beginFill(0xffffff);
    g.drawPolygon([-9, 8, -5, 8, -7, 14]);
    g.drawPolygon([1, 8, 5, 8, 3, 14]);
    g.drawPolygon([9, 8, 13, 8, 11, 14]);
    g.endFill();

    // back spikes
    g.beginFill(0xc0392b);
    g.drawPolygon([-6, -24, 0, -32, 6, -24]);
    g.endFill();

    container.addChild(g);
    return container;
  }

  update(deltaSeconds: number, speed: number): void {
    this.container.x -= speed * deltaSeconds;
    this.time += deltaSeconds * PULSE_SPEED;
    this.body.scale.set(1, 1 + Math.sin(this.time) * PULSE_AMOUNT);
    this.container.rotation = Math.sin(this.container.x * 0.03) * 0.08;
  }

  get bounds() {
    return { x: this.container.x, y: this.container.y, radius: RADIUS };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
