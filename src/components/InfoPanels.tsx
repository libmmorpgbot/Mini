import type { CharacterClass, GameState } from '../types';
import { staticFrameStyle } from '../utils/characterVisuals';

interface StubPanelProps {
  icon: string;
  title: string;
  text: string;
}

export function StubPanel({ icon, title, text }: StubPanelProps) {
  return (
    <div className="stub-panel">
      <span className="stub-panel-icon">{icon}</span>
      <h2 className="stub-panel-title">{title}</h2>
      <p className="stub-panel-text">{text}</p>
    </div>
  );
}

interface ProfilePanelProps {
  character: CharacterClass;
  state: GameState;
}

export function ProfilePanel({ character, state }: ProfilePanelProps) {
  return (
    <div className="profile-panel">
      <div className="profile-avatar" style={staticFrameStyle(character.animations.idle, 96)} />
      <h2 className="profile-name">{character.name}</h2>
      <p className="profile-title">{character.title}</p>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-label">Уровень</span>
          <span className="profile-stat-value">{state.level}</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-label">Здоровье</span>
          <span className="profile-stat-value">
            {Math.round(state.health)}/{state.maxHealth}
          </span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-label">Золото</span>
          <span className="profile-stat-value">{state.gold}</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-label">Кристаллы</span>
          <span className="profile-stat-value">{state.gems}</span>
        </div>
      </div>
    </div>
  );
}
