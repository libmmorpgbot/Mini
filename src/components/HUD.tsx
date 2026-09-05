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

  return (
    <div className="header">
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

      <div className="header-balances">
        <div className="balance-chip">💰 {state.gold}</div>
        <div className="balance-chip">💎 {state.gems}</div>
        <div className="balance-chip">⚡ {Math.round(speed * 100)}%</div>
      </div>
    </div>
  );
}
