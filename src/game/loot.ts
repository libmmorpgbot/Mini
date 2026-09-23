// Kill loot, ported from libmmorpgbot-'s _rollMobLoot / _rollFarmZoneLoot
// (server/game/loot.js): gold, gear of the level's rarity tier and skill books
// for the Q/W/E/R slot that level rotates to. Crafting materials (recipes,
// keys, enchant stones, shards) are left out -- this game has no forge.
import {
  BOSS_ITEM_DROP_MULT,
  EARLY_ZONE_ARMS,
  EARLY_ZONE_DROP_MULT,
  MINI_RATES,
  armLocalLevel,
  itemDropChanceAtLevel,
  itemRarityForLevel,
  levelSkillBookKey,
  roomDropMult,
  rollGoldDrop,
} from '../data/gameRules';
import { GEAR_DEF } from '../data/items';
import type { LocationDef } from '../data/locations';
import { skillBookId } from '../data/skills';

export interface KilledMonster {
  eid: string;
  level: number;
  isBoss: boolean;
}

export interface Loot {
  gold: number;
  gear: string[];
  books: Record<string, number>;
}

export function rollLoot(location: LocationDef, monster: KilledMonster, sourceClass: string): Loot {
  const loot: Loot = { gold: rollGoldDrop(monster.level, monster.isBoss), gear: [], books: {} };

  // Farm Zone: no gear, no regular books -- its reward is the ×3 XP.
  if (location.arm === 0) return loot;

  const lvl = monster.level;
  const dropMult = location.arm * roomDropMult(armLocalLevel(lvl));
  const zoneMult = EARLY_ZONE_ARMS.has(location.arm) ? EARLY_ZONE_DROP_MULT : 1;

  // Gear: rarity from the level; any class's weapon can drop for anyone.
  const gearChancePct =
    Math.min(100, itemDropChanceAtLevel(lvl) * (monster.isBoss ? BOSS_ITEM_DROP_MULT : 1)) * zoneMult * MINI_RATES.gear;
  if (Math.random() * 100 < gearChancePct) {
    const rarity = itemRarityForLevel(lvl);
    const candidates = GEAR_DEF.filter((g) => g.rarity === rarity);
    if (candidates.length) loot.gear.push(candidates[Math.floor(Math.random() * candidates.length)].id);
  }

  // Skill books: the slot rotates with the monster's level (Q, W, E, R, Q...).
  // The original pools one book per class; here only the hero's own class
  // drops, since there is no market to trade the rest on.
  const bookId = skillBookId(sourceClass, levelSkillBookKey(lvl));
  if (monster.isBoss) {
    if (Math.random() < 0.001 * zoneMult * MINI_RATES.books) loot.books[bookId] = 2;
  } else if (Math.random() < 0.00002 * Math.min(dropMult, 3) * zoneMult * MINI_RATES.books) {
    loot.books[bookId] = 1;
  }

  return loot;
}
