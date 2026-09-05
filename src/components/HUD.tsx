interface HUDProps {
  gold: number;
  level: number;
  speed: number;
}

export function HUD({ gold, level, speed }: HUDProps) {
  return (
    <div className="hud">
      <div className="hud-item">
        <span className="hud-label">Золото</span>
        <span className="hud-value">💰 {gold}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Уровень</span>
        <span className="hud-value">⭐ {level}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Скорость</span>
        <span className="hud-value">⚡ {Math.round(speed * 100)}%</span>
      </div>
    </div>
  );
}
