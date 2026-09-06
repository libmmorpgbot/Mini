import * as PIXI from 'pixi.js';
import type { CharacterAnimation, CharacterClass } from '../types';

type AnimState = 'run' | 'attack';

const TARGET_HEIGHT = 110; // on-screen character height in px, regardless of source sprite resolution
const RUN_STEP_INTERVAL = 0.18; // seconds between footstep dust puffs at speedMultiplier = 1
const DAMAGE_FLASH_DURATION = 0.15;

const HEALTH_BAR_WIDTH = 46;
const HEALTH_BAR_HEIGHT = 5;

/**
 * Anchors below, as flat fractions of TARGET_HEIGHT -- deliberately ignoring
 * each animation's transparent bottomPadding (which varies per sprite sheet
 * and made this drift wildly), in favour of simple, constant references.
 */
const CENTER_Y = -TARGET_HEIGHT / 2; // chest height -- health bar sits just above this
const HEALTH_BAR_Y = CENTER_Y - 20;
const HAND_Y = -TARGET_HEIGHT * 0.35; // lower, hand/weapon height -- where hits & projectiles launch from

function sliceFrames(anim: CharacterAnimation): PIXI.Texture[] {
  const baseTexture = PIXI.BaseTexture.from(anim.src, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  const frames: PIXI.Texture[] = [];
  for (let i = 0; i < anim.frameCount; i++) {
    frames.push(
      new PIXI.Texture(baseTexture, new PIXI.Rectangle(i * anim.frameWidth, 0, anim.frameWidth, anim.frameHeight))
    );
  }
  return frames;
}

export class Player {
  readonly container: PIXI.Container;
  private readonly baseY: number;
  private readonly character: CharacterClass;
  private readonly sprite: PIXI.AnimatedSprite;
  private readonly textures: Record<AnimState, PIXI.Texture[]>;
  private readonly scale: number;
  private readonly healthBarFill: PIXI.Graphics;
  private readonly healthBarWrap: PIXI.Container;

  private state: AnimState = 'run';
  private inCombat = false;
  private attackTicked = false;
  private prevAttackFrame = -1;
  private stepTimer = 0;
  private stepped = false;
  private flashTimer = 0;

  constructor(x: number, y: number, character: CharacterClass) {
    this.character = character;
    this.baseY = y;

    this.textures = {
      run: sliceFrames(character.animations.run),
      attack: sliceFrames(character.animations.attack),
    };

    this.container = new PIXI.Container();
    this.container.x = x;
    this.container.y = y;

    this.scale = TARGET_HEIGHT / character.animations.idle.frameHeight;

    this.sprite = new PIXI.AnimatedSprite(this.textures.run);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.set(this.scale);
    this.sprite.y = character.animations.run.bottomPadding * this.scale;
    this.sprite.animationSpeed = character.animations.run.fps / 60;
    this.sprite.play();

    this.healthBarFill = new PIXI.Graphics();
    this.healthBarWrap = this.createHealthBar();
    this.healthBarWrap.y = HEALTH_BAR_Y;
    this.container.addChild(this.sprite, this.healthBarWrap);
  }

  private createHealthBar(): PIXI.Container {
    const wrap = new PIXI.Container();

    const track = new PIXI.Graphics();
    track.beginFill(0x1c1c1c, 0.6);
    track.drawRoundedRect(-HEALTH_BAR_WIDTH / 2, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 2);
    track.endFill();
    wrap.addChild(track);

    this.healthBarFill.beginFill(0x4ade80);
    this.healthBarFill.drawRoundedRect(0, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 2);
    this.healthBarFill.endFill();
    this.healthBarFill.x = -HEALTH_BAR_WIDTH / 2;
    wrap.addChild(this.healthBarFill);

    return wrap;
  }

  /** Updates the floating health bar above the player's head. */
  setHealth(current: number, max: number): void {
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    this.healthBarFill.scale.x = ratio;
    this.healthBarFill.tint = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfacc15 : 0xef4444;
  }

  update(deltaSeconds: number, speedMultiplier: number): void {
    if (this.state === 'run') {
      this.sprite.animationSpeed = (this.character.animations.run.fps / 60) * speedMultiplier;

      this.stepTimer += deltaSeconds * speedMultiplier;
      if (this.stepTimer >= RUN_STEP_INTERVAL) {
        this.stepTimer -= RUN_STEP_INTERVAL;
        this.stepped = true;
      }
    } else {
      // Fire on the frame where the sprite sheet actually lands its hit/release
      // (per-character hitFrame if set, otherwise the penultimate frame) rather
      // than at a fixed time offset unrelated to the art.
      const anim = this.character.animations.attack;
      const targetFrame = anim.hitFrame ?? Math.max(0, anim.frameCount - 2);
      const frame = this.sprite.currentFrame;
      if (frame === targetFrame && this.prevAttackFrame !== targetFrame) {
        this.attackTicked = true;
      }
      this.prevAttackFrame = frame;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaSeconds;
      this.sprite.tint = this.flashTimer > 0 ? 0xff8888 : 0xffffff;
    }
  }

  /** Switches between running (world scrolling) and a looping melee attack (standing still). */
  setCombat(active: boolean): void {
    if (this.inCombat === active) return;
    this.inCombat = active;
    this.setState(active ? 'attack' : 'run');
  }

  private setState(next: AnimState): void {
    if (this.state === next) return;
    this.state = next;

    const def = this.character.animations[next];
    this.sprite.textures = this.textures[next];
    this.sprite.animationSpeed = def.fps / 60;
    this.sprite.y = def.bottomPadding * this.scale;
    this.sprite.loop = true;
    this.sprite.gotoAndPlay(0);

    if (next === 'attack') {
      this.prevAttackFrame = -1;
    } else {
      this.stepTimer = 0;
    }
  }

  flashDamage(): void {
    this.flashTimer = DAMAGE_FLASH_DURATION;
  }

  /** Returns true once per footstep interval (only while running), then resets. */
  consumeFootstep(): boolean {
    const stepped = this.stepped;
    this.stepped = false;
    return stepped;
  }

  /** Returns true once per attack-animation loop (only while fighting), then resets. */
  consumeAttackTick(): boolean {
    const ticked = this.attackTicked;
    this.attackTicked = false;
    return ticked;
  }

  get feetPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.baseY };
  }

  get headPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.container.y + HAND_Y };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
