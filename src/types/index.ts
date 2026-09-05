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
}

export interface CharacterClass {
  id: string;
  name: string;
  /** Accusative form of `name`, for phrases like "В бой за {nameAccusative}". */
  nameAccusative: string;
  title: string;
  baseHealth: number;
  baseDamage: number;
  /** Accent color used for this character's UI highlights (hex, e.g. 0xff0000). */
  accentColor: number;
  animations: {
    idle: CharacterAnimation;
    run: CharacterAnimation;
    attack: CharacterAnimation;
  };
}

export interface GameState {
  /** Constant for the run, captured from the chosen character at (re)start. */
  baseHealth: number;
  gold: number;
  gems: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  health: number;
  maxHealth: number;
  /** Run-speed multiplier, 1 = 100%. Grows +5% per level. */
  speed: number;
  boostActive: boolean;
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
