import * as PIXI from 'pixi.js';
import { ParallaxBackground } from './ParallaxBackground';
import { Player } from './Player';
import { Monster, clearMonsterTextureCache } from './Monster';
import { DustEmitter } from './DustParticles';
import { DamageNumberEmitter } from './DamageNumbers';
import { ProjectileEmitter } from './Projectile';
import { SkillEffectEmitter } from './SkillEffects';
import { getLocationForLevel, LOCATIONS, type LocationDef } from '../data/locations';
import { rollMonster } from '../game/spawn';
import {
  rollDamage,
  skillScaleMult,
  type SkillKey,
} from '../data/gameRules';
import { SKILL_DEF, type BuffKind, type SkillDef } from '../data/skills';
import type { KilledMonster } from '../game/loot';
import type { PlayerStats } from '../game/stats';
import type { CharacterClass } from '../types';

export interface GameSceneCallbacks {
  onMonsterKilled: (monster: KilledMonster, location: LocationDef) => void;
  onPlayerDamaged: (amount: number) => void;
  onPlayerHeal: (amount: number) => void;
}

export interface SkillStatus {
  key: SkillKey;
  name: string;
  img: string;
  level: number;
  cd: number;
  cdLeft: number;
}

export interface BuffStatus {
  buff: BuffKind;
  secLeft: number;
}

const BASE_MOVE_SPEED = 180; // px / second at speedMultiplier = 1
/** Pause after the path clears before the next monster walks in. */
const MONSTER_SPAWN_MIN_MS = 800;
const MONSTER_SPAWN_MAX_MS = 1600;
/** Only one monster on the path at a time; the next spawns once it is dead. */
const MAX_ALIVE_MONSTERS = 1;
const PLAYER_X_RATIO = 0.3;
const GROUND_Y_RATIO = 0.85;
const MONSTER_DESPAWN_X = -60;
const DUST_PER_STEP_MIN = 2;
const DUST_PER_STEP_MAX = 3;
/** Out-of-combat regen, share of max HP per second, on top of the hpRegen stat. */
const REST_REGEN_PCT = 0.03;
const REGEN_TICK_INTERVAL = 0.5;
/** Minimum gap between two auto-cast skills, so their effects don't stack visually. */
const SKILL_GLOBAL_COOLDOWN = 0.6;

const BACKGROUND_COLOR = 0xbfe0e8;

export const BUFF_LABEL: Record<BuffKind, string> = {
  atkPct: 'Атака',
  defPct: 'Защита',
  critChance: 'Крит',
  atkSpeedMult: 'Скор. атаки',
  lifesteal: 'Вампиризм',
  runSpeedMult: 'Бег',
};

export class GameScene {
  private readonly app: PIXI.Application;
  private readonly host: HTMLDivElement;
  private readonly worldContainer: PIXI.Container;
  private background: ParallaxBackground;
  private readonly player: Player;
  private readonly attackRange: number;
  private readonly rangedAttack: CharacterClass['rangedAttack'];
  private readonly skills: SkillDef[];
  private readonly monsters: Monster[] = [];
  private readonly monstersContainer: PIXI.Container;
  private readonly dustEmitter: DustEmitter;
  private readonly damageNumbers: DamageNumberEmitter;
  private readonly projectiles: ProjectileEmitter;
  private readonly skillEffects: SkillEffectEmitter;
  private readonly callbacks: GameSceneCallbacks;

  private stats: PlayerStats;
  private skillLevels: Record<SkillKey, number> = { Q: 0, W: 0, E: 0, R: 0 };
  private readonly cooldowns: Record<SkillKey, number> = { Q: 0, W: 0, E: 0, R: 0 };
  private readonly buffs = new Map<BuffKind, { value: number; secLeft: number }>();
  private globalCooldown = 0;
  private speedMultiplier = 1;
  private level = 1;
  private currentLocation: LocationDef;
  private spawnTimer = 0;
  private nextSpawnDelay = 0;
  private regenTimer = 0;
  private pendingRegen = 0;
  private destroyed = false;

