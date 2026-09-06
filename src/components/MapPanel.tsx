import type { LocationDef } from '../data/locations';

function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

interface MapPanelProps {
  locations: LocationDef[];
  playerLevel: number;
  activeLocationId: string;
  onSelect: (locationId: string) => void;
}

export function MapPanel({ locations, playerLevel, activeLocationId, onSelect }: MapPanelProps) {
  return (
    <div className="map-panel">
      <h1 className="map-title">Карта мира</h1>
      <p className="map-subtitle">Выберите локацию для охоты на монстров</p>

      <div className="map-list">
        {locations.map((location) => {
          const locked = playerLevel < location.minLevel;
          const active = location.id === activeLocationId;

          return (
            <button
              key={location.id}
              className={`map-card${active ? ' active' : ''}${locked ? ' locked' : ''}`}
              style={{ background: `linear-gradient(135deg, ${toCss(location.palette.skyMid)}55, ${toCss(location.palette.groundBottom)}88)` }}
              disabled={locked}
              onClick={() => onSelect(location.id)}
            >
              <span className="map-card-icon">{location.icon}</span>
              <span className="map-card-body">
                <span className="map-card-name">{location.name}</span>
                <span className="map-card-desc">{location.description}</span>
                <span className="map-card-level">
                  {locked
                    ? `Открывается на ${location.minLevel} ур.`
                    : `Монстры ${location.monsterLevelRange[0]}-${location.monsterLevelRange[1]} ур.`}
                </span>
              </span>
              {active && <span className="map-card-badge">Сейчас здесь</span>}
              {locked && <span className="map-card-lock">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
