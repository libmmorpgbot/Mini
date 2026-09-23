import type { Landmark, ParallaxPalette } from '../pixi/ParallaxBackground';
import { ARM_LEVEL_REQ, ARM_OFFSETS, ARM_ROOM_COUNTS, MAX_MONSTER_LEVEL } from './gameRules';

// The world of libmmorpgbot-: four corridors off the central hub, each made of
// rooms whose monsters are one level stronger than the room before (78 rooms,
// monster levels 1-78), plus the Farm Zone. The original's corridor bosses are left out (shared/definitions.js:
// FLOOR_ENEMIES, ARM_ROOM_COUNTS, ARM_LEVEL_REQ, FARM_*).
export interface LocationDef {
  id: string;
  name: string;
  /** Short label for compact tiles: the room's level, or "Ф" for the Farm Zone. */
  short: string;
  /** Player level at which this location unlocks (the corridor's gate). */
  minLevel: number;
  /** Bounds for the level of monsters spawned here (a single level for rooms). */
  monsterLevelRange: [number, number];
  /** Corridor index 1-4 (drives the drop multipliers); 0 for the Farm Zone. */
  arm: number;
  /** Species rotated through room by room, weakest → strongest. */
  species: string[];
  /**
   * Farm Zone: every monster is a random pick from `farmPool`, gives
   * `xpMult`× XP and drops no gear or books (same as the original).
   */
  farmPool?: string[];
  xpMult?: number;
  palette: ParallaxPalette;
  landmark: Landmark;
}

export interface CorridorDef {
  arm: number;
  name: string;
  description: string;
  species: string[];
  landmark: Landmark;
  palette: ParallaxPalette;
}

export const CORRIDORS: CorridorDef[] = [
  {
    arm: 1,
    name: 'Левый коридор',
    description: 'Крысы, слизни и бесы',
    species: ['rat', 'slime', 'imp'],
    landmark: 'trees',
    palette: {
      skyTop: 0x3d7ab8,
      skyMid: 0x6fa8d8,
      skyBottom: 0xbfe0e8,
      hillFar: 0x5f8f72,
      hillNear: 0x2f5c3f,
      groundTop: 0x5f9a4a,
      groundBottom: 0x2f4f22,
      path: 0xc0a878,
      accent: 0xfff2c0,
      cloud: 0xffffff,
    },
  },
  {
    arm: 2,
    name: 'Верхний коридор',
    description: 'Зомби, ящеры и орки',
    species: ['zombie', 'lizardman', 'orc'],
    landmark: 'graves',
    palette: {
      skyTop: 0x2e2f42,
      skyMid: 0x4b4d63,
      skyBottom: 0x7d7f95,
      hillFar: 0x4a4a5c,
      hillNear: 0x2a2a38,
      groundTop: 0x54566a,
      groundBottom: 0x24252f,
      path: 0x6a6a78,
      accent: 0x9fe6a0,
      cloud: 0xb8b8c8,
    },
  },
  {
    arm: 3,
    name: 'Нижний коридор',
    description: 'Лозы, вампиры и бехолдеры',
    species: ['plant', 'vampire', 'beholder'],
    landmark: 'fortress',
    palette: {
      skyTop: 0x334155,
      skyMid: 0x5b7290,
      skyBottom: 0x9fb8cf,
      hillFar: 0x5a6b7a,
      hillNear: 0x384552,
      groundTop: 0x6b6f5c,
      groundBottom: 0x2d2f26,
      path: 0x8a8a78,
      accent: 0xffcf6b,
      cloud: 0xd8e0e8,
    },
  },
  {
    arm: 4,
    name: 'Правый коридор',
    description: 'Древни и демоны',
    species: ['ent', 'demon'],
    landmark: 'rift',
    palette: {
      skyTop: 0x1a0a12,
      skyMid: 0x4a0f18,
      skyBottom: 0x8a2418,
      hillFar: 0x3a1018,
      hillNear: 0x1e0a10,
      groundTop: 0x3a1210,
      groundBottom: 0x140606,
      path: 0x5a1c14,
      accent: 0xff3b3b,
      cloud: 0x8a3a3a,
    },
  },
];

/** One room per monster level: room N holds level-N monsters. */
export const ROOMS: LocationDef[] = CORRIDORS.flatMap((c) =>
  Array.from({ length: ARM_ROOM_COUNTS[c.arm - 1] }, (_, i) => {
    const level = ARM_OFFSETS[c.arm - 1] + i + 1;
    return {
      id: `room-${level}`,
      name: `${c.name} · комната ${i + 1}`,
      short: `${level}`,
      minLevel: Math.max(1, ARM_LEVEL_REQ[c.arm - 1]),
      monsterLevelRange: [level, level] as [number, number],
      arm: c.arm,
      species: c.species,
      landmark: c.landmark,
      palette: c.palette,
    };
  })
);

export const FARM_ZONE: LocationDef = {
  id: 'farm',
  name: 'Фарм зона',
  short: 'Ф',
  minLevel: 20,
  monsterLevelRange: [21, 30],
  arm: 0,
  species: ['zombie', 'lizardman', 'orc'],
  farmPool: ['zombie_guard', 'zombie_warrior', 'lizardman_guard', 'lizardman_warrior', 'orc_guard', 'orc_warrior'],
  xpMult: 3,
  landmark: 'volcano',
    palette: {
      skyTop: 0x2a0d0d,
      skyMid: 0x6b1a1a,
      skyBottom: 0xc9502a,
      hillFar: 0x5a1f1f,
      hillNear: 0x2e0f0f,
      groundTop: 0x4a1c14,
      groundBottom: 0x1a0a08,
      path: 0x8a3a1a,
      accent: 0xffcf5c,
      cloud: 0xffb37a,
    },
};

export const LOCATIONS: LocationDef[] = [...ROOMS, FARM_ZONE];

/** The room matching the hero's level (capped at the last one). */
export function getLocationForLevel(level: number): LocationDef {
  return ROOMS[Math.min(MAX_MONSTER_LEVEL, Math.max(1, level)) - 1];
}

export function corridorOf(location: LocationDef): CorridorDef | undefined {
  return CORRIDORS.find((c) => c.arm === location.arm);
}

export function isUnlocked(location: LocationDef, playerLevel: number): boolean {
  return playerLevel >= location.minLevel;
}
