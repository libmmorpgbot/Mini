// Which monster a location spawns, with its rank name, tint and stats -- shared
// by the battle scene and the map's location preview so both always agree.
import {
  ARM_ROOM_COUNTS,
  armIndexForLevel,
  armLocalLevel,
  monsterColorAtLevel,
  monsterNameAtLevel,
  monsterStatsAtLevel,
} from '../data/gameRules';
import type { LocationDef } from '../data/locations';
import { ENEMY_BY_ID, monsterForLocalLevel, type MonsterDef } from '../data/monsters';

export interface MonsterPreview {
  def: MonsterDef;
  level: number;
  isBoss: boolean;
  name: string;
  nameColor: number;
  stats: { hp: number; atk: number; def: number };
}

/** Rank tints darken toward the last room; mix with white so names stay readable. */
function readable(color: number): number {
  const mix = (shift: number) => Math.round(((color >> shift) & 255) * 0.55 + 255 * 0.45);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

function build(level: number, def: MonsterDef, isBoss: boolean): MonsterPreview {
  const localLevel = armLocalLevel(level);
  // The corridor's last non-boss room, so ranks sweep "Слабый" → "Запредельный".
  const maxLocal = ARM_ROOM_COUNTS[armIndexForLevel(level) - 1] - 1;
  return {
    def,
    level,
    isBoss,
    name: monsterNameAtLevel(def.name, localLevel, isBoss, Boolean(def.fem), maxLocal),
    nameColor: readable(monsterColorAtLevel(def.color, def.endColor, localLevel, isBoss, maxLocal)),
    stats: monsterStatsAtLevel(level, def.type),
  };
}

/** The monster a corridor room spawns (deterministic), or its boss. */
export function roomMonster(location: LocationDef, isBoss = false): MonsterPreview {
  const level = location.monsterLevelRange[0];
  const def = isBoss && location.boss ? ENEMY_BY_ID[location.boss] : monsterForLocalLevel(location.species, armLocalLevel(level));
  return build(level, def, isBoss && Boolean(location.boss));
}

/** A fresh spawn for `location`: rooms are fixed, the Farm Zone rolls level and species. */
export function rollMonster(location: LocationDef, isBoss: boolean): MonsterPreview {
  if (!location.farmPool) return roomMonster(location, isBoss);
  const [min, max] = location.monsterLevelRange;
  const level = min + Math.floor(Math.random() * (max - min + 1));
  const def = ENEMY_BY_ID[location.farmPool[Math.floor(Math.random() * location.farmPool.length)]];
  return build(level, def, false);
}
