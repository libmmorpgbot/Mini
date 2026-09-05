import * as PIXI from 'pixi.js';
import { ParallaxBackground } from './ParallaxBackground';
import { Player } from './Player';
import { Monster } from './Monster';
import { CollisionManager } from './CollisionManager';
import { DustEmitter } from './DustParticles';
import { DayNightCycle, lerpColor } from './DayNightCycle';
import type { CharacterClass } from '../types';

export interface GameSceneCallbacks {
  onMonsterKilled: () => void;
  onMonsterEscaped: () => void;
}

const BASE_MOVE_SPEED = 180; // px / second at speedMultiplier = 1
const MONSTER_SPAWN_MIN_MS = 2000;
const MONSTER_SPAWN_MAX_MS = 4000;
const PLAYER_X_RATIO = 0.3;
const PLAYER_Y_RATIO = 0.79;
const MONSTER_DESPAWN_X = -60;
const DUST_PER_STEP_MIN = 2;
const DUST_PER_STEP_MAX = 3;

const DAY_BACKGROUND_COLOR = 0x87ceeb;
const NIGHT_BACKGROUND_COLOR = 0x0b1e3d;
const NIGHT_OVERLAY_COLOR = 0x0a1030;
const NIGHT_OVERLAY_MAX_ALPHA = 0.55;

export class GameScene {
  private readonly app: PIXI.Application;
  private readonly host: HTMLDivElement;
  private readonly background: ParallaxBackground;
  private readonly player: Player;
  private readonly monsters: Monster[] = [];
  private readonly monstersContainer: PIXI.Container;
  private readonly dustEmitter: DustEmitter;
  private readonly dayNightCycle: DayNightCycle;
  private readonly nightOverlay: PIXI.Graphics;
  private readonly callbacks: GameSceneCallbacks;

  private speedMultiplier = 1;
  private spawnTimer = 0;
  private nextSpawnDelay = 0;
  private destroyed = false;

  constructor(host: HTMLDivElement, character: CharacterClass, callbacks: GameSceneCallbacks) {
    this.host = host;
    this.callbacks = callbacks;

    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;

    this.app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0x87ceeb,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.view as unknown as HTMLCanvasElement);

    const worldContainer = new PIXI.Container();
    this.app.stage.addChild(worldContainer);

    this.background = new ParallaxBackground(width, height);
    worldContainer.addChild(this.background.container);

    this.dustEmitter = new DustEmitter();
    worldContainer.addChild(this.dustEmitter.container);

    this.player = new Player(width * PLAYER_X_RATIO, height * PLAYER_Y_RATIO, character);
    worldContainer.addChild(this.player.container);

    this.monstersContainer = new PIXI.Container();
    worldContainer.addChild(this.monstersContainer);

    this.dayNightCycle = new DayNightCycle();
    this.nightOverlay = new PIXI.Graphics();
    this.drawNightOverlay(width, height);
    this.app.stage.addChild(this.nightOverlay);

    this.scheduleNextSpawn();

    this.app.ticker.add(this.tick);
    window.addEventListener('resize', this.handleResize);
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener('resize', this.handleResize);
    this.app.ticker.remove(this.tick);

    for (const monster of this.monsters) {
      monster.destroy();
    }
    this.monsters.length = 0;

    this.dustEmitter.destroy();
    this.player.destroy();
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private scheduleNextSpawn(): void {
    this.nextSpawnDelay =
      MONSTER_SPAWN_MIN_MS + Math.random() * (MONSTER_SPAWN_MAX_MS - MONSTER_SPAWN_MIN_MS);
    this.spawnTimer = 0;
  }

  private spawnMonster(): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const monster = new Monster(width + 40, height * PLAYER_Y_RATIO);
    this.monsters.push(monster);
    this.monstersContainer.addChild(monster.container);
  }

  private drawNightOverlay(width: number, height: number): void {
    this.nightOverlay.clear();
    this.nightOverlay.beginFill(NIGHT_OVERLAY_COLOR);
    this.nightOverlay.drawRect(0, 0, width, height);
    this.nightOverlay.endFill();
  }

  private readonly tick = (): void => {
    if (this.destroyed) return;

    const deltaMS = this.app.ticker.deltaMS;
    const deltaSeconds = deltaMS / 1000;
    const speed = BASE_MOVE_SPEED * this.speedMultiplier;

    const dayFactor = this.dayNightCycle.update(deltaMS);
    this.nightOverlay.alpha = (1 - dayFactor) * NIGHT_OVERLAY_MAX_ALPHA;
    this.app.renderer.background.color = lerpColor(NIGHT_BACKGROUND_COLOR, DAY_BACKGROUND_COLOR, dayFactor);

    this.background.update(deltaSeconds, speed, dayFactor);
    this.player.update(deltaSeconds, this.speedMultiplier);
    this.dustEmitter.update(deltaSeconds, speed);

    if (this.player.consumeFootstep()) {
      const feet = this.player.feetPosition;
      const count = DUST_PER_STEP_MIN + Math.floor(Math.random() * (DUST_PER_STEP_MAX - DUST_PER_STEP_MIN + 1));
      this.dustEmitter.spawnBurst(feet.x, feet.y, count);
    }

    this.spawnTimer += deltaMS;
    if (this.spawnTimer >= this.nextSpawnDelay) {
      this.spawnMonster();
      this.scheduleNextSpawn();
    }

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      monster.update(deltaSeconds, speed);

      if (CollisionManager.checkCollision(this.player, monster)) {
        monster.destroy();
        this.monsters.splice(i, 1);
        this.player.playAttack();
        this.callbacks.onMonsterKilled();
        continue;
      }

      if (monster.container.x < MONSTER_DESPAWN_X) {
        monster.destroy();
        this.monsters.splice(i, 1);
        this.callbacks.onMonsterEscaped();
      }
    }
  };

  private readonly handleResize = (): void => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.app.renderer.resize(width, height);
    this.drawNightOverlay(width, height);
  };
}
