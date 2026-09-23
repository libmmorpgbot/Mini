import type { CharacterClass, GameState } from '../types';
import type { PlayerStats } from '../game/stats';
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
  stats: PlayerStats;
}

export function ProfilePanel({ character, state, stats }: ProfilePanelProps) {
  const rows: [string, string | number][] = [
    ['Уровень', state.level],
    ['Здоровье', `${Math.round(state.health)}/${state.maxHealth}`],
    ['Атака', stats.atk],
    ['Защита', stats.def],
    ['Шанс крита', `${Math.round(stats.critChance * 100)}%`],
    ['Сила крита', `×${stats.critPower.toFixed(2)}`],
    ['Скор. атаки', `${stats.atkSpeed.toFixed(2)}/с`],
    ['Реген', `${stats.hpRegen.toFixed(2)}/с`],
    ['Убито монстров', state.kills],
    ['Золото', state.gold],
    ['Кристаллы', state.gems],
  ];

  return (
    <div className="profile-panel">
      <div className="profile-avatar" style={staticFrameStyle(character.animations.idle, 96)} />
      <h2 className="profile-name">{character.name}</h2>
      <p className="profile-title">{character.title}</p>

      <div className="profile-stats">
        {rows.map(([label, value]) => (
          <div key={label} className="profile-stat">
            <span className="profile-stat-label">{label}</span>
            <span className="profile-stat-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