  constructor(
    host: HTMLDivElement,
    character: CharacterClass,
    initialStats: PlayerStats,
    callbacks: GameSceneCallbacks
  ) {
    this.host = host;
    this.callbacks = callbacks;
    this.stats = initialStats;
    this.attackRange = character.attackRange;
    this.rangedAttack = character.rangedAttack;
    this.skills = SKILL_DEF[character.sourceClass] ?? [];

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

    this.skillEffects = new SkillEffectEmitter();
    this.worldContainer.addChild(this.skillEffects.container);

    this.player = new Player(width * PLAYER_X_RATIO, height * GROUND_Y_RATIO, character);
    this.worldContainer.addChild(this.player.container);

    this.monstersContainer = new PIXI.Container();
    this.worldContainer.addChild(this.monstersContainer);

    this.damageNumbers = new DamageNumberEmitter();
    this.worldContainer.addChild(this.damageNumbers.container);

    this.projectiles = new ProjectileEmitter();
    this.worldContainer.addChild(this.projectiles.container);

    this.applyAttackSpeed();
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

  setStats(stats: PlayerStats): void {
    this.stats = stats;
    this.applyAttackSpeed();
  }

  setSkillLevels(levels: Record<SkillKey, number>): void {
    this.skillLevels = { ...levels };
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

  getSkillStatus(): SkillStatus[] {
    return this.skills.map((s) => ({
      key: s.key,
      name: s.name,
      img: s.img,
      level: this.skillLevels[s.key],
      cd: s.cd,
      cdLeft: Math.max(0, this.cooldowns[s.key]),
    }));
  }

  getBuffStatus(): BuffStatus[] {
    return [...this.buffs.entries()].map(([buff, b]) => ({ buff, secLeft: b.secLeft }));
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
    this.skillEffects.destroy();
    this.damageNumbers.destroy();
    this.dustEmitter.destroy();
    this.player.destroy();
    clearMonsterTextureCache();
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  // ── Effective (buffed) stats ────────────────────────────────────────────────

  private buffValue(kind: BuffKind): number {
    return this.buffs.get(kind)?.value ?? 0;
  }

  private get effAtk(): number {
    return Math.floor(this.stats.atk * (1 + this.buffValue('atkPct')));
  }

  private get effDef(): number {
    return Math.floor(this.stats.def * (1 + this.buffValue('defPct')));
  }

  private get effCritChance(): number {
    return Math.min(1, this.stats.critChance + this.buffValue('critChance'));
  }

  private applyAttackSpeed(): void {
    const mult = this.buffs.get('atkSpeedMult')?.value ?? 1;
    this.player.setAttackSpeed(this.stats.atkSpeed * mult);
  }

  // ── Spawning ────────────────────────────────────────────────────────────────

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
    const location = this.currentLocation;

    const m = rollMonster(location);
    const monster = new Monster(width + 60, height * GROUND_Y_RATIO, {
      def: m.def,
      name: m.name,
      nameColor: m.nameColor,
      level: m.level,
      maxHealth: m.stats.hp,
      atk: m.stats.atk,
      armor: m.stats.def,
    });
    this.monsters.push(monster);
    this.monstersContainer.addChild(monster.container);
  }

  // ── Combat ──────────────────────────────────────────────────────────────────

  /** Deals one hit to `monster`; returns true if it died. */
  private hitMonster(monster: Monster, mult: number, color = 0xffe066): boolean {
    const { dmg, isCrit } = rollDamage(this.effAtk, monster.armor, mult, this.effCritChance, this.stats.critPower);
    const top = monster.topPosition;
    this.damageNumbers.spawn(top.x, top.y, isCrit ? `${dmg}!` : dmg, isCrit ? 0xff9f1c : color, isCrit ? 22 : 18);

    const lifesteal = this.buffValue('lifesteal');
    if (lifesteal > 0) this.pendingRegen += dmg * lifesteal;

    if (!monster.takeDamage(dmg)) return false;
    this.callbacks.onMonsterKilled(
      { eid: monster.def.eid, level: monster.level },
      this.currentLocation
    );
    return true;
  }

  private livingMonsters(): Monster[] {
    return this.monsters.filter((m) => !m.isDying);
  }

  /** Tries to auto-cast one learned, ready skill; returns true if one went off. */
  private tryCastSkill(engaged: Monster | null): boolean {
    if (this.globalCooldown > 0) return false;

    for (const skill of this.skills) {
      const lvl = this.skillLevels[skill.key];
      if (lvl <= 0 || this.cooldowns[skill.key] > 0) continue;
      if (!this.castSkill(skill, lvl, engaged)) continue;

      this.cooldowns[skill.key] = skill.cd;
      this.globalCooldown = SKILL_GLOBAL_COOLDOWN;
      const head = this.player.headPosition;
      this.damageNumbers.spawn(head.x, head.y - 40, skill.name, 0xc9a3ff, 14);
      return true;
    }
    return false;
  }

  private castSkill(skill: SkillDef, lvl: number, engaged: Monster | null): boolean {
    const effect = skill.effect;
    const scale = skillScaleMult(lvl);
    const feet = this.player.feetPosition;

    switch (effect.kind) {
      case 'hit': {
        if (!engaged) return false;
        const top = engaged.topPosition;
        if (effect.projectile && this.rangedAttack) {
          const origin = this.player.headPosition;
          this.projectiles.spawn(this.rangedAttack, origin.x, origin.y, top.x, top.y);
        } else {
          this.skillEffects.ring(engaged.x, feet.y, 50, 0xc9a3ff);
        }
        for (let i = 0; i < (effect.hits ?? 1); i++) {
          if (this.hitMonster(engaged, effect.mult * scale, 0xc9a3ff)) break;
        }
        if (effect.stunSec && !engaged.isDying) engaged.stunTimer = effect.stunSec;
        return true;
      }
      case 'multi': {
        if (!engaged) return false;
        const targets = this.livingMonsters()
          .sort((a, b) => a.x - b.x)
          .slice(0, effect.targets);
        const origin = this.player.headPosition;
        for (const m of targets) {
          const top = m.topPosition;
          if (this.rangedAttack) this.projectiles.spawn(this.rangedAttack, origin.x, origin.y, top.x, top.y);
          this.hitMonster(m, effect.mult * scale, 0xc9a3ff);
        }
        return true;
      }
      case 'aoe': {
        if (!engaged) return false;
        this.skillEffects.ring(feet.x, feet.y, effect.radius * 1.4, 0xc9a3ff);
        for (const m of this.livingMonsters()) {
          if (Math.abs(m.x - feet.x) > effect.radius) continue;
          const died = this.hitMonster(m, effect.mult * scale, 0xc9a3ff);
          if (!died && effect.stunSec) m.stunTimer = effect.stunSec;
        }
        return true;
      }
      case 'buff': {
        // Run speed only helps while running; every other buff only in a fight.
        const wantFight = effect.buff !== 'runSpeedMult';
        if (wantFight !== Boolean(engaged)) return false;
        const sec = effect.sec + lvl;
        this.buffs.set(effect.buff, { value: effect.value, secLeft: sec });
        if (effect.buff === 'atkSpeedMult') this.applyAttackSpeed();
        return true;
      }
      case 'leap': {
        if (!engaged) return false;
        const maxX = this.app.screen.width + 40;
        for (const m of this.livingMonsters()) {
          if (m.x - feet.x <= this.attackRange + 20) m.pushBack(effect.px, maxX);
        }
        this.skillEffects.ring(feet.x, feet.y, 60, 0x9fd8ff);
        return true;
      }
    }
  }

  private updateBuffs(deltaSeconds: number): void {
    for (const [kind, b] of this.buffs) {
      b.secLeft -= deltaSeconds;
      if (b.secLeft <= 0) {
        this.buffs.delete(kind);
        if (kind === 'atkSpeedMult') this.applyAttackSpeed();
      }
    }
  }

  private readonly tick = (): void => {
    if (this.destroyed) return;

    const deltaMS = this.app.ticker.deltaMS;
    const deltaSeconds = deltaMS / 1000;

    for (const key of Object.keys(this.cooldowns) as SkillKey[]) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - deltaSeconds);
    }
    this.globalCooldown = Math.max(0, this.globalCooldown - deltaSeconds);
    this.updateBuffs(deltaSeconds);

    // Find the nearest monster within attack range; only it is the hero's
    // target, but every monster currently in range still gets to swing back.
    const playerX = this.player.feetPosition.x;
    let engaged: Monster | null = null;
    let engagedDistance = Infinity;
    for (const monster of this.monsters) {
      if (monster.isDying) continue;
      const distance = monster.x - playerX;
      const inRange = distance <= this.attackRange;
      monster.setInRange(inRange);
      if (inRange && distance < engagedDistance) {
        engagedDistance = distance;
        engaged = monster;
      }
    }

    const combatActive = engaged !== null;
    const runMult = this.buffs.get('runSpeedMult')?.value ?? 1;
    const speed = combatActive ? 0 : BASE_MOVE_SPEED * this.speedMultiplier * runMult;

    this.background.update(deltaSeconds, speed);
    this.player.setCombat(combatActive);
    this.player.update(deltaSeconds, this.speedMultiplier * runMult);
    this.dustEmitter.update(deltaSeconds, speed);
    this.damageNumbers.update(deltaSeconds);
    this.projectiles.update(deltaSeconds);
    this.skillEffects.update(deltaSeconds);

    if (!combatActive && this.player.consumeFootstep()) {
      const feet = this.player.feetPosition;
      const count = DUST_PER_STEP_MIN + Math.floor(Math.random() * (DUST_PER_STEP_MAX - DUST_PER_STEP_MIN + 1));
      this.dustEmitter.spawnBurst(feet.x, feet.y, count);
    }

    // hpRegen always ticks; resting between fights adds a flat share of max HP.
    this.pendingRegen += this.stats.hpRegen * deltaSeconds;
    if (!combatActive) this.pendingRegen += this.stats.maxHp * REST_REGEN_PCT * deltaSeconds;
    this.regenTimer += deltaSeconds;
    if (this.regenTimer >= REGEN_TICK_INTERVAL) {
      this.regenTimer = 0;
      if (this.pendingRegen >= 1) {
        const whole = Math.floor(this.pendingRegen);
        this.pendingRegen -= whole;
        this.callbacks.onPlayerHeal(whole);
      }
    }

    // The pause only counts while the path is clear.
    if (this.livingMonsters().length >= MAX_ALIVE_MONSTERS) this.spawnTimer = 0;
    else this.spawnTimer += deltaMS;
    if (this.spawnTimer >= this.nextSpawnDelay) {
      this.spawnMonster();
      this.scheduleNextSpawn();
    }

    this.tryCastSkill(engaged);

    if (engaged && !engaged.isDying && this.player.consumeAttackTick()) {
      if (this.rangedAttack) {
        const origin = this.player.headPosition;
        const top = engaged.topPosition;
        this.projectiles.spawn(this.rangedAttack, origin.x, origin.y, top.x, top.y);
      }
      this.hitMonster(engaged, 1);
    }

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      monster.update(deltaSeconds, speed);

      if (monster.isGone || monster.x < MONSTER_DESPAWN_X) {
        monster.destroy();
        this.monsters.splice(i, 1);
        continue;
      }

      if (monster.consumeAttackTick()) {
        const dmg = Math.max(1, Math.round(monster.atk - this.effDef));
        this.callbacks.onPlayerDamaged(dmg);
        this.player.flashDamage();
        const head = this.player.headPosition;
        this.damageNumbers.spawn(head.x, head.y, dmg, 0xff5555);
      }
    }
  };

  private readonly handleResize = (): void => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.app.renderer.resize(width, height);
  };
}

