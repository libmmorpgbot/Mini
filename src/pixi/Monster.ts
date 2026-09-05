import * as PIXI from 'pixi.js';

const PULSE_SPEED = 6;
const PULSE_AMOUNT = 0.05;
const ATTACK_LUNGE_DISTANCE = 10;
const ATTACK_LUNGE_DURATION = 0.18;
const HIT_RECOIL_DISTANCE = 6;
const HIT_RECOIL_DURATION = 0.15;
const HEALTH_BAR_WIDTH = 40;
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_Y = -72;

// The body is drawn with its feet at local y = 0, growing upward (negative y),
// so the container's own y can sit directly on the ground line.
const BODY_TOP = -48;

let nextId = 0;

export class Monster {
  readonly id: number;
  readonly container: PIXI.Container;
  readonly maxHealth: number;
  readonly damage: number;
  readonly attackIntervalSeconds: number;

  health: number;

  private readonly body: PIXI.Container;
  private readonly healthBarFill: PIXI.Graphics;
  private time: number;
  private inRange = false;
  private attackTimer = 0;
  private attackTicked = false;
  private attackLungeTimer = 0;
  private hitRecoilTimer = 0;

  constructor(x: number, y: number, maxHealth: number, damage: number, attackIntervalSeconds: number) {
    this.id = nextId++;
    this.time = Math.random() * Math.PI * 2;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.damage = damage;
    this.attackIntervalSeconds = attackIntervalSeconds;

    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;

    this.body = this.createBody();
    this.healthBarFill = new PIXI.Graphics();

    this.container.addChild(this.body, this.createHealthBar());
  }

  private createBody(): PIXI.Container {
    const container = new PIXI.Container();
    const g = new PIXI.Graphics();

    // tail
    g.beginFill(0xa5281c);
    g.drawPolygon([20, -14, 40, -22, 22, -4]);
    g.endFill();

    // body
    g.beginFill(0xe74c3c);
    g.lineStyle(3, 0x8e2418);
    g.drawRoundedRect(-24, -48, 48, 48, 10);
    g.endFill();

    // belly patch
    g.lineStyle(0);
    g.beginFill(0xf3a6a6, 0.7);
    g.drawRoundedRect(-14, -28, 28, 22, 8);
    g.endFill();

    // horns
    g.beginFill(0x3a2a2a);
    g.drawPolygon([-14, -48, -10, -62, -4, -48]);
    g.drawPolygon([4, -48, 10, -62, 14, -48]);
    g.endFill();

    // angry eyebrows
    g.beginFill(0x3a2a2a);
    g.drawPolygon([-16, -36, -4, -32, -16, -30]);
    g.drawPolygon([16, -36, 4, -32, 16, -30]);
    g.endFill();

    // eyes
    g.beginFill(0xffe066);
    g.drawCircle(-8, -28, 6);
    g.drawCircle(8, -28, 6);
    g.endFill();

    g.beginFill(0x1c1c1c);
    g.drawCircle(-8, -28, 2.5);
    g.drawCircle(8, -28, 2.5);
    g.endFill();

    // mouth + teeth
    g.beginFill(0x3a1414);
    g.drawRoundedRect(-12, -16, 24, 10, 4);
    g.endFill();

    g.beginFill(0xffffff);
    g.drawPolygon([-9, -16, -5, -16, -7, -10]);
    g.drawPolygon([1, -16, 5, -16, 3, -10]);
    g.drawPolygon([9, -16, 13, -16, 11, -10]);
    g.endFill();

    // back spikes
    g.beginFill(0xc0392b);
    g.drawPolygon([-6, -48, 0, -56, 6, -48]);
    g.endFill();

    container.addChild(g);
    return container;
  }

  private createHealthBar(): PIXI.Container {
    const wrap = new PIXI.Container();
    wrap.y = HEALTH_BAR_Y;

    const track = new PIXI.Graphics();
    track.beginFill(0x1c1c1c, 0.6);
    track.drawRoundedRect(-HEALTH_BAR_WIDTH / 2, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 2);
    track.endFill();
    wrap.addChild(track);

    // Drawn from local x=0 (not centered) so scaling `.x` shrinks it from the right,
    // anchored to the left edge set below -- the usual "draining" health bar look.
    this.healthBarFill.beginFill(0x4ade80);
    this.healthBarFill.drawRoundedRect(0, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 2);
    this.healthBarFill.endFill();
    this.healthBarFill.x = -HEALTH_BAR_WIDTH / 2;
    wrap.addChild(this.healthBarFill);

    return wrap;
  }

  private updateHealthBar(): void {
    const ratio = Math.max(0, this.health / this.maxHealth);
    this.healthBarFill.scale.x = ratio;
    this.healthBarFill.tint = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfacc15 : 0xef4444;
  }

  /** Whether the player is within melee range: stops the monster and starts its own attack timer. */
  setInRange(inRange: boolean): void {
    if (this.inRange === inRange) return;
    this.inRange = inRange;
    if (inRange) this.attackTimer = 0;
  }

  get isInRange(): boolean {
    return this.inRange;
  }

  update(deltaSeconds: number, speed: number): void {
    if (!this.inRange) {
      this.container.x -= speed * deltaSeconds;
      this.container.rotation = Math.sin(this.container.x * 0.03) * 0.08;
    } else {
      this.container.rotation = 0;
      this.attackTimer += deltaSeconds;
      if (this.attackTimer >= this.attackIntervalSeconds) {
        this.attackTimer -= this.attackIntervalSeconds;
        this.attackTicked = true;
        this.attackLungeTimer = ATTACK_LUNGE_DURATION;
      }
    }

    this.time += deltaSeconds * PULSE_SPEED;
    this.body.scale.set(1, 1 + Math.sin(this.time) * PULSE_AMOUNT);

    let offsetX = 0;
    if (this.attackLungeTimer > 0) {
      this.attackLungeTimer -= deltaSeconds;
      offsetX -= Math.sin(Math.max(0, this.attackLungeTimer / ATTACK_LUNGE_DURATION) * Math.PI) * ATTACK_LUNGE_DISTANCE;
    }
    if (this.hitRecoilTimer > 0) {
      this.hitRecoilTimer -= deltaSeconds;
      offsetX += Math.sin(Math.max(0, this.hitRecoilTimer / HIT_RECOIL_DURATION) * Math.PI) * HIT_RECOIL_DISTANCE;
    }
    this.body.x = offsetX;
  }

  /** Returns true once per attack-interval while the player is in range, then resets. */
  consumeAttackTick(): boolean {
    const ticked = this.attackTicked;
    this.attackTicked = false;
    return ticked;
  }

  /** Applies damage and returns true if this killed the monster. */
  takeDamage(amount: number): boolean {
    this.health = Math.max(0, this.health - amount);
    this.updateHealthBar();
    this.hitRecoilTimer = HIT_RECOIL_DURATION;
    return this.health <= 0;
  }

  get x(): number {
    return this.container.x;
  }

  get topPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y + BODY_TOP };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
