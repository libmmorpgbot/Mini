import * as PIXI from 'pixi.js';

const HIP_Y = -38;
const SHOULDER_Y = -72;
const HEAD_Y = -86;
const HEAD_RADIUS = 14;
const LEG_LENGTH = 38;
const ARM_LENGTH = 26;

const BOB_FREQUENCY = 10;
const BOB_AMPLITUDE = 6;
const LEG_SWING = 0.9;
const ARM_SWING = 0.7;

const SKIN_COLOR = 0xffd8a8;
const HAIR_COLOR = 0x4a3527;
const SHIRT_COLOR = 0x3ba3ff;
const SHIRT_OUTLINE = 0x1c5f99;
const PANTS_COLOR_BACK = 0x1b2733;
const PANTS_COLOR_FRONT = 0x24344a;
const SHOE_COLOR = 0x2b2b2b;

export class Player {
  readonly container: PIXI.Container;
  private readonly baseY: number;
  private time = 0;
  private lastStepIndex = 0;
  private stepped = false;

  private readonly legBack: PIXI.Container;
  private readonly legFront: PIXI.Container;
  private readonly armBack: PIXI.Container;
  private readonly armFront: PIXI.Container;

  constructor(x: number, y: number) {
    this.baseY = y;
    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;

    this.legBack = this.createLeg(PANTS_COLOR_BACK);
    this.legBack.x = -5;
    this.legBack.y = HIP_Y;

    this.armBack = this.createArm();
    this.armBack.x = -8;
    this.armBack.y = SHOULDER_Y;

    const torso = this.createTorso();

    const head = this.createHead();
    head.y = HEAD_Y;

    this.armFront = this.createArm();
    this.armFront.x = 8;
    this.armFront.y = SHOULDER_Y;

    this.legFront = this.createLeg(PANTS_COLOR_FRONT);
    this.legFront.x = 5;
    this.legFront.y = HIP_Y;

    this.container.addChild(this.legBack, this.armBack, torso, head, this.armFront, this.legFront);
  }

  private createLeg(pantsColor: number): PIXI.Container {
    const pivot = new PIXI.Container();
    const g = new PIXI.Graphics();

    g.beginFill(pantsColor);
    g.drawRoundedRect(-6, 0, 12, LEG_LENGTH - 10, 6);
    g.endFill();

    g.beginFill(SHOE_COLOR);
    g.drawRoundedRect(-8, LEG_LENGTH - 12, 18, 12, 4);
    g.endFill();

    pivot.addChild(g);
    return pivot;
  }

  private createArm(): PIXI.Container {
    const pivot = new PIXI.Container();
    const g = new PIXI.Graphics();

    g.beginFill(SHIRT_COLOR);
    g.lineStyle(2, SHIRT_OUTLINE);
    g.drawRoundedRect(-5, 0, 10, 16, 5);
    g.endFill();

    g.lineStyle(0);
    g.beginFill(SKIN_COLOR);
    g.drawCircle(0, ARM_LENGTH - 6, 6);
    g.endFill();

    pivot.addChild(g);
    return pivot;
  }

  private createTorso(): PIXI.Container {
    const container = new PIXI.Container();
    const g = new PIXI.Graphics();

    g.beginFill(SHIRT_COLOR);
    g.lineStyle(3, SHIRT_OUTLINE);
    g.drawRoundedRect(-16, SHOULDER_Y, 32, HIP_Y - SHOULDER_Y + 6, 12);
    g.endFill();

    g.lineStyle(0);
    g.beginFill(0x1c1c1c);
    g.drawRect(-16, HIP_Y - 4, 32, 6);
    g.endFill();

    container.addChild(g);
    return container;
  }

  private createHead(): PIXI.Container {
    const container = new PIXI.Container();
    const g = new PIXI.Graphics();

    g.beginFill(SKIN_COLOR);
    g.lineStyle(2, 0xcf9f6d);
    g.drawCircle(0, 0, HEAD_RADIUS);
    g.endFill();

    g.lineStyle(0);
    g.beginFill(HAIR_COLOR);
    g.drawEllipse(0, -HEAD_RADIUS * 0.7, HEAD_RADIUS + 1, HEAD_RADIUS * 0.55);
    g.endFill();

    g.beginFill(0xffffff);
    g.drawCircle(-5, -1, 3.5);
    g.drawCircle(5, -1, 3.5);
    g.endFill();

    g.beginFill(0x1c1c1c);
    g.drawCircle(-4, -1, 1.6);
    g.drawCircle(6, -1, 1.6);
    g.endFill();

    g.lineStyle(1.6, 0x8a5a3b);
    g.moveTo(-4, 6);
    g.quadraticCurveTo(0, 9, 4, 6);

    container.addChild(g);
    return container;
  }

  update(deltaSeconds: number, speedMultiplier: number): void {
    this.time += deltaSeconds * speedMultiplier;
    const phase = this.time * BOB_FREQUENCY;
    const swing = Math.sin(phase);

    this.legFront.rotation = swing * LEG_SWING;
    this.legBack.rotation = -swing * LEG_SWING;
    this.armFront.rotation = -swing * ARM_SWING;
    this.armBack.rotation = swing * ARM_SWING;

    const bounce = Math.abs(swing) * BOB_AMPLITUDE;
    this.container.y = this.baseY - bounce;
    this.container.rotation = swing * 0.03;

    const stepIndex = Math.floor(phase / Math.PI);
    this.stepped = stepIndex !== this.lastStepIndex;
    this.lastStepIndex = stepIndex;
  }

  /** Returns true once per ground contact (foot plant), then resets. */
  consumeFootstep(): boolean {
    const stepped = this.stepped;
    this.stepped = false;
    return stepped;
  }

  get feetPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.baseY };
  }

  get bounds() {
    return { x: this.container.x, y: this.container.y - 20, radius: 36 };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
