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
  name: string;
  nameColor: number;
  stats: { hp: number; atk: number; def: number };
}

/** Rank tints darken toward the last room; mix with white so names stay readable. */
function readable(color: number): number {
  const mix = (shift: number) => Math.round(((color >> shift) & 255) * 0.55 + 255 * 0.45);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

function build(level: number, def: MonsterDef): MonsterPreview {
  const localLevel = armLocalLevel(level);
  // The corridor's last room, so ranks sweep "Слабый" → "Запредельный".
  const maxLocal = ARM_ROOM_COUNTS[armIndexForLevel(level) - 1] - 1;
  return {
    def,
    level,
    name: monsterNameAtLevel(def.name, localLevel, false, Boolean(def.fem), maxLocal),
    nameColor: readable(monsterColorAtLevel(def.color, def.endColor, localLevel, false, maxLocal)),
    stats: monsterStatsAtLevel(level, def.type),
  };
}

/** The room's signature monster (the one the original put in this room), for map tiles. */
export function roomMonster(location: LocationDef): MonsterPreview {
  const level = location.monsterLevelRange[0];
  return build(level, monsterForLocalLevel(location.species, armLocalLevel(level)));
}

/**
 * Every monster that roams `location`: each of its corridor's species in both
 * the guard and the warrior look (the Farm Zone keeps its own list).
 */
export function monsterPool(location: LocationDef): string[] {
  return location.farmPool ?? location.species.flatMap((sp) => [`${sp}_guard`, `${sp}_warrior`]);
}

/** `eid` as it appears in `location`, at the room's level. */
export function poolMonster(location: LocationDef, eid: string): MonsterPreview {
  return build(location.monsterLevelRange[0], ENEMY_BY_ID[eid]);
}

/** A fresh spawn of `eid` in `location`: rooms have a fixed level, the Farm Zone rolls one. */
export function rollMonster(location: LocationDef, eid: string): MonsterPreview {
  const [min, max] = location.monsterLevelRange;
  const level = min + Math.floor(Math.random() * (max - min + 1));
  return build(level, ENEMY_BY_ID[eid]);
}
