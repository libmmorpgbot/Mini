import type { Landmark, ParallaxPalette } from '../pixi/ParallaxBackground';
import { ARM_OFFSETS, ARM_ROOM_COUNTS } from './gameRules';

// The world of libmmorpgbot-: four corridors off the central hub, each with its
// own rotation of monster species and a boss at the end, plus the Farm Zone
// (shared/definitions.js: FLOOR_ENEMIES, ARM_LEVEL_REQ, FARM_*).
export interface LocationDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Player level at which this location unlocks. */
  minLevel: number;
  /** Bounds for the (global) level rolled for monsters spawned here. */
  monsterLevelRange: [number, number];
  /** Corridor index 1-4 (drives the drop multipliers); 0 for the Farm Zone. */
  arm: number;
  /** Species rotated through room by room, weakest → strongest. */
  species: string[];
  /** Boss that spawns every MINI_RATES.bossEveryKills kills (corridors only). */
  boss?: string;
  /**
   * Farm Zone: every monster is a random pick from `farmPool`, gives
   * `xpMult`× XP and drops no gear or books (same as the original).
   */
  farmPool?: string[];
  xpMult?: number;
  palette: ParallaxPalette;
  landmark: Landmark;
}

function armRange(arm: number): [number, number] {
  return [ARM_OFFSETS[arm - 1] + 1, ARM_OFFSETS[arm - 1] + ARM_ROOM_COUNTS[arm - 1]];
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'left',
    name: 'Левый коридор',
    description: 'Крысы, слизни и бесы',
    icon: '🐀',
    minLevel: 1,
    monsterLevelRange: armRange(1),
    arm: 1,
    species: ['rat', 'slime', 'imp'],
    boss: 'imp_boss',
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
    id: 'top',
    name: 'Верхний коридор',
    description: 'Зомби, ящеры и орки',
    icon: '🧟',
    minLevel: 20,
    monsterLevelRange: armRange(2),
    arm: 2,
    species: ['zombie', 'lizardman', 'orc'],
    boss: 'orc_boss',
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
    id: 'farm',
    name: 'Фарм зона',
    description: 'Зомби, ящеры и орки 21-30 ур. Опыт ×3, но без снаряжения и книг',
    icon: '🌾',
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
  },
  {
    id: 'bottom',
    name: 'Нижний коридор',
    description: 'Лозы, вампиры и бехолдеры',
    icon: '🧛',
    minLevel: 40,
    monsterLevelRange: armRange(3),
    arm: 3,
    species: ['plant', 'vampire', 'beholder'],
    boss: 'beholder_boss',
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
    id: 'right',
    name: 'Правый коридор',
    description: 'Древни и демоны',
    icon: '😈',
    minLevel: 60,
    monsterLevelRange: armRange(4),
    arm: 4,
    species: ['ent', 'demon'],
    boss: 'demon_boss',
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

export function getLocationForLevel(level: number): LocationDef {
  let current = LOCATIONS[0];
  for (const location of LOCATIONS) {
    if (location.arm > 0 && level >= location.minLevel) {
      current = location;
    }
  }
  return current;
}
