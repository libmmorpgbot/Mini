// Ported from libmmorpgbot-'s shared/definitions.js (the single source of truth
// for that game's server and client). Formulas are kept as-is; only the few
// knobs in MINI_RATES are specific to this idle runner, which spawns one
// monster every few seconds instead of whole rooms of them.

import type { IconName } from '../components/Icon';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type MonsterType = 'guard' | 'warrior' | 'boss';

/**
 * Mini-only multipliers on top of the original drop chances. The original is
 * an MMO tuned for players clearing rooms of 20+ monsters at a time; at one
 * monster per few seconds the raw chances would almost never pay out.
 */
export const MINI_RATES = {
  /** Gear drop chance multiplier (itemDropChanceAtLevel). */
  gear: 30,
  /** Skill book drop chance multiplier. */
  books: 3000,
  /** XP per kill = monster level × this (the original gives 1 × level). */
  xpPerMonsterLevel: 20,
};

// ── Monster level curve ──────────────────────────────────────────────────────
const MONSTER_HP1 = 12;
const MONSTER_ATK1 = 10;
const MONSTER_GROWTH = 1.07;
const MONSTER_GROWTH_FROM = 21;
const MONSTER_HP_ANCHOR = MONSTER_HP1 * MONSTER_GROWTH_FROM * 15;
const MONSTER_ATK_ANCHOR = MONSTER_ATK1 * MONSTER_GROWTH_FROM;

function monsterDEFAtLevel(lvl: number): number {
  return Math.max(0, Math.round(Math.max(1, lvl || 1)));
}
function monsterHPAtLevel(lvl: number): number {
  lvl = Math.max(1, lvl || 1);
  if (lvl < MONSTER_GROWTH_FROM) return MONSTER_HP1 * lvl;
  return Math.round(MONSTER_HP_ANCHOR * Math.pow(MONSTER_GROWTH, lvl - MONSTER_GROWTH_FROM));
}
function monsterATKAtLevel(lvl: number): number {
  lvl = Math.max(1, lvl || 1);
  if (lvl < MONSTER_GROWTH_FROM) return MONSTER_ATK1 * lvl;
  return Math.round(MONSTER_ATK_ANCHOR * Math.pow(MONSTER_GROWTH, lvl - MONSTER_GROWTH_FROM));
}

// "страж" (guard) trades damage for HP, "воин" (warrior) the reverse. Bosses
// are a flat HP/ATK multiplier over a regular monster of the same level.
const MONSTER_ARCHETYPE: Record<'guard' | 'warrior', { hp: number; atk: number }> = {
  guard: { hp: 1.15, atk: 0.85 },
  warrior: { hp: 0.9, atk: 1.15 },
};
const BOSS_HP_MULT = 10;
const BOSS_ATK_MULT = 1.5;

export function monsterStatsAtLevel(lvl: number, type: MonsterType): { hp: number; atk: number; def: number } {
  const hp = monsterHPAtLevel(lvl);
  const atk = monsterATKAtLevel(lvl);
  const def = monsterDEFAtLevel(lvl);
  if (type === 'boss') return { hp: Math.round(hp * BOSS_HP_MULT), atk: Math.round(atk * BOSS_ATK_MULT), def };
  const arch = MONSTER_ARCHETYPE[type];
  return { hp: Math.max(1, Math.round(hp * arch.hp)), atk: Math.max(1, Math.round(atk * arch.atk)), def };
}

// ── Per-level name/color rank ────────────────────────────────────────────────
const MONSTER_RANK_M = [
  'Слабый', 'Молодой', 'Обычный', 'Стойкий', 'Опытный', 'Закалённый', 'Хищный',
  'Свирепый', 'Яростный', 'Кровожадный', 'Безжалостный', 'Отчаянный', 'Могучий',
  'Грозный', 'Разъярённый', 'Устрашающий', 'Смертоносный', 'Демонический',
  'Проклятый', 'Кошмарный', 'Легендарный', 'Титанический', 'Апокалиптический',
  'Погибельный', 'Всесокрушающий', 'Первородный', 'Древний', 'Изначальный', 'Запредельный',
];
const MONSTER_RANK_F = [
  'Слабая', 'Молодая', 'Обычная', 'Стойкая', 'Опытная', 'Закалённая', 'Хищная',
  'Свирепая', 'Яростная', 'Кровожадная', 'Безжалостная', 'Отчаянная', 'Могучая',
  'Грозная', 'Разъярённая', 'Устрашающая', 'Смертоносная', 'Демоническая',
  'Проклятая', 'Кошмарная', 'Легендарная', 'Титаническая', 'Апокалиптическая',
  'Погибельная', 'Всесокрушающая', 'Первородная', 'Древняя', 'Изначальная', 'Запредельная',
];

