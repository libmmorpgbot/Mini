import * as PIXI from 'pixi.js';
import { ParallaxBackground } from './ParallaxBackground';
import { Player } from './Player';
import { Monster } from './Monster';
import { DustEmitter } from './DustParticles';
import { DamageNumberEmitter } from './DamageNumbers';
import { ProjectileEmitter } from './Projectile';
import { getLocationForLevel, LOCATIONS, type LocationDef } from '../data/locations';
import type { CharacterClass } from '../types';

export interface GameSceneCallbacks {
  onMonsterKilled: () => void;
  onMonsterEscaped: () => void;
  onPlayerDamaged: (amount: number) => void;
  onPlayerRegen: (amount: number) => void;
}

const BASE_MOVE_SPEED = 180; // px / second at speedMultiplier = 1
const MONSTER_SPAWN_MIN_MS = 3000;
const MONSTER_SPAWN_MAX_MS = 5500;
const PLAYER_X_RATIO = 0.3;
const GROUND_Y_RATIO = 0.85;
const MONSTER_DESPAWN_X = -60;
const DUST_PER_STEP_MIN = 2;
const DUST_PER_STEP_MAX = 3;

const MONSTER_BASE_HEALTH = 44;
const MONSTER_HEALTH_PER_LEVEL = 5;
const MONSTER_BASE_DAMAGE = 5;
const MONSTER_DAMAGE_PER_LEVEL = 0.6;
const MONSTER_ATTACK_INTERVAL_SECONDS = 0.85;
const REGEN_PER_SECOND = 6;
const REGEN_TICK_INTERVAL = 0.5;

const BACKGROUND_COLOR = 0xbfe0e8;

export class GameScene {
  private readonly app: PIXI.Application;
  private readonly host: HTMLDivElement;
  private readonly worldContainer: PIXI.Container;
  private background: ParallaxBackground;
  private readonly player: Player;
  private readonly playerDamage: number;
  private readonly attackRange: number;
  private readonly rangedAttack: CharacterClass['rangedAttack'];
  private readonly monsters: Monster[] = [];
  private readonly monstersContainer: PIXI.Container;
  private readonly dustEmitter: DustEmitter;
  private readonly damageNumbers: DamageNumberEmitter;
  private readonly projectiles: ProjectileEmitter;
  private readonly callbacks: GameSceneCallbacks;

  private speedMultiplier = 1;
  private level = 1;
  private currentLocation: LocationDef;
  private spawnTimer = 0;
  private nextSpawnDelay = 0;
  private regenTimer = 0;
  private destroyed = false;

  constructor(host: HTMLDivElement, character: CharacterClass, callbacks: GameSceneCallbacks) {
    this.host = host;
    this.callbacks = callbacks;
    this.playerDamage = character.baseDamage;
    this.attackRange = character.attackRange;
    this.rangedAttack = character.rangedAttack;

    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;

    this.app = new PIXI.Application({
      width,
      height,
      backgroundColor: BACKGROUND_COLOR,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.view as unknown as HTMLCanvasElement);

    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);

    this.currentLocation = getLocationForLevel(this.level);
    this.background = new ParallaxBackground(
      this.app.renderer,
      width,
      height,
      this.currentLocation.palette,
      this.currentLocation.landmark
    );
    this.worldContainer.addChild(this.background.container);

    this.dustEmitter = new DustEmitter();
    this.worldContainer.addChild(this.dustEmitter.container);

    this.player = new Player(width * PLAYER_X_RATIO, height * GROUND_Y_RATIO, character);
    this.worldContainer.addChild(this.player.container);

    this.monstersContainer = new PIXI.Container();
    this.worldContainer.addChild(this.monstersContainer);

    this.damageNumbers = new DamageNumberEmitter();
    this.worldContainer.addChild(this.damageNumbers.container);

    this.projectiles = new ProjectileEmitter();
    this.worldContainer.addChild(this.projectiles.container);

    this.scheduleNextSpawn();

    this.app.ticker.add(this.tick);
    window.addEventListener('resize', this.handleResize);
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  setLevel(level: number): void {
    this.level = level;
  }

  /** Switches to a specific location by id (from the Map tab), independent of player level. */
  setLocation(locationId: string): void {
    if (locationId === this.currentLocation.id) return;
    const location = LOCATIONS.find((l) => l.id === locationId);
    if (!location) return;

    this.currentLocation = location;
    this.swapBackground(location);
  }

  setPlayerHealth(current: number, max: number): void {
    this.player.setHealth(current, max);
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener('resize', this.handleResize);
    this.app.ticker.remove(this.tick);

    for (const monster of this.monsters) {
      monster.destroy();
    }
    this.monsters.length = 0;

    this.projectiles.destroy();
    this.damageNumbers.destroy();
    this.dustEmitter.destroy();
    this.player.destroy();
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private swapBackground(location: LocationDef): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    this.worldContainer.removeChild(this.background.container);
    this.background.container.destroy({ children: true });
    this.background = new ParallaxBackground(this.app.renderer, width, height, location.palette, location.landmark);
    this.worldContainer.addChildAt(this.background.container, 0);
  }

  private scheduleNextSpawn(): void {
    this.nextSpawnDelay =
      MONSTER_SPAWN_MIN_MS + Math.random() * (MONSTER_SPAWN_MAX_MS - MONSTER_SPAWN_MIN_MS);
    this.spawnTimer = 0;
  }

  private spawnMonster(): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    const [minLevel, maxLevel] = this.currentLocation.monsterLevelRange;
    const rolled = this.level + Math.floor(Math.random() * 4) - 1; // playerLevel-1 .. playerLevel+2
    const monsterLevel = Math.max(minLevel, Math.min(maxLevel, rolled));

    const multiplier = this.currentLocation.statMultiplier;
    const maxHealth = Math.round((MONSTER_BASE_HEALTH + (monsterLevel - 1) * MONSTER_HEALTH_PER_LEVEL) * multiplier);
    const damage = Math.round((MONSTER_BASE_DAMAGE + (monsterLevel - 1) * MONSTER_DAMAGE_PER_LEVEL) * multiplier);
    const monster = new Monster(
      width + 40,
      height * GROUND_Y_RATIO,
      maxHealth,
      damage,
      MONSTER_ATTACK_INTERVAL_SECONDS,
      monsterLevel
    );
    this.monsters.push(monster);
    this.monstersContainer.addChild(monster.container);
  }

