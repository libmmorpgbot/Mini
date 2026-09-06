import type { CharacterClass, GameState } from '../types';
import { staticFrameStyle } from '../utils/characterVisuals';

interface HUDProps {
  character: CharacterClass;
  state: GameState;
  speed: number;
}

const AVATAR_HEIGHT = 44;

export function HUD({ character, state, speed }: HUDProps) {
  const healthPercent = state.maxHealth > 0 ? Math.min(100, (state.health / state.maxHealth) * 100) : 0;
  const xpPercent = state.xpToNextLevel > 0 ? Math.min(100, (state.xp / state.xpToNextLevel) * 100) : 0;
  const power = Math.round(state.maxHealth * 0.5 + character.baseDamage * 8 + (state.level - 1) * 10);

  return (
    <div className="header">
      <div className="header-top">
        <div className="header-avatar-wrap">
          <div className="header-avatar" style={staticFrameStyle(character.animations.idle, AVATAR_HEIGHT)} />
          <span className="header-level-badge">{state.level}</span>
        </div>

        <div className="header-bars">
          <div className="stat-bar hp-bar">
            <div className="stat-bar-fill" style={{ width: `${healthPercent}%` }} />
            <span className="stat-bar-label">
              ❤ {Math.round(state.health)}/{state.maxHealth}
            </span>
          </div>
          <div className="stat-bar xp-bar">
            <div className="stat-bar-fill" style={{ width: `${xpPercent}%` }} />
            <span className="stat-bar-label">
              ⭐ {state.xp}/{state.xpToNextLevel}
            </span>
          </div>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-chip stat-chip-power">
          <span className="stat-chip-icon">⚔️</span>
          <span className="stat-chip-value">{power}</span>
        </div>
        <div className="stat-chip stat-chip-gold">
          <span className="stat-chip-icon">💰</span>
          <span className="stat-chip-value">{state.gold}</span>
        </div>
        <div className="stat-chip stat-chip-gem">
          <span className="stat-chip-icon">💎</span>
          <span className="stat-chip-value">{state.gems}</span>
        </div>
        <div className="stat-chip stat-chip-speed">
          <span className="stat-chip-icon">⚡</span>
          <span className="stat-chip-value">{Math.round(speed * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
