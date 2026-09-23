import * as PIXI from 'pixi.js';
import type { MonsterDef, MonsterSheet } from '../data/monsters';

const HIT_RECOIL_DISTANCE = 6;
const HIT_RECOIL_DURATION = 0.15;
const HEALTH_BAR_WIDTH = 46;
const HEALTH_BAR_HEIGHT = 5;
const LEVEL_BADGE_RADIUS = 8;
/** Monster sheets are 64px or 128px frames; both land on the same on-screen size. */
const TARGET_FRAME_PX = 150;
const BOSS_SCALE = 1.35;
/** Enemies swing every 1.4-2.0 s (server/game/Room.js). */
const ATTACK_INTERVAL_MIN = 1.4;
const ATTACK_INTERVAL_MAX = 2.0;
const DEATH_FADE_SECONDS = 0.35;
/** Share of their own walking speed monsters approach with, on top of the world scroll. */
const OWN_WALK_FACTOR = 0.5;

const textureCache = new Map<string, PIXI.Texture[]>();

/** Must be called when the Pixi app that owns these textures is destroyed. */
export function clearMonsterTextureCache(): void {
  textureCache.clear();
}

/** Row 2 of a 4-direction sheet: the monster facing left, toward the hero. */
function leftFacingFrames(sheet: MonsterSheet, frameSize: number): PIXI.Texture[] {
  const key = `${sheet.src}|${frameSize}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const base = PIXI.BaseTexture.from(sheet.src, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  const frames: PIXI.Texture[] = [];
  for (let i = 0; i < sheet.cols; i++) {
    frames.push(new PIXI.Texture(base, new PIXI.Rectangle(i * frameSize, 2 * frameSize, frameSize, frameSize)));
  }
  textureCache.set(key, frames);
  return frames;
}

export interface MonsterSpawn {
  def: MonsterDef;
  name: string;
  nameColor: number;
  level: number;
  isBoss: boolean;
  maxHealth: number;
  atk: number;
  armor: number;
}

let nextId = 0;

export class Monster {
  readonly id: number;
  readonly container: PIXI.Container;
  readonly def: MonsterDef;
  readonly level: number;
  readonly isBoss: boolean;
  readonly maxHealth: number;
  readonly atk: number;
  readonly armor: number;

  health: number;
  /** Seconds left stunned/frozen: no attacks, no walking. */
  stunTimer = 0;

  private readonly body: PIXI.Container;
  private readonly sprite: PIXI.AnimatedSprite;
  private readonly frames: { walk: PIXI.Texture[]; attack: PIXI.Texture[]; death: PIXI.Texture[] };
  private readonly healthBarFill: PIXI.Graphics;
  private readonly headY: number;
  private inRange = false;
  private attackTimer = 0;
  private nextAttackIn = 0;
  private attackTicked = false;
  private hitRecoilTimer = 0;
  private dying = false;
  private deathFade = 0;

  constructor(x: number, y: number, spawn: MonsterSpawn) {
    this.id = nextId++;
    this.def = spawn.def;
    this.level = spawn.level;
    this.isBoss = spawn.isBoss;
    this.maxHealth = spawn.maxHealth;
    this.health = spawn.maxHealth;
    this.atk = spawn.atk;
    this.armor = spawn.armor;
    this.rollNextAttack();

    const sprite = spawn.def.sprite;
    this.frames = {
      walk: leftFacingFrames(sprite.walk, sprite.frameSize),
      attack: leftFacingFrames(sprite.attack, sprite.frameSize),
      death: leftFacingFrames(sprite.death, sprite.frameSize),
    };

    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;

    const scale = (TARGET_FRAME_PX / sprite.frameSize) * (spawn.isBoss ? BOSS_SCALE : 1);
    this.body = new PIXI.Container();
    this.sprite = new PIXI.AnimatedSprite(this.frames.walk);
    this.sprite.anchor.set(0.5, sprite.feetY / sprite.frameSize);
    this.sprite.scale.set(scale);
    this.sprite.animationSpeed = sprite.walk.fps / 60;
    this.sprite.play();
    this.body.addChild(this.sprite);

    // Roughly the top of the figure: sheets leave ~a third of the frame empty above it.
    this.headY = -sprite.feetY * scale * 0.72;

    this.healthBarFill = new PIXI.Graphics();
    this.container.addChild(this.body, this.createHealthBar(spawn));
  }

  private rollNextAttack(): void {
    this.nextAttackIn = ATTACK_INTERVAL_MIN + Math.random() * (ATTACK_INTERVAL_MAX - ATTACK_INTERVAL_MIN);
  }

  private createHealthBar(spawn: MonsterSpawn): PIXI.Container {
    const wrap = new PIXI.Container();
    wrap.y = this.headY - 14;

    const name = new PIXI.Text(spawn.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: spawn.isBoss ? 12 : 10,
      fontWeight: '800',
      fill: spawn.isBoss ? 0xffd166 : spawn.nameColor,
      stroke: 0x0b0e14,
      strokeThickness: 3,
    });
    name.anchor.set(0.5, 1);
    name.y = -3;
    wrap.addChild(name);

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

    const badgeX = -HEALTH_BAR_WIDTH / 2 - LEVEL_BADGE_RADIUS - 3;
    const badgeY = HEALTH_BAR_HEIGHT / 2;

    const badge = new PIXI.Graphics();
    badge.lineStyle(1, 0x1c1c1c, 0.6);
    badge.beginFill(spawn.isBoss ? 0xef4444 : 0xffb703);
    badge.drawCircle(badgeX, badgeY, LEVEL_BADGE_RADIUS);
    badge.endFill();
    wrap.addChild(badge);

    const label = new PIXI.Text(`${this.level}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 9,
      fontWeight: '800',
      fill: 0x1c1c1c,
    });
    label.anchor.set(0.5);
    label.x = badgeX;
    label.y = badgeY;
    wrap.addChild(label);

    return wrap;
  }

  private updateHealthBar(): void {
    const ratio = Math.max(0, this.health / this.maxHealth);
    this.healthBarFill.scale.x = ratio;
    this.healthBarFill.tint = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfacc15 : 0xef4444;
  }

  private play(frames: PIXI.Texture[], fps: number, loop: boolean): void {
    this.sprite.textures = frames;
    this.sprite.animationSpeed = fps / 60;
    this.sprite.loop = loop;
    this.sprite.gotoAndPlay(0);
  }

  /** Whether the hero is within reach: stops the monster and starts its own attack timer. */
  setInRange(inRange: boolean): void {
    if (this.inRange === inRange || this.dying) return;
    this.inRange = inRange;
    if (inRange) {
      this.attackTimer = 0;
    } else {
      this.play(this.frames.walk, this.def.sprite.walk.fps, true);
    }
  }

  get isInRange(): boolean {
    return this.inRange;
  }

  get isDying(): boolean {
    return this.dying;
  }

  /** True once the death animation and fade are over and it can be removed. */
  get isGone(): boolean {
    return this.dying && this.deathFade >= DEATH_FADE_SECONDS;
  }

  update(deltaSeconds: number, worldSpeed: number): void {
    if (this.dying) {
      this.container.x -= worldSpeed * deltaSeconds;
      if (!this.sprite.playing) {
        this.deathFade += deltaSeconds;
        this.container.alpha = Math.max(0, 1 - this.deathFade / DEATH_FADE_SECONDS);
      }
      return;
    }

    const stunned = this.stunTimer > 0;
    if (stunned) {
      this.stunTimer -= deltaSeconds;
      this.sprite.tint = 0x9fd8ff;
    } else {
      this.sprite.tint = 0xffffff;
    }

    if (!this.inRange) {
      const own = stunned ? 0 : this.def.spd * OWN_WALK_FACTOR;
      this.container.x -= (worldSpeed + own) * deltaSeconds;
      this.sprite.animationSpeed = stunned ? 0 : this.def.sprite.walk.fps / 60;
    } else if (!stunned) {
      this.attackTimer += deltaSeconds;
      if (this.attackTimer >= this.nextAttackIn) {
        this.attackTimer = 0;
        this.rollNextAttack();
        this.attackTicked = true;
        this.play(this.frames.attack, this.def.sprite.attack.fps, false);
      }
    }

    let offsetX = 0;
    if (this.hitRecoilTimer > 0) {
      this.hitRecoilTimer -= deltaSeconds;
      offsetX += Math.sin(Math.max(0, this.hitRecoilTimer / HIT_RECOIL_DURATION) * Math.PI) * HIT_RECOIL_DISTANCE;
    }
    this.body.x = offsetX;
  }

  /** Returns true once per swing while the hero is in range, then resets. */
  consumeAttackTick(): boolean {
    const ticked = this.attackTicked;
    this.attackTicked = false;
    return ticked;
  }

  /** Applies damage and returns true if this killed the monster (which then plays its death animation). */
  takeDamage(amount: number): boolean {
    if (this.dying) return false;
    this.health = Math.max(0, this.health - amount);
    this.updateHealthBar();
    this.hitRecoilTimer = HIT_RECOIL_DURATION;
    if (this.health > 0) return false;

    this.dying = true;
    this.inRange = false;
    this.sprite.tint = 0xffffff;
    this.play(this.frames.death, this.def.sprite.death.fps, false);
    return true;
  }

  /** Shoves the monster away from the hero (the hero "leaps back"). */
  pushBack(px: number, maxX: number): void {
    if (this.dying) return;
    this.container.x = Math.min(maxX, this.container.x + px);
    this.setInRange(false);
  }

  get x(): number {
    return this.container.x;
  }

  get topPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y + this.headY };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
