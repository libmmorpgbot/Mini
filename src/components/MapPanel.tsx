import { useState } from 'react';
import { CORRIDORS, FARM_ZONE, ROOMS, isUnlocked, type LocationDef } from '../data/locations';
import { ENEMY_BY_ID } from '../data/monsters';
import { RARITY_COLOR, RARITY_LABEL } from '../data/items';
import { BOOK_BY_ID } from '../data/skills';
import { MINI_RATES } from '../data/gameRules';
import { dropTable } from '../game/loot';
import { roomMonster } from '../game/spawn';
import { Icon } from './Icon';
import { MonsterThumb } from './MonsterThumb';

interface MapPanelProps {
  playerLevel: number;
  sourceClass: string;
  activeLocationId: string;
  onSelect: (locationId: string) => void;
}

function pct(chance: number): string {
  const p = chance * 100;
  if (p >= 99.95) return '100%';
  if (p >= 10) return `${p.toFixed(0)}%`;
  if (p >= 1) return `${p.toFixed(1)}%`;
  if (p >= 0.01) return `${p.toFixed(2)}%`;
  return `${p.toPrecision(1)}%`;
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function RoomTile({
  location,
  active,
  locked,
  onClick,
}: {
  location: LocationDef;
  active: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const monster = roomMonster(location);
  return (
    <button className={`room-tile${active ? ' active' : ''}${locked ? ' locked' : ''}`} onClick={onClick}>
      <MonsterThumb def={monster.def} size={40} grayscale={locked} />
      <span className="room-tile-level">{location.short}</span>
      {locked && <Icon name="lock" size={12} className="room-tile-lock" />}
    </button>
  );
}

function LocationSheet({
  location,
  playerLevel,
  sourceClass,
  active,
  onGo,
  onClose,
}: {
  location: LocationDef;
  playerLevel: number;
  sourceClass: string;
  active: boolean;
  onGo: () => void;
  onClose: () => void;
}) {
  const locked = !isUnlocked(location, playerLevel);
  const table = dropTable(location, sourceClass);
  const monsters = location.farmPool
    ? location.farmPool.map((eid) => ENEMY_BY_ID[eid])
    : [roomMonster(location).def];
  const preview = location.farmPool ? null : roomMonster(location);
  const boss = location.boss ? roomMonster(location, true) : null;
  const [minLvl, maxLvl] = location.monsterLevelRange;
  const book = table.book ? BOOK_BY_ID[table.book.id] : null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-title-row">
          <div>
            <div className="sheet-name">{location.name}</div>
            <div className="sheet-sub">
              Монстры {minLvl === maxLvl ? `${minLvl}` : `${minLvl}–${maxLvl}`} ур.
              {location.xpMult ? ` · опыт ×${location.xpMult}` : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </div>

        <div className="sheet-section-title">Монстры</div>
        <div className="loc-monsters">
          {preview ? (
            <div className="loc-monster">
              <MonsterThumb def={preview.def} size={56} />
              <div>
                <div className="loc-monster-name" style={{ color: hex(preview.nameColor) }}>
                  {preview.name}
                </div>
                <div className="stat-line">
                  <span><Icon name="heart" size={13} /> {preview.stats.hp}</span>
                  <span><Icon name="sword" size={13} /> {preview.stats.atk}</span>
                  <span><Icon name="shield" size={13} /> {preview.stats.def}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="loc-monster-row">
              {monsters.map((m) => (
                <div key={m.eid} className="loc-monster-mini">
                  <MonsterThumb def={m} size={44} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
          )}
          {boss && (
            <div className="loc-monster boss">
              <MonsterThumb def={boss.def} size={56} />
              <div>
                <div className="loc-monster-name boss-name">
                  <Icon name="skull" size={14} /> {boss.name}
                </div>
                <div className="stat-line">
                  <span><Icon name="heart" size={13} /> {boss.stats.hp}</span>
                  <span><Icon name="sword" size={13} /> {boss.stats.atk}</span>
                  <span><Icon name="shield" size={13} /> {boss.stats.def}</span>
                </div>
                <div className="sheet-sub">Каждые {MINI_RATES.bossEveryKills} убийств</div>
              </div>
            </div>
          )}
        </div>

        <div className="sheet-section-title">Добыча</div>
        <table className="drop-table">
          <thead>
            <tr>
              <th />
              <th>Монстр</th>
              {boss && <th>Босс</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="drop-label">
                  <Icon name="coin" size={15} className="tint-gold" /> Золото{' '}
                  {table.gold.min === table.gold.max ? table.gold.min : `${table.gold.min}–${table.gold.max}`}
                </span>
              </td>
              <td>{pct(table.gold.chance)}</td>
              {boss && <td>{pct(table.gold.bossChance)}</td>}
            </tr>
            {table.gear && (
              <tr>
                <td>
                  <span className="drop-label" style={{ color: RARITY_COLOR[table.gear.rarity] }}>
                    <Icon name="chest" size={15} /> Снаряжение: {RARITY_LABEL[table.gear.rarity].toLowerCase()}
                  </span>
                </td>
                <td>{pct(table.gear.chance)}</td>
                {boss && <td>{pct(table.gear.bossChance)}</td>}
              </tr>
            )}
            {table.book && book && (
              <tr>
                <td>
                  <span className="drop-label">
                    <img src={book.img} alt="" className="drop-book-icon" /> {book.name}
                  </span>
                </td>
                <td>{pct(table.book.chance)}</td>
                {boss && (
                  <td>
                    {pct(table.book.bossChance)} ×{table.book.bossQty}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>

        {table.gear && (
          <div className="drop-items">
            {table.gear.items.map((it) => (
              <div
                key={it.id}
                className="item-cell small"
                title={it.name}
                style={{ borderColor: RARITY_COLOR[it.rarity] }}
              >
                <img src={it.img} alt={it.name} />
              </div>
            ))}
          </div>
        )}
        {!table.gear && <p className="panel-hint">Снаряжение и книги здесь не выпадают — только золото и опыт ×3.</p>}

        <button className="btn btn-primary btn-block" disabled={locked || active} onClick={onGo}>
          {locked ? `Откроется на ${location.minLevel} ур.` : active ? 'Вы здесь' : 'Охотиться здесь'}
        </button>
      </div>
    </div>
  );
}

export function MapPanel({ playerLevel, sourceClass, activeLocationId, onSelect }: MapPanelProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = [...ROOMS, FARM_ZONE].find((l) => l.id === openId) ?? null;

  return (
    <div className="map-panel">
      <h1 className="panel-title">Карта мира</h1>
      <p className="panel-hint">78 комнат — в каждой монстры своего уровня. Нажмите на комнату, чтобы увидеть монстров и добычу.</p>

      {CORRIDORS.map((c) => {
        const rooms = ROOMS.filter((r) => r.arm === c.arm);
        const locked = !isUnlocked(rooms[0], playerLevel);
        return (
          <section key={c.arm} className="corridor">
            <header className="corridor-head">
              <MonsterThumb def={ENEMY_BY_ID[c.boss]} size={36} grayscale={locked} />
              <div>
                <div className="corridor-name">{c.name}</div>
                <div className="sheet-sub">
                  {c.description} · {rooms[0].short}–{rooms[rooms.length - 1].short} ур.
                  {locked && ` · откроется на ${rooms[0].minLevel} ур.`}
                </div>
              </div>
            </header>
            <div className="room-grid">
              {rooms.map((r) => (
                <RoomTile
                  key={r.id}
                  location={r}
                  active={r.id === activeLocationId}
                  locked={locked}
                  onClick={() => setOpenId(r.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="corridor">
        <button className="farm-card" onClick={() => setOpenId(FARM_ZONE.id)}>
          <MonsterThumb def={ENEMY_BY_ID.orc_warrior} size={36} grayscale={!isUnlocked(FARM_ZONE, playerLevel)} />
          <div>
            <div className="corridor-name">
              {FARM_ZONE.name} {FARM_ZONE.id === activeLocationId && <span className="tag">Вы здесь</span>}
            </div>
            <div className="sheet-sub">Зомби, ящеры и орки 21–30 ур. · опыт ×3</div>
          </div>
          <Icon name="chevron" className="farm-card-chevron" />
        </button>
      </section>

      {open && (
        <LocationSheet
          location={open}
          playerLevel={playerLevel}
          sourceClass={sourceClass}
          active={open.id === activeLocationId}
          onGo={() => {
            setOpenId(null);
            onSelect(open.id);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