/** "Крыса страж" at room 1 → "Слабая Крыса страж"; bosses keep their own name. */
export function monsterNameAtLevel(
  baseName: string,
  localLvl: number,
  isBoss: boolean,
  fem: boolean,
  maxLocalLvl: number
): string {
  if (isBoss) return baseName;
  const ranks = fem ? MONSTER_RANK_F : MONSTER_RANK_M;
  const denom = Math.max(1, (maxLocalLvl || ranks.length) - 1);
  const t = Math.min(1, Math.max(0, ((localLvl || 1) - 1) / denom));
  return ranks[Math.round(t * (ranks.length - 1))] + ' ' + baseName;
}

/** Interpolates a monster's color from its weakest (room 1) to strongest (last room) tint. */
export function monsterColorAtLevel(
  baseColor: number,
  endColor: number | undefined,
  localLvl: number,
  isBoss: boolean,
  maxLocalLvl: number
): number {
  if (isBoss || endColor === undefined) return baseColor;
  const denom = Math.max(1, (maxLocalLvl || MONSTER_RANK_M.length) - 1);
  const t = Math.min(1, Math.max(0, ((localLvl || 1) - 1) / denom));
  const ch = (c: number, s: number) => (c >> s) & 255;
  const lerp = (s: number) => Math.round(ch(baseColor, s) + (ch(endColor, s) - ch(baseColor, s)) * t);
  return (lerp(16) << 16) | (lerp(8) << 8) | lerp(0);
}

// ── Corridors ("arms") ───────────────────────────────────────────────────────
// Arms 1-3 have 20 rooms each, arm 4 has 18: global monster levels 1-78.
export const ARM_ROOM_COUNTS = [20, 20, 20, 18];
export const ARM_OFFSETS: number[] = [];
for (let i = 0, sum = 0; i < ARM_ROOM_COUNTS.length; i++) {
  ARM_OFFSETS.push(sum);
  sum += ARM_ROOM_COUNTS[i];
}
export const MAX_MONSTER_LEVEL = ARM_OFFSETS[ARM_OFFSETS.length - 1] + ARM_ROOM_COUNTS[ARM_ROOM_COUNTS.length - 1];

export function armIndexForLevel(lvl: number): number {
  lvl = Math.max(1, lvl || 1);
  for (let i = 0; i < ARM_ROOM_COUNTS.length; i++) {
    if (lvl <= ARM_OFFSETS[i] + ARM_ROOM_COUNTS[i]) return i + 1;
  }
  return ARM_ROOM_COUNTS.length;
}

/** Hero level required to enter each corridor (left, top, bottom, right). */
export const ARM_LEVEL_REQ = [0, 20, 40, 60];

export function armLocalLevel(globalLvl: number): number {
  const armIdx = armIndexForLevel(globalLvl);
  return Math.max(1, globalLvl || 1) - ARM_OFFSETS[armIdx - 1];
}

// ── Rewards ──────────────────────────────────────────────────────────────────
export function goldAtLevel(lvl: number): number {
  return Math.max(1, Math.round(lvl || 1));
}

// ── Drop growth ──────────────────────────────────────────────────────────────
// Drop chances climb with the room's local level and freeze from room 13 on.
const DROP_GROWTH_MAX_ROOM_LEVEL = 13;
function dropGrowthRoomLevel(localLvl: number): number {
  return Math.min(DROP_GROWTH_MAX_ROOM_LEVEL, Math.max(1, localLvl || 1));
}
function dropGrowthLevel(lvl: number): number {
  lvl = Math.max(1, lvl || 1);
  return Math.min(lvl, ARM_OFFSETS[armIndexForLevel(lvl) - 1] + DROP_GROWTH_MAX_ROOM_LEVEL);
}

const ROOM_DROP_GROWTH = 0.05;
export function roomDropMult(localLvl: number): number {
  return Math.pow(1 + ROOM_DROP_GROWTH, dropGrowthRoomLevel(localLvl) - 1);
}

/** Arms 1-2 drop everything at a third of the rate. */
export const EARLY_ZONE_DROP_MULT = 1 / 3;
export const EARLY_ZONE_ARMS = new Set([1, 2]);

// ── Gear rarity & drop chance ────────────────────────────────────────────────
const COMMON_ITEM_MAX_LEVEL = 10;
const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export function itemRarityForLevel(lvl: number): Rarity {
  lvl = Math.max(1, lvl || 1);
  if (lvl <= COMMON_ITEM_MAX_LEVEL) return 'common';
  if (lvl <= ARM_OFFSETS[1]) return 'uncommon';
  if (lvl <= ARM_OFFSETS[2]) return 'rare';
  if (lvl <= ARM_OFFSETS[3]) return 'epic';
  return 'legendary';
}

