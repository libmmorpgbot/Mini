// Player stat formulas ported from libmmorpgbot-'s recompute() (js/player.js)
// and its server twin (server/db/repos/stats.js): class base + level scaling,
// then skill-point upgrades, then equipped gear.
import { GEAR_BY_ID } from '../data/items';
import { MINI_RATES, skillPointBudget, type UpgradeKey } from '../data/gameRules';
import type { CharacterClass, GameState } from '../types';

export interface PlayerStats {
  atk: number;
  def: number;
  maxHp: number;
  /** 0..0.8 */
  critChance: number;
  /** Crit damage multiplier, 1.5 = +50%. */
  critPower: number;
  /** Attacks per second. */
  atkSpeed: number;
  /** HP per second, always on. */
  hpRegen: number;
}

export function computeStats(
  character: CharacterClass,
  state: Pick<GameState, 'level' | 'upgrades' | 'equipment'>
): PlayerStats {
  const lvl = state.level;
  const u = state.upgrades;

  let atk = character.baseAtk + lvl + u.atk;
  let def = character.baseDef + lvl + u.def;
  let hp = character.baseHP + lvl * 20 + u.hp * 10;
  let extraCrit = 0;
  let extraAS = 0;
  let hpPct = 0;

  for (const inst of Object.values(state.equipment)) {
    const it = inst && GEAR_BY_ID[inst.id];
    if (!it) continue;
    atk += it.atk ?? 0;
    def += it.def ?? 0;
    hp += it.hp ?? 0;
    extraCrit += it.critChance ?? 0;
    extraAS += it.atkSpeed ?? 0;
    hpPct += it.hpPct ?? 0;
  }

  return {
    atk,
    def,
    maxHp: Math.floor(hp * (1 + hpPct)),
    critChance: Math.min(0.8, 0.05 + lvl * 0.004 + u.critChance * 0.01 + extraCrit),
    critPower: 1.5 + lvl * 0.015 + u.critPower * 0.03,
    atkSpeed: character.atkSpeed * (1 + lvl * 0.015) + u.atkSpeed * 0.05 + extraAS,
    hpRegen: lvl * 0.02 + u.hpRegen * 0.1,
  };
}

export function spentSkillPoints(upgrades: Record<UpgradeKey, number>): number {
  return Object.values(upgrades).reduce((sum, v) => sum + Math.max(0, v || 0), 0);
}

export function availableSkillPoints(state: Pick<GameState, 'level' | 'upgrades'>): number {
  return Math.max(0, skillPointBudget(state.level) - spentSkillPoints(state.upgrades));
}

/** Rough "battle power" shown in the header. */
export function battlePower(stats: PlayerStats): number {
  return Math.round(stats.maxHp * 0.5 + stats.atk * 8 + stats.def * 4 + stats.critChance * 500 + stats.atkSpeed * 100);
}

/** Mini's own level curve (the original's is tuned for an MMO grind). */
export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(Math.max(1, level), 1.5));
}

export function xpForKill(monsterLevel: number, xpMult = 1): number {
  return Math.max(1, Math.round(monsterLevel)) * MINI_RATES.xpPerMonsterLevel * xpMult;
}
