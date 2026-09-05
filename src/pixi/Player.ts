import * as PIXI from 'pixi.js';
import type { CharacterAnimation, CharacterClass } from '../types';

type AnimState = 'run' | 'attack';

const TARGET_HEIGHT = 110; // on-screen character height in px, regardless of source sprite resolution
const RUN_STEP_INTERVAL = 0.18; // seconds between footstep dust puffs at speedMultiplier = 1

function sliceFrames(anim: CharacterAnimation): PIXI.Texture[] {
  const baseTexture = PIXI.BaseTexture.from(anim.src);
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
  private attackTimer = 0;
  private stepTimer = 0;
  private stepped = false;

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
    }

    if (this.state === 'attack') {
      this.attackTimer -= deltaSeconds;
      if (this.attackTimer <= 0) {
        this.setState('run');
      }
    }

    this.stepTimer += deltaSeconds * speedMultiplier;
    if (this.stepTimer >= RUN_STEP_INTERVAL) {
      this.stepTimer -= RUN_STEP_INTERVAL;
      this.stepped = true;
    }
  }

  /** Briefly switches to the attack animation, then returns to running on its own. */
  playAttack(): void {
    this.setState('attack');
    const anim = this.character.animations.attack;
    this.attackTimer = anim.frameCount / anim.fps;
  }

  private setState(next: AnimState): void {
    if (this.state === next) return;
    this.state = next;

    const def = this.character.animations[next];
    this.sprite.textures = this.textures[next];
    this.sprite.animationSpeed = def.fps / 60;
    this.sprite.loop = next === 'run';
    this.sprite.gotoAndPlay(0);
  }

  /** Returns true once per footstep interval, then resets. */
  consumeFootstep(): boolean {
    const stepped = this.stepped;
    this.stepped = false;
    return stepped;
  }

  get feetPosition(): { x: number; y: number } {
    return { x: this.container.x, y: this.baseY };
  }

  get bounds() {
    return { x: this.container.x, y: this.container.y - 30, radius: 32 };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
