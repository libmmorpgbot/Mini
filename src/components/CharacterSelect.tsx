import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { CharacterClass } from '../types';
import { animatedFrameStyle, buildSpriteKeyframes } from '../utils/characterVisuals';
import { SKILL_DEF } from '../data/skills';
import { UPGRADE_KEYS, type UpgradeKey } from '../data/gameRules';
import { computeStats, type PlayerStats } from '../game/stats';
import { Icon, type IconName } from './Icon';

interface CharacterSelectProps {
  characters: CharacterClass[];
  selectedId?: string;
  title?: string;
  subtitle?: string;
  confirmLabel?: (character: CharacterClass) => string;
  onConfirm: (character: CharacterClass) => void;
}

const PREVIEW_HEIGHT = 150;
/** Horizontal drag (px) that flips to the next/previous hero. */
const SWIPE_THRESHOLD = 40;

/** The libmmorpgbot- class each hero plays as. */
const ROLE: Record<string, string> = {
  lev: 'Танк',
  deathknight: 'Рыцарь Смерти',
  ranger: 'Егерь',
  mage: 'Маг',
  assassin: 'Ассасин',
};

const LEVEL_ONE = {
  level: 1,
  upgrades: Object.fromEntries(UPGRADE_KEYS.map((k) => [k, 0])) as Record<UpgradeKey, number>,
  equipment: {},
};

interface StatRow {
  key: keyof PlayerStats;
  label: string;
  icon: IconName;
  format: (v: number) => string;
}

const STAT_ROWS: StatRow[] = [
  { key: 'maxHp', label: 'Здоровье', icon: 'heart', format: (v) => `${v}` },
  { key: 'atk', label: 'Атака', icon: 'sword', format: (v) => `${v}` },
  { key: 'def', label: 'Защита', icon: 'shield', format: (v) => `${v}` },
  { key: 'atkSpeed', label: 'Скор. атаки', icon: 'bolt', format: (v) => `${v.toFixed(2)}/с` },
];

export function CharacterSelect({
  characters,
  selectedId,
  title = 'Выберите героя',
  subtitle = 'Листайте, чтобы сравнить героев',
  confirmLabel = (character) => `В бой за ${character.nameAccusative}`,
  onConfirm,
}: CharacterSelectProps) {
  const [index, setIndex] = useState(() => Math.max(0, characters.findIndex((c) => c.id === selectedId)));
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef<number | null>(null);
  const picked = characters[index] ?? characters[0];

  const keyframes = useMemo(
    () =>
      characters
        .map((c) => buildSpriteKeyframes(`char-idle-${c.id}`, c.animations.idle, PREVIEW_HEIGHT))
        .join('\n'),
    [characters]
  );

  const stats = useMemo(() => characters.map((c) => computeStats(c, LEVEL_ONE)), [characters]);
  const maxOf = (key: keyof PlayerStats) => Math.max(...stats.map((s) => s[key]));

  const go = (delta: number) => setIndex((i) => (i + delta + characters.length) % characters.length);

  const onPointerDown = (e: PointerEvent) => {
    dragStart.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragStart.current !== null) setDragX(e.clientX - dragStart.current);
  };
  const endDrag = () => {
    if (dragStart.current === null) return;
    if (dragX <= -SWIPE_THRESHOLD) go(1);
    else if (dragX >= SWIPE_THRESHOLD) go(-1);
    dragStart.current = null;
    setDragX(0);
  };

  const accent = `#${picked.accentColor.toString(16).padStart(6, '0')}`;
  const pickedStats = stats[index];
  const skills = SKILL_DEF[picked.sourceClass] ?? [];

  return (
    <div className="char-select">
      <style>{keyframes}</style>

      <h1 className="char-select-title">{title}</h1>
      <p className="char-select-subtitle">{subtitle}</p>

      <div className="carousel">
        <button className="carousel-arrow left" onClick={() => go(-1)} aria-label="Предыдущий герой">
          <Icon name="chevron" size={22} style={{ transform: 'scaleX(-1)' }} />
        </button>

        <div
          className="carousel-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className="carousel-track"
            style={{
              transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
              transition: dragStart.current === null ? 'transform 0.3s ease' : 'none',
            }}
          >
            {characters.map((c, i) => {
              const color = `#${c.accentColor.toString(16).padStart(6, '0')}`;
              return (
                <div key={c.id} className={`carousel-slide${i === index ? ' active' : ''}`}>
                  <div className="carousel-stage" style={{ '--hero-accent': color } as CSSProperties}>
                    <div
                      className="char-sprite"
                      style={{
                        ...animatedFrameStyle(c.animations.idle, PREVIEW_HEIGHT, `char-idle-${c.id}`),
                        // Sheets leave transparent space under the feet; pull it
                        // down so every hero stands on the glow.
                        marginBottom: -(c.animations.idle.bottomPadding * PREVIEW_HEIGHT) / c.animations.idle.frameHeight,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className="carousel-arrow right" onClick={() => go(1)} aria-label="Следующий герой">
          <Icon name="chevron" size={22} />
        </button>
      </div>

      <div className="carousel-dots">
        {characters.map((c, i) => (
          <button
            key={c.id}
            className={`carousel-dot${i === index ? ' active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={c.name}
          />
        ))}
      </div>

      <div className="hero-info">
        <div className="hero-heading">
          <h2 className="hero-name">{picked.name}</h2>
          {ROLE[picked.sourceClass] && ROLE[picked.sourceClass] !== picked.name && (
            <span className="hero-role" style={{ borderColor: accent, color: accent }}>
              {ROLE[picked.sourceClass]}
            </span>
          )}
        </div>
        <p className="hero-title">
          {picked.title} · {picked.rangedAttack ? `дальний бой, ${picked.attackRange}px` : 'ближний бой'}
        </p>

        <div className="hero-section-title">Характеристики на 1 уровне</div>
        <div className="hero-stats">
          {STAT_ROWS.map((row) => {
            const value = pickedStats[row.key];
            return (
              <div key={row.key} className="hero-stat">
                <Icon name={row.icon} size={15} className="hero-stat-icon" />
                <span className="hero-stat-label">{row.label}</span>
                <div className="hero-stat-bar">
                  <div
                    className="hero-stat-fill"
                    style={{ width: `${(value / maxOf(row.key)) * 100}%`, background: accent }}
                  />
                </div>
                <span className="hero-stat-value">{row.format(value)}</span>
              </div>
            );
          })}
          <div className="hero-stat-extra">
            <span>
              <Icon name="star" size={13} /> Крит {Math.round(pickedStats.critChance * 100)}%
            </span>
            <span>
              <Icon name="flame" size={13} /> Сила крита ×{pickedStats.critPower.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="hero-section-title">Навыки</div>
        <div className="hero-skills">
          {skills.map((s) => (
            <div key={s.key} className="hero-skill">
              <div className="hero-skill-icon">
                <img src={s.img} alt="" />
                <span className="skill-slot-key">{s.key}</span>
              </div>
              <div className="hero-skill-body">
                <div className="hero-skill-name">
                  {s.name} <small>КД {s.cd}с</small>
                </div>
                <div className="hero-skill-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="char-select-footer">
        <button className="char-confirm-button" onClick={() => onConfirm(picked)}>
          {confirmLabel(picked)}
        </button>
      </div>
    </div>
  );
}
