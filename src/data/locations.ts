import type { Landmark, ParallaxPalette } from '../pixi/ParallaxBackground';

export interface LocationDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Player level at which this location unlocks. */
  minLevel: number;
  /** Bounds for the level rolled for monsters spawned here. */
  monsterLevelRange: [number, number];
  /** Multiplies monster health/damage on top of their own level scaling. */
  statMultiplier: number;
  palette: ParallaxPalette;
  landmark: Landmark;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'forest',
    name: 'Лес',
    description: 'Спокойные тропы для начала пути',
    icon: '🌲',
    minLevel: 1,
    monsterLevelRange: [1, 5],
    statMultiplier: 1,
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
    id: 'graveyard',
    name: 'Кладбище',
    description: 'Туманные могилы и беспокойные духи',
    icon: '🪦',
    minLevel: 6,
    monsterLevelRange: [6, 10],
    statMultiplier: 1.4,
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
    id: 'fortress',
    name: 'Крепость',
    description: 'Древние стены на границе земель',
    icon: '🏰',
    minLevel: 11,
    monsterLevelRange: [11, 15],
    statMultiplier: 1.8,
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
    id: 'diablo',
    name: 'Диабло',
    description: 'Разлом в преисподнюю пылает гневом',
    icon: '😈',
    minLevel: 16,
    monsterLevelRange: [16, 20],
    statMultiplier: 2.3,
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
  {
    id: 'lava',
    name: 'Лава',
    description: 'Раскалённые земли у подножия вулкана',
    icon: '🌋',
    minLevel: 21,
    monsterLevelRange: [21, 35],
    statMultiplier: 2.8,
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
];

export function getLocationForLevel(level: number): LocationDef {
  let current = LOCATIONS[0];
  for (const location of LOCATIONS) {
    if (level >= location.minLevel) {
      current = location;
    }
  }
  return current;
}
