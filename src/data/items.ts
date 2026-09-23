// Item catalog ported from libmmorpgbot-'s ITEM_DEF (shared/definitions.js):
// the droppable gear (weapon, helmet, body, gloves, boots, ring, belt) for the
// classes this game has, plus the merchant's health potions. Skill books are
// generated per class in skills.ts.
import type { Rarity } from './gameRules';

const ICONS = import.meta.glob('../assets/items/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const icon = (file: string) => ICONS[`../assets/items/${file}.png`];

export type GearSlot = 'weapon' | 'helmet' | 'body' | 'gloves' | 'boots' | 'ring' | 'belt';

export interface GearStats {
  atk?: number;
  def?: number;
  hp?: number;
  /** Added to crit chance (0.03 = +3%). */
  critChance?: number;
  /** Added to attacks per second. */
  atkSpeed?: number;
  /** Max HP percent bonus (0.05 = +5%). */
  hpPct?: number;
}

export interface GearDef extends GearStats {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  img: string;
  /** Source-game class ids allowed to equip it; everyone when omitted. */
  forClass?: string[];
}

export interface PotionDef {
  id: string;
  name: string;
  hp: number;
  rarity: Rarity;
  img: string;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9c9086',
  uncommon: '#6f9c4a',
  rare: '#4a7bab',
  epic: '#8a5cc2',
  legendary: '#e8b93e',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
};

export const EQ_SLOTS: { slot: GearSlot; label: string; emptyIcon: string }[] = [
  { slot: 'weapon', label: 'Оружие', emptyIcon: '🗡️' },
  { slot: 'helmet', label: 'Шлем', emptyIcon: '⛑️' },
  { slot: 'body', label: 'Тело', emptyIcon: '🥋' },
  { slot: 'gloves', label: 'Перчи', emptyIcon: '🧤' },
  { slot: 'boots', label: 'Боты', emptyIcon: '🥾' },
  { slot: 'ring', label: 'Кольцо', emptyIcon: '💍' },
  { slot: 'belt', label: 'Пояс', emptyIcon: '🎗️' },
];

export const GEAR_DEF: GearDef[] = [
  // Death Knight swords
  { id: 'sw1', name: 'Ржавый меч', slot: 'weapon', forClass: ['deathknight'], img: icon('wep_ck'), atk: 4, rarity: 'common' },
  { id: 'sw2', name: 'Стальной меч', slot: 'weapon', forClass: ['deathknight'], img: icon('wep_uk'), atk: 14, critChance: 0.03, rarity: 'uncommon' },
  { id: 'sw3', name: 'Меч дракона', slot: 'weapon', forClass: ['deathknight'], img: icon('wep_rk'), atk: 23, critChance: 0.05, rarity: 'rare' },
  { id: 'sw4', name: 'Меч теней', slot: 'weapon', forClass: ['deathknight'], img: icon('wep_ek'), atk: 44, critChance: 0.1, rarity: 'epic' },
  { id: 'sw5', name: 'Меч героя', slot: 'weapon', forClass: ['deathknight'], img: icon('wep_lk'), atk: 65, critChance: 0.25, rarity: 'legendary' },
  // Tank axes
  { id: 'tw1', name: 'Ржавый топор', slot: 'weapon', forClass: ['lev'], img: icon('wep_ct'), atk: 5, rarity: 'common' },
  { id: 'tw2', name: 'Стальной топор', slot: 'weapon', forClass: ['lev'], img: icon('wep_ut'), atk: 15, def: 6, rarity: 'uncommon' },
  { id: 'tw3', name: 'Топор дракона', slot: 'weapon', forClass: ['lev'], img: icon('wep_rt'), atk: 23, def: 10, rarity: 'rare' },
  { id: 'tw4', name: 'Топор теней', slot: 'weapon', forClass: ['lev'], img: icon('wep_et'), atk: 44, def: 16, rarity: 'epic' },
  { id: 'tw5', name: 'Топор героя', slot: 'weapon', forClass: ['lev'], img: icon('wep_lt'), atk: 65, def: 24, rarity: 'legendary' },
  // Ranger bows
  { id: 'bw1', name: 'Деревянный лук', slot: 'weapon', forClass: ['ranger'], img: icon('wep_cb'), atk: 8, rarity: 'common' },
  { id: 'bw2', name: 'Серебряный лук', slot: 'weapon', forClass: ['ranger'], img: icon('wep_ub'), atk: 18, atkSpeed: 0.03, rarity: 'uncommon' },
  { id: 'bw3', name: 'Лук охотника', slot: 'weapon', forClass: ['ranger'], img: icon('wep_rb'), atk: 28, atkSpeed: 0.05, rarity: 'rare' },
  { id: 'bw4', name: 'Лунный лук', slot: 'weapon', forClass: ['ranger'], img: icon('wep_eb'), atk: 60, atkSpeed: 0.1, rarity: 'epic' },
  { id: 'bw5', name: 'Лук героя', slot: 'weapon', forClass: ['ranger'], img: icon('wep_lb'), atk: 100, atkSpeed: 0.15, critChance: 0.1, rarity: 'legendary' },
  // Mage staves
  { id: 'st1', name: 'Посох новичка', slot: 'weapon', forClass: ['mage'], img: icon('wep_cs'), atk: 7, rarity: 'common' },
  { id: 'st2', name: 'Посох бойца', slot: 'weapon', forClass: ['mage'], img: icon('wep_us'), atk: 17, hpPct: 0.03, rarity: 'uncommon' },
  { id: 'st3', name: 'Посох охотника', slot: 'weapon', forClass: ['mage'], img: icon('wep_rs'), atk: 30, hpPct: 0.05, rarity: 'rare' },
  { id: 'st4', name: 'Посох Героя', slot: 'weapon', forClass: ['mage'], img: icon('wep_es'), atk: 60, hpPct: 0.1, rarity: 'epic' },
  { id: 'st5', name: 'Посох Легенды', slot: 'weapon', forClass: ['mage'], img: icon('wep_ls'), atk: 120, hpPct: 0.2, critChance: 0.1, rarity: 'legendary' },
  // Assassin daggers
  { id: 'as1', name: 'Ржавый кинжал', slot: 'weapon', forClass: ['assassin'], img: icon('wep_cd'), atk: 7, critChance: 0.02, rarity: 'common' },
  { id: 'as2', name: 'Стальной кинжал', slot: 'weapon', forClass: ['assassin'], img: icon('wep_ud'), atk: 17, critChance: 0.06, rarity: 'uncommon' },
  { id: 'as3', name: 'Кинжал дракона', slot: 'weapon', forClass: ['assassin'], img: icon('wep_rd'), atk: 27, critChance: 0.1, rarity: 'rare' },
  { id: 'as4', name: 'Кинжал теней', slot: 'weapon', forClass: ['assassin'], img: icon('wep_ed'), atk: 50, critChance: 0.16, rarity: 'epic' },
  { id: 'as5', name: 'Кинжал героя', slot: 'weapon', forClass: ['assassin'], img: icon('wep_ld'), atk: 74, critChance: 0.32, rarity: 'legendary' },
  // Armor & accessories (any class)
  { id: 'hm1', name: 'Кожаный шлем', slot: 'helmet', img: icon('arm_ch'), hp: 25, rarity: 'common' },
  { id: 'hm2', name: 'Железный шлем', slot: 'helmet', img: icon('arm_uh'), hp: 50, rarity: 'uncommon' },
  { id: 'hm3', name: 'Платиновый шлем', slot: 'helmet', img: icon('arm_rh'), hp: 90, atk: 4, rarity: 'rare' },
  { id: 'hm4', name: 'Корона героя', slot: 'helmet', img: icon('arm_eh'), hp: 140, atk: 8, rarity: 'epic' },
  { id: 'hm5', name: 'Шлем легенды', slot: 'helmet', img: icon('arm_lh'), hp: 210, atk: 12, rarity: 'legendary' },
  { id: 'ar1', name: 'Кожаная броня', slot: 'body', img: icon('arm_ct'), def: 5, rarity: 'common' },
  { id: 'ar2', name: 'Железная броня', slot: 'body', img: icon('arm_ut'), def: 11, rarity: 'uncommon' },
  { id: 'ar3', name: 'Платиновая броня', slot: 'body', img: icon('arm_rt'), def: 20, rarity: 'rare' },
  { id: 'ar4', name: 'Доспех героя', slot: 'body', img: icon('arm_et'), def: 33, rarity: 'epic' },
  { id: 'ar5', name: 'Доспех легенды', slot: 'body', img: icon('arm_lt'), def: 48, hp: 50, rarity: 'legendary' },
  { id: 'gl1', name: 'Кожаные перчи', slot: 'gloves', img: icon('arm_cg'), atk: 2, rarity: 'common' },
  { id: 'gl2', name: 'Железные перчи', slot: 'gloves', img: icon('arm_ug'), atk: 5, rarity: 'uncommon' },
  { id: 'gl3', name: 'Платиновые перчи', slot: 'gloves', img: icon('arm_rg'), atk: 10, rarity: 'rare' },
  { id: 'gl4', name: 'Перчатки героя', slot: 'gloves', img: icon('arm_eg'), atk: 16, def: 4, rarity: 'epic' },
  { id: 'gl5', name: 'Перчатки легенды', slot: 'gloves', img: icon('arm_lg'), atk: 24, def: 8, rarity: 'legendary' },
  { id: 'bt1', name: 'Кожаные боты', slot: 'boots', img: icon('arm_cb'), def: 2, rarity: 'common' },
  { id: 'bt2', name: 'Железные боты', slot: 'boots', img: icon('arm_ub'), def: 4, rarity: 'uncommon' },
  { id: 'bt3', name: 'Платиновые боты', slot: 'boots', img: icon('arm_rb'), def: 8, atk: 3, rarity: 'rare' },
  { id: 'bt4', name: 'Боты героя', slot: 'boots', img: icon('arm_eb'), def: 14, atk: 5, rarity: 'epic' },
  { id: 'bt5', name: 'Боты легенды', slot: 'boots', img: icon('arm_lb'), def: 20, atk: 10, rarity: 'legendary' },
  { id: 'rn1', name: 'Кольцо силы', slot: 'ring', img: icon('acs_cr'), atk: 4, rarity: 'common' },
  { id: 'rn2', name: 'Кольцо защиты', slot: 'ring', img: icon('acs_ur'), def: 4, rarity: 'uncommon' },
  { id: 'rn3', name: 'Кольцо крови', slot: 'ring', img: icon('acs_rr'), atk: 3, hp: 40, rarity: 'rare' },
  { id: 'rn4', name: 'Кольцо героя', slot: 'ring', img: icon('acs_er'), atk: 8, def: 4, rarity: 'epic' },
  { id: 'rn5', name: 'Кольцо легенды', slot: 'ring', img: icon('acs_lr'), atk: 14, def: 8, hp: 50, rarity: 'legendary' },
  { id: 'nd1', name: 'Пояс силы', slot: 'belt', img: icon('acs_cp'), atk: 5, rarity: 'common' },
  { id: 'nd2', name: 'Пояс здоровья', slot: 'belt', img: icon('acs_up'), hp: 60, rarity: 'uncommon' },
  { id: 'nd3', name: 'Пояс тьмы', slot: 'belt', img: icon('acs_rp'), atk: 8, hp: 30, rarity: 'rare' },
  { id: 'nd4', name: 'Пояс героя', slot: 'belt', img: icon('acs_ep'), atk: 16, hp: 80, rarity: 'epic' },
  { id: 'nd5', name: 'Пояс легенды', slot: 'belt', img: icon('acs_lp'), atk: 24, hp: 120, rarity: 'legendary' },
];

export const GEAR_BY_ID: Record<string, GearDef> = Object.fromEntries(GEAR_DEF.map((g) => [g.id, g]));

export const POTION_DEF: PotionDef[] = [
  { id: 'pt1', name: 'Малое зелье', hp: 20, rarity: 'common', img: icon('smallhp') },
  { id: 'pt2', name: 'Большое зелье', hp: 500, rarity: 'uncommon', img: icon('bighp') },
];

export const POTION_BY_ID: Record<string, PotionDef> = Object.fromEntries(POTION_DEF.map((p) => [p.id, p]));

/** The merchant's stock and prices, in gold (MERCHANT_SHOP). */
export const MERCHANT_SHOP: { itemId: string; price: number }[] = [
  { itemId: 'pt1', price: 5 },
  { itemId: 'pt2', price: 500 },
];

/** Gold the merchant pays for a piece of gear. */
export const SELL_PRICE: Record<Rarity, number> = {
  common: 5,
  uncommon: 25,
  rare: 100,
  epic: 400,
  legendary: 1500,
};

/** Bag capacity (gear only; potions and books stack in their own pouches). */
export const INVENTORY_SIZE = 40;

export function canEquip(gear: GearDef, sourceClass: string): boolean {
  return !gear.forClass || gear.forClass.includes(sourceClass);
}

export const STAT_LABELS: { key: keyof GearStats; label: string; format: (v: number) => string }[] = [
  { key: 'atk', label: 'Атака', format: (v) => `+${v}` },
  { key: 'def', label: 'Защита', format: (v) => `+${v}` },
  { key: 'hp', label: 'Здоровье', format: (v) => `+${v}` },
  { key: 'hpPct', label: 'Здоровье', format: (v) => `+${Math.round(v * 100)}%` },
  { key: 'critChance', label: 'Шанс крита', format: (v) => `+${Math.round(v * 100)}%` },
  { key: 'atkSpeed', label: 'Скор. атаки', format: (v) => `+${v}` },
];
