import type { ParallaxPalette } from '../pixi/ParallaxBackground';

export interface LocationDef {
  id: string;
  name: string;
  /** Player level at which this location unlocks. */
  minLevel: number;
  /** Bounds for the level rolled for monsters spawned here. */
  monsterLevelRange: [number, number];
  /** Multiplies monster health/damage on top of their own level scaling. */
  statMultiplier: number;
  palette: ParallaxPalette;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'meadow',
    name: 'Солнечные луга',
    minLevel: 1,
    monsterLevelRange: [1, 4],
    statMultiplier: 1,
    palette: {
      skyTop: 0x3d7ab8,
      skyMid: 0x6fa8d8,
      skyBottom: 0xbfe0e8,
      hillFar: 0x6a8fae,
      hillNear: 0x3f6b52,
      groundTop: 0x6a9a4e,
      groundBottom: 0x3a5c2c,
      path: 0xc9b27a,
      accent: 0xfff2c0,
      cloud: 0xffffff,
    },
  },
  {
    id: 'twilight-forest',
    name: 'Сумеречный лес',
    minLevel: 5,
    monsterLevelRange: [5, 9],
    statMultiplier: 1.35,
    palette: {
      skyTop: 0x28325c,
      skyMid: 0x4a5a8f,
      skyBottom: 0x8391c9,
      hillFar: 0x4a5a80,
      hillNear: 0x2c4a3f,
      groundTop: 0x466a48,
      groundBottom: 0x21361f,
      path: 0x8f7a5a,
      accent: 0xdcc9ff,
      cloud: 0xc9d3f2,
    },
  },
  {
    id: 'ashen-wastes',
    name: 'Пепельная пустошь',
    minLevel: 10,
    monsterLevelRange: [10, 15],
    statMultiplier: 1.8,
    palette: {
      skyTop: 0x594a45,
      skyMid: 0x8a6f5a,
      skyBottom: 0xcaa875,
      hillFar: 0x7a6455,
      hillNear: 0x483a30,
      groundTop: 0x8a7355,
      groundBottom: 0x372b20,
      path: 0x6a5a48,
      accent: 0xffb060,
      cloud: 0xd9c8b8,
    },
  },
  {
    id: 'infernal-reach',
    name: 'Огненные земли',
    minLevel: 16,
    monsterLevelRange: [16, 30],
    statMultiplier: 2.4,
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
