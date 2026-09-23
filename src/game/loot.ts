// Kill loot, ported from libmmorpgbot-'s _rollMobLoot / _rollFarmZoneLoot
// (server/game/loot.js): gold, gear of the level's rarity tier and skill books
// for the Q/W/E/R slot that level rotates to. Crafting materials (recipes,
// keys, enchant stones, shards) are left out -- this game has no forge.
//
// The chances live in dropTable() so the map's "what drops here" list and the
// actual roll can never disagree.
import {
  EARLY_ZONE_ARMS,
  EARLY_ZONE_DROP_MULT,
  MINI_RATES,
  armLocalLevel,
  goldAtLevel,
  itemDropChanceAtLevel,
  itemRarityForLevel,
  levelSkillBookKey,
  roomDropMult,
} from '../data/gameRules';
import { GEAR_DEF, type GearDef } from '../data/items';
import type { LocationDef } from '../data/locations';
import { BOOK_BY_ID, skillBookId, type BookDef } from '../data/skills';

export interface KilledMonster {
  eid: string;
  level: number;
}

export interface Loot {
  gold: number;
  gear: string[];
  books: Record<string, number>;
}

/** Chances are 0..1, per kill. */
export interface DropTable {
  gold: { chance: number; min: number; max: number };
  /** Every item that can drop here, each with its own chance (one is picked per successful roll). */
  gear: { item: GearDef; chance: number }[];
  book: { book: BookDef; chance: number } | null;
}

const REGULAR_GOLD_CHANCE = 0.3;

export function dropTable(location: LocationDef, sourceClass: string, level = location.monsterLevelRange[0]): DropTable {
  const [min, max] = location.monsterLevelRange;
  const gold = {
    chance: REGULAR_GOLD_CHANCE,
    min: goldAtLevel(location.farmPool ? min : level),
    max: goldAtLevel(location.farmPool ? max : level),
  };

  // Farm Zone: no gear, no regular books -- its reward is the ×3 XP.
  if (location.arm === 0) return { gold, gear: [], book: null };

  const dropMult = location.arm * roomDropMult(armLocalLevel(level));
  const zoneMult = EARLY_ZONE_ARMS.has(location.arm) ? EARLY_ZONE_DROP_MULT : 1;

  // One gear roll per kill for the level's rarity tier; any class's weapon can
  // drop for anyone, so the tier's chance splits evenly across its items.
  const rarity = itemRarityForLevel(level);
  const items = GEAR_DEF.filter((g) => g.rarity === rarity);
  const gearChance = Math.min(1, (itemDropChanceAtLevel(level) * zoneMult * MINI_RATES.gear) / 100);

  // The book slot rotates with the monster's level (Q, W, E, R, Q...). The
  // original pools one book per class; here only the hero's own class drops,
  // since there is no market to trade the rest on.
  const book = BOOK_BY_ID[skillBookId(sourceClass, levelSkillBookKey(level))];

  return {
    gold,
    gear: items.map((item) => ({ item, chance: gearChance / items.length })),
    book: book ? { book, chance: Math.min(1, 0.00002 * Math.min(dropMult, 3) * zoneMult * MINI_RATES.books) } : null,
  };
}

export function rollLoot(location: LocationDef, monster: KilledMonster, sourceClass: string): Loot {
  const table = dropTable(location, sourceClass, monster.level);
  const loot: Loot = { gold: 0, gear: [], books: {} };

  if (Math.random() < table.gold.chance) loot.gold = goldAtLevel(monster.level);

  // Walk the per-item chances with a single roll, so at most one item drops.
  let roll = Math.random();
  for (const { item, chance } of table.gear) {
    if (roll < chance) {
      loot.gear.push(item.id);
      break;
    }
    roll -= chance;
  }

  if (table.book && Math.random() < table.book.chance) loot.books[table.book.book.id] = 1;

  return loot;
}
