// Kill loot, ported from libmmorpgbot-'s _rollMobLoot / _rollFarmZoneLoot
// (server/game/loot.js): gold, gear of the level's rarity tier and skill books
// for the Q/W/E/R slot that level rotates to. Crafting materials (recipes,
// keys, enchant stones, shards) are left out -- this game has no forge.
//
// The chances live in dropTable() so the map's "what drops here" view and the
// actual roll can never disagree.
import {
  BOSS_ITEM_DROP_MULT,
  EARLY_ZONE_ARMS,
  EARLY_ZONE_DROP_MULT,
  MINI_RATES,
  armLocalLevel,
  goldAtLevel,
  itemDropChanceAtLevel,
  itemRarityForLevel,
  levelSkillBookKey,
  roomDropMult,
  type Rarity,
} from '../data/gameRules';
import { GEAR_DEF, type GearDef } from '../data/items';
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

/** Chances are 0..1. */
export interface DropTable {
  gold: { chance: number; bossChance: number; min: number; max: number };
  gear: { rarity: Rarity; chance: number; bossChance: number; items: GearDef[] } | null;
  book: { id: string; chance: number; qty: number; bossChance: number; bossQty: number } | null;
}

const REGULAR_GOLD_CHANCE = 0.3;
const BOSS_BOOK_QTY = 2;

export function dropTable(location: LocationDef, sourceClass: string, level = location.monsterLevelRange[0]): DropTable {
  const [min, max] = location.monsterLevelRange;
  const gold = {
    chance: REGULAR_GOLD_CHANCE,
    bossChance: 1,
    min: goldAtLevel(location.farmPool ? min : level),
    max: goldAtLevel(location.farmPool ? max : level),
  };

  // Farm Zone: no gear, no regular books -- its reward is the ×3 XP.
  if (location.arm === 0) return { gold, gear: null, book: null };

  const dropMult = location.arm * roomDropMult(armLocalLevel(level));
  const zoneMult = EARLY_ZONE_ARMS.has(location.arm) ? EARLY_ZONE_DROP_MULT : 1;
  const gearPct = (isBoss: boolean) =>
    Math.min(100, itemDropChanceAtLevel(level) * (isBoss ? BOSS_ITEM_DROP_MULT : 1)) * zoneMult * MINI_RATES.gear;
  const rarity = itemRarityForLevel(level);

  return {
    gold,
    // Rarity from the level; any class's weapon can drop for anyone.
    gear: {
      rarity,
      chance: Math.min(1, gearPct(false) / 100),
      bossChance: Math.min(1, gearPct(true) / 100),
      items: GEAR_DEF.filter((g) => g.rarity === rarity),
    },
    // The slot rotates with the monster's level (Q, W, E, R, Q...). The
    // original pools one book per class; here only the hero's own class
    // drops, since there is no market to trade the rest on.
    book: {
      id: skillBookId(sourceClass, levelSkillBookKey(level)),
      chance: Math.min(1, 0.00002 * Math.min(dropMult, 3) * zoneMult * MINI_RATES.books),
      qty: 1,
      bossChance: Math.min(1, 0.001 * zoneMult * MINI_RATES.books),
      bossQty: BOSS_BOOK_QTY,
    },
  };
}

export function rollLoot(location: LocationDef, monster: KilledMonster, sourceClass: string): Loot {
  const table = dropTable(location, sourceClass, monster.level);
  const boss = monster.isBoss;
  const loot: Loot = { gold: 0, gear: [], books: {} };

  if (Math.random() < (boss ? table.gold.bossChance : table.gold.chance)) loot.gold = goldAtLevel(monster.level);

  if (table.gear && table.gear.items.length && Math.random() < (boss ? table.gear.bossChance : table.gear.chance)) {
    loot.gear.push(table.gear.items[Math.floor(Math.random() * table.gear.items.length)].id);
  }

  if (table.book && Math.random() < (boss ? table.book.bossChance : table.book.chance)) {
    loot.books[table.book.id] = boss ? table.book.bossQty : table.book.qty;
  }

  return loot;
}