function itemTierMinLevel(rarity: Rarity): number {
  if (rarity === 'common') return 1;
  if (rarity === 'uncommon') return COMMON_ITEM_MAX_LEVEL + 1;
  if (rarity === 'rare') return ARM_OFFSETS[1] + 1;
  if (rarity === 'epic') return ARM_OFFSETS[2] + 1;
  return ARM_OFFSETS[3] + 1;
}

const ITEM_DROP_GROWTH_PCT = 0.1;
const ITEM_TIER_STEPDOWN = 5;
const ITEM_TIER_EXTRA_MULT: Partial<Record<Rarity, number>> = { uncommon: 0.1 };

function itemTierStartChancePct(rarity: Rarity): number {
  let pct = ITEM_DROP_GROWTH_PCT;
  for (let i = 0; i < RARITY_ORDER.indexOf(rarity); i++) pct /= ITEM_TIER_STEPDOWN;
  return pct;
}

function itemTierMaxLevel(rarity: Rarity): number {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx >= RARITY_ORDER.length - 1) return MAX_MONSTER_LEVEL;
  return itemTierMinLevel(RARITY_ORDER[idx + 1]) - 1;
}

/** Gear drop chance in percent, before zone/Mini multipliers. */
export function itemDropChanceAtLevel(lvl: number): number {
  lvl = Math.max(1, lvl || 1);
  const rarity = itemRarityForLevel(lvl);
  const tierMin = itemTierMinLevel(rarity);
  const tierMax = itemTierMaxLevel(rarity);
  const startPct = itemTierStartChancePct(rarity);
  const endPct = startPct + ITEM_DROP_GROWTH_PCT * (tierMax - tierMin);
  const span = Math.max(1, tierMax - tierMin);
  const frac = Math.min(1, Math.max(0, (dropGrowthLevel(lvl) - tierMin) / span));
  const pct = startPct * Math.pow(endPct / startPct, frac);
  return Math.min(100, pct * (ITEM_TIER_EXTRA_MULT[rarity] ?? 1));
}

// ── Skill books & levels ─────────────────────────────────────────────────────
export type SkillKey = 'Q' | 'W' | 'E' | 'R';
export const SKILL_KEYS: SkillKey[] = ['Q', 'W', 'E', 'R'];
export const SKILL_MAX_LEVEL = 10;
/** Books needed to learn a locked skill (level 0 → 1). */
export const SKILL_STUDY_COST = 1;
/** Books spent per upgrade attempt once learned. */
export const SKILL_UPGRADE_COST = 2;
/** Chance an upgrade attempt succeeds. */
export const SKILL_UPGRADE_CHANCE = 0.3;

/** Which skill slot's books a monster of this level drops: Q, W, E, R, Q, ... */
export function levelSkillBookKey(lvl: number): SkillKey {
  return SKILL_KEYS[Math.max(0, (Math.floor(lvl) || 1) - 1) % SKILL_KEYS.length];
}

/** +1% skill damage/healing per skill level. */
export function skillScaleMult(skillLvl: number): number {
  const L = Math.max(0, Math.min(SKILL_MAX_LEVEL, Math.floor(skillLvl) || 0));
  return 1 + L * 0.01;
}

// ── Player stats ─────────────────────────────────────────────────────────────
/** Skill points ("Улучшения") a level is worth: a flat 3 per level. */
export function skillPointBudget(lvl: number): number {
  return Math.max(1, Math.floor(lvl) || 1) * 3;
}

export type UpgradeKey = 'atk' | 'def' | 'hp' | 'atkSpeed' | 'critChance' | 'critPower' | 'hpRegen';

export const UPGRADE_DEF: Record<UpgradeKey, { label: string; icon: IconName; desc: string }> = {
  atk: { label: 'Атака', icon: 'sword', desc: '+1 ATK' },
  def: { label: 'Защита', icon: 'shield', desc: '+1 DEF' },
  hp: { label: 'Здоровье', icon: 'heart', desc: '+10 MaxHP' },
  atkSpeed: { label: 'Скор. атаки', icon: 'bolt', desc: '+0.05 уд/с' },
  critChance: { label: 'Шанс крита', icon: 'star', desc: '+1%' },
  critPower: { label: 'Сила крита', icon: 'flame', desc: '+3%' },
  hpRegen: { label: 'Реген HP', icon: 'leaf', desc: '+0.1/сек' },
};

export const UPGRADE_KEYS = Object.keys(UPGRADE_DEF) as UpgradeKey[];

/** Damage of one hit: (ATK − DEF ± 3) × skill multiplier, at least 1, then crit. */
export function rollDamage(
  atk: number,
  targetDef: number,
  mult: number,
  critChance: number,
  critPower: number
): { dmg: number; isCrit: boolean } {
  const spread = Math.floor(Math.random() * 7) - 3;
  const base = Math.max(1, Math.floor((atk - targetDef + spread) * mult));
  const isCrit = Math.random() < critChance;
  return { dmg: isCrit ? Math.round(base * critPower) : base, isCrit };
}