  private readonly tick = (): void => {
    if (this.destroyed) return;

    const deltaMS = this.app.ticker.deltaMS;
    const deltaSeconds = deltaMS / 1000;

    // Find the nearest monster within melee range; only it engages the player 1:1,
    // but every monster currently in range still gets to swing back.
    const playerX = this.player.feetPosition.x;
    let engaged: Monster | null = null;
    let engagedDistance = Infinity;
    for (const monster of this.monsters) {
      const distance = monster.x - playerX;
      const inRange = distance <= this.attackRange;
      monster.setInRange(inRange);
      if (inRange && distance < engagedDistance) {
        engagedDistance = distance;
        engaged = monster;
      }
    }

    const combatActive = engaged !== null;
    const speed = combatActive ? 0 : BASE_MOVE_SPEED * this.speedMultiplier;

    this.background.update(deltaSeconds, speed);
    this.player.setCombat(combatActive);
    this.player.update(deltaSeconds, this.speedMultiplier);
    this.dustEmitter.update(deltaSeconds, speed);
    this.damageNumbers.update(deltaSeconds);
    this.projectiles.update(deltaSeconds);

    if (!combatActive) {
      if (this.player.consumeFootstep()) {
        const feet = this.player.feetPosition;
        const count = DUST_PER_STEP_MIN + Math.floor(Math.random() * (DUST_PER_STEP_MAX - DUST_PER_STEP_MIN + 1));
        this.dustEmitter.spawnBurst(feet.x, feet.y, count);
      }

      this.regenTimer += deltaSeconds;
      if (this.regenTimer >= REGEN_TICK_INTERVAL) {
        this.regenTimer -= REGEN_TICK_INTERVAL;
        this.callbacks.onPlayerRegen(REGEN_PER_SECOND * REGEN_TICK_INTERVAL);
      }
    } else {
      this.regenTimer = 0;
    }

    this.spawnTimer += deltaMS;
    if (this.spawnTimer >= this.nextSpawnDelay) {
      this.spawnMonster();
      this.scheduleNextSpawn();
    }

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      monster.update(deltaSeconds, speed);

      if (monster === engaged && this.player.consumeAttackTick()) {
        const top = monster.topPosition;

        if (this.rangedAttack) {
          const origin = this.player.headPosition;
          this.projectiles.spawn(this.rangedAttack, origin.x, origin.y, top.x, top.y);
        }

        this.damageNumbers.spawn(top.x, top.y, this.playerDamage, 0xffe066);

        if (monster.takeDamage(this.playerDamage)) {
          monster.destroy();
          this.monsters.splice(i, 1);
          this.callbacks.onMonsterKilled();
          continue;
        }
      }

      if (monster.consumeAttackTick()) {
        this.callbacks.onPlayerDamaged(monster.damage);
        this.player.flashDamage();
        const head = this.player.headPosition;
        this.damageNumbers.spawn(head.x, head.y, monster.damage, 0xff5555);
      }

      if (monster.x < MONSTER_DESPAWN_X) {
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
  };
}
