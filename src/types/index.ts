import type { SkillKey, UpgradeKey } from '../data/gameRules';
import type { GearSlot } from '../data/items';

export interface CharacterAnimation {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  /** Playback speed of this animation, in frames per second. */
  fps: number;
  /**
   * Transparent padding (in source px) below the character's actual feet
   * within each frame -- these sprite sheets reserve a fixed canvas per
   * frame, so the visible figure rarely touches the bottom edge. Used to
   * shift the sprite down so its real feet (not the frame's bottom edge)
   * land on the ground line.
   */
  bottomPadding: number;
  /**
   * For the attack animation only: the 0-indexed frame at which the hit
   * lands / the projectile launches. Defaults to the second-to-last frame
   * when omitted.
   */
  hitFrame?: number;
}

export interface CharacterClass {
  id: string;
  name: string;
  /** Accusative form of `name`, for phrases like "В бой за {nameAccusative}". */
  nameAccusative: string;
  title: string;
  /**
   * The libmmorpgbot- class this hero plays as: its base stats, weapons and
   * Q/W/E/R skills (CHAR_DEF / SKILL_DEF there).
   */
  sourceClass: string;
  baseHP: number;
  baseAtk: number;
  baseDef: number;
  /** Attacks per second at level 1 (twice the original class's rate). */
  atkSpeed: number;
  /** Accent color used for this character's UI highlights (hex, e.g. 0xff0000). */
  accentColor: number;
  /** Distance (px) at which this character engages a monster instead of closing in further. */
  attackRange: number;
  /** Set for ranged classes: fires a visual projectile toward the target on each attack tick. */
  rangedAttack?: 'arrow' | 'ice';
  animations: {
    idle: CharacterAnimation;
    run: CharacterAnimation;
    attack: CharacterAnimation;
  };
}

export interface GearInstance {
  /** Unique per save, so two copies of the same item can be told apart. */
  uid: number;
  id: string;
}

export interface GameState {
  /** Id of the CharacterClass this save belongs to. */
  classId: string;
  gold: number;
  gems: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  health: number;
  /** Derived from level/upgrades/gear; kept here so health can be clamped to it. */
  maxHealth: number;
  /** Run-speed multiplier, 1 = 100%. Grows +5% per level. */
  speed: number;
  /** Skill points spent per stat ("Улучшения"). */
  upgrades: Record<UpgradeKey, number>;
  /** Q/W/E/R levels; 0 = not learned yet. */
  skillLevels: Record<SkillKey, number>;
  /** Gear in the bag. */
  inventory: GearInstance[];
  equipment: Partial<Record<GearSlot, GearInstance>>;
  /** Skill books by id → count. */
  books: Record<string, number>;
  /** Potions by id → count. */
  potions: Record<string, number>;
  kills: number;
  nextUid: number;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initDataUnsafe: {
    user?: TelegramUser;
  };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export {};
