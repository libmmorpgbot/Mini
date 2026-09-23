// Monster catalog ported from libmmorpgbot-'s ENEMY_DEF / FLOOR_ENEMIES
// (shared/definitions.js) together with its sprite sheets (images/Monster2,
// js/sprites.js). Each species has 3 art tiers: guard uses tier 1, warrior
// tier 2 and the corridor's boss the toughest species' tier 3.
import type { MonsterType } from './gameRules';

const SHEETS = import.meta.glob('../assets/monsters/*/*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;

export interface MonsterSheet {
  src: string;
  cols: number;
  fps: number;
}

export interface MonsterSprite {
  /** Frames are square: frameSize × frameSize px. */
  frameSize: number;
  /** Y (in frame px) of the shadow's bottom edge -- the ground line. */
  feetY: number;
  walk: MonsterSheet;
  attack: MonsterSheet;
  death: MonsterSheet;
}

export interface MonsterDef {
  eid: string;
  name: string;
  type: MonsterType;
  color: number;
  /** Tint the name ramps to at the corridor's last room. */
  endColor?: number;
  /** Grammatical gender of the name, for rank-prefix agreement. */
  fem?: boolean;
  /** Own walking speed, px/s. */
  spd: number;
  sprite: MonsterSprite;
}

/**
 * Sheets have 4 directional rows (down, up, left, right); monsters here always
 * walk toward the hero on the left, so only row 2 is used.
 */
function sheet(folder: string, frameSize: number, feetY: number, cols: [number, number, number]): MonsterSprite {
  const src = (anim: string) => SHEETS[`../assets/monsters/${folder}/${anim}.png`];
  return {
    frameSize,
    feetY,
    walk: { src: src('walk'), cols: cols[0], fps: 12 },
    attack: { src: src('attack'), cols: cols[1], fps: 14 },
    death: { src: src('death'), cols: cols[2], fps: 8 },
  };
}

export const ENEMY_DEF: MonsterDef[] = [
  { eid: 'rat_guard', name: 'Крыса страж', type: 'guard', color: 0x8a7a6a, endColor: 0x3a2a1a, fem: true, spd: 112,
    sprite: sheet('Rat1', 128, 75, [6, 8, 5]) },
  { eid: 'rat_warrior', name: 'Крыса воин', type: 'warrior', color: 0x8a7a6a, endColor: 0x3a2a1a, fem: true, spd: 118,
    sprite: sheet('Rat2', 128, 75, [6, 8, 5]) },
  { eid: 'slime_guard', name: 'Слизень страж', type: 'guard', color: 0x7ac47a, endColor: 0x1a3a10, spd: 52,
    sprite: sheet('Slime1', 64, 42, [8, 10, 8]) },
  { eid: 'slime_warrior', name: 'Слизень воин', type: 'warrior', color: 0x7ac47a, endColor: 0x1a3a10, spd: 56,
    sprite: sheet('Slime2', 64, 42, [8, 10, 10]) },
  { eid: 'imp_guard', name: 'Бес страж', type: 'guard', color: 0xc47a5a, endColor: 0x4a1408, spd: 92,
    sprite: sheet('Imp1', 64, 46, [8, 6, 10]) },
  { eid: 'imp_warrior', name: 'Бес воин', type: 'warrior', color: 0xc47a5a, endColor: 0x4a1408, spd: 97,
    sprite: sheet('Imp2', 64, 46, [8, 6, 10]) },
  { eid: 'imp_boss', name: 'Босс бесов', type: 'boss', color: 0xff6a3a, spd: 88,
    sprite: sheet('Imp3', 64, 46, [8, 6, 10]) },
  { eid: 'zombie_guard', name: 'Зомби страж', type: 'guard', color: 0x8aab7a, endColor: 0x1a2a10, spd: 56,
    sprite: sheet('Zombie1', 64, 45, [8, 10, 9]) },
  { eid: 'zombie_warrior', name: 'Зомби воин', type: 'warrior', color: 0x8aab7a, endColor: 0x1a2a10, spd: 60,
    sprite: sheet('Zombie2', 64, 45, [8, 10, 9]) },
  { eid: 'lizardman_guard', name: 'Ящер страж', type: 'guard', color: 0x6ab26a, endColor: 0x0a2a0a, spd: 76,
    sprite: sheet('Lizardman1', 64, 46, [8, 7, 7]) },
  { eid: 'lizardman_warrior', name: 'Ящер воин', type: 'warrior', color: 0x6ab26a, endColor: 0x0a2a0a, spd: 80,
    sprite: sheet('Lizardman2', 64, 46, [8, 7, 7]) },
  { eid: 'orc_guard', name: 'Орк страж', type: 'guard', color: 0x7a9a5a, endColor: 0x1a2a08, spd: 71,
    sprite: sheet('Orc1', 64, 46, [8, 8, 8]) },
  { eid: 'orc_warrior', name: 'Орк воин', type: 'warrior', color: 0x7a9a5a, endColor: 0x1a2a08, spd: 75,
    sprite: sheet('Orc2', 64, 46, [8, 8, 8]) },
  { eid: 'orc_boss', name: 'Босс орков', type: 'boss', color: 0xffb020, spd: 68,
    sprite: sheet('Orc3', 64, 46, [8, 8, 8]) },
  { eid: 'plant_guard', name: 'Лоза страж', type: 'guard', color: 0x8aab6a, endColor: 0x2a1a3a, fem: true, spd: 46,
    sprite: sheet('Plant1', 64, 51, [8, 7, 10]) },
  { eid: 'plant_warrior', name: 'Лоза воин', type: 'warrior', color: 0x8aab6a, endColor: 0x2a1a3a, fem: true, spd: 50,
    sprite: sheet('Plant2', 64, 51, [8, 7, 10]) },
  { eid: 'vampire_guard', name: 'Вампир страж', type: 'guard', color: 0x9a8aab, endColor: 0x1a0a2a, spd: 101,
    sprite: sheet('Vampires1', 64, 47, [8, 12, 11]) },
  { eid: 'vampire_warrior', name: 'Вампир воин', type: 'warrior', color: 0x9a8aab, endColor: 0x1a0a2a, spd: 105,
    sprite: sheet('Vampires2', 64, 47, [8, 12, 11]) },
  { eid: 'beholder_guard', name: 'Бехолдер страж', type: 'guard', color: 0xa878c0, endColor: 0x2a0a3a, spd: 66,
    sprite: sheet('Beholder1', 64, 61, [8, 12, 9]) },
  { eid: 'beholder_warrior', name: 'Бехолдер воин', type: 'warrior', color: 0xa878c0, endColor: 0x2a0a3a, spd: 70,
    sprite: sheet('Beholder2', 64, 61, [8, 12, 9]) },
  { eid: 'beholder_boss', name: 'Босс бехолдеров', type: 'boss', color: 0xc060ff, spd: 60,
    sprite: sheet('Beholder3', 64, 61, [8, 12, 9]) },
  { eid: 'ent_guard', name: 'Древень страж', type: 'guard', color: 0x8a6a4a, endColor: 0x2a1a08, spd: 41,
    sprite: sheet('Ent1', 128, 84, [8, 7, 6]) },
  { eid: 'ent_warrior', name: 'Древень воин', type: 'warrior', color: 0x8a6a4a, endColor: 0x2a1a08, spd: 45,
    sprite: sheet('Ent2', 128, 84, [8, 7, 12]) },
  { eid: 'demon_guard', name: 'Демон страж', type: 'guard', color: 0xc05050, endColor: 0x3a0505, spd: 71,
    sprite: sheet('Demon1', 128, 81, [8, 10, 13]) },
  { eid: 'demon_warrior', name: 'Демон воин', type: 'warrior', color: 0xc05050, endColor: 0x3a0505, spd: 75,
    sprite: sheet('Demon2', 128, 81, [8, 10, 13]) },
  { eid: 'demon_boss', name: 'Босс демонов', type: 'boss', color: 0xff2020, spd: 65,
    sprite: sheet('Demon3', 128, 81, [8, 10, 13]) },
];

export const ENEMY_BY_ID: Record<string, MonsterDef> = Object.fromEntries(ENEMY_DEF.map((e) => [e.eid, e]));

/**
 * Rotates through the corridor's species one room (level) at a time, flipping
 * guard → warrior every full lap, so consecutive rooms never repeat a sprite.
 */
export function monsterForLocalLevel(species: string[], localLvl: number): MonsterDef {
  const lvl = Math.max(1, localLvl || 1) - 1;
  const sp = species[lvl % species.length];
  const lap = Math.floor(lvl / species.length) % 2;
  return ENEMY_BY_ID[`${sp}_${lap === 0 ? 'guard' : 'warrior'}`];
}
