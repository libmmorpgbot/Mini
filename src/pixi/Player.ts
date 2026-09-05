import * as PIXI from 'pixi.js';
import type { CharacterAnimation, CharacterClass } from '../types';

type AnimState = 'run' | 'attack';

const TARGET_HEIGHT = 110; // on-screen character height in px, regardless of source sprite resolution
const RUN_STEP_INTERVAL = 0.18; // seconds between footstep dust puffs at speedMultiplier = 1
const DAMAGE_FLASH_DURATION = 0.15;

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

  private state: AnimState = 'run';
  private inCombat = false;
  private attackTickTimer = 0;
  private attackTicked = false;
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

    const scale = TARGET_HEIGHT / character.animations.idle.frameHeight;

    this.sprite = new PIXI.AnimatedSprite(this.textures.run);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.set(scale);
    this.sprite.animationSpeed = character.animations.run.fps / 60;
    this.sprite.play();

    this.container.addChild(this.sprite);
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
      const anim = this.character.animations.attack;
      const loopDuration = anim.frameCount / anim.fps;
      this.attackTickTimer += deltaSeconds;
      if (this.attackTickTimer >= loopDuration) {
        this.attackTickTimer -= loopDuration;
        this.attackTicked = true;
      }
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
    this.sprite.loop = true;
    this.sprite.gotoAndPlay(0);

    if (next === 'attack') {
      this.attackTickTimer = 0;
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
    return { x: this.container.x, y: this.container.y - TARGET_HEIGHT };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
