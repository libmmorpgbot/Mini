import { useState } from 'react';
import type { CharacterClass, GameState } from '../types';
import type { GameApi } from '../hooks/useGameState';
import {
  SKILL_MAX_LEVEL,
  SKILL_STUDY_COST,
  SKILL_UPGRADE_CHANCE,
  SKILL_UPGRADE_COST,
  UPGRADE_DEF,
  UPGRADE_KEYS,
  type SkillKey,
} from '../data/gameRules';
import { SKILL_DEF, skillBookId } from '../data/skills';
import { availableSkillPoints } from '../game/stats';
import { Icon } from './Icon';

interface SkillsPanelProps {
  character: CharacterClass;
  state: GameState;
  actions: GameApi;
}

export function SkillsPanel({ character, state, actions }: SkillsPanelProps) {
  const skills = SKILL_DEF[character.sourceClass] ?? [];
  const points = availableSkillPoints(state);
  const [lastRoll, setLastRoll] = useState<{ key: SkillKey; success: boolean } | null>(null);

  return (
    <div className="skills-panel">
      <h1 className="panel-title">Навыки</h1>
      <p className="panel-hint">
        Книги навыков выпадают с монстров: слот (Q, W, E, R) зависит от уровня монстра, с боссов — по две.
        Изучение — {SKILL_STUDY_COST} книга, улучшение — {SKILL_UPGRADE_COST} книги с шансом{' '}
        {Math.round(SKILL_UPGRADE_CHANCE * 100)}%. В бою навыки срабатывают сами.
      </p>

      <div className="skill-list">
        {skills.map((skill) => {
          const lvl = state.skillLevels[skill.key];
          const have = state.books[skillBookId(character.sourceClass, skill.key)] ?? 0;
          const learned = lvl > 0;
          const maxed = lvl >= SKILL_MAX_LEVEL;
          const cost = learned ? SKILL_UPGRADE_COST : SKILL_STUDY_COST;
          const roll = lastRoll?.key === skill.key ? lastRoll : null;

          return (
            <div key={skill.key} className={`skill-card${learned ? '' : ' locked'}`}>
              <div className="skill-card-icon">
                <img src={skill.img} alt="" />
                <span className="skill-slot-key">{skill.key}</span>
              </div>
              <div className="skill-card-body">
                <div className="skill-card-name">
                  {skill.name} <small>{learned ? `ур. ${lvl}/${SKILL_MAX_LEVEL}` : 'не изучен'}</small>
                </div>
                <div className="skill-card-desc">
                  {skill.desc} · КД {skill.cd}с
                </div>
                <div className="skill-card-books">
                  <Icon name="book" size={12} /> Книг: {have}
                  {roll && (
                    <span className={roll.success ? 'roll-ok' : 'roll-fail'}>
                      {roll.success ? ' Успех!' : ' Неудача'}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="btn btn-primary"
                disabled={maxed || have < cost}
                onClick={() => {
                  if (learned) setLastRoll({ key: skill.key, success: actions.upgradeSkill(skill.key) });
                  else actions.learnSkill(skill.key);
                }}
              >
                {maxed ? 'Макс.' : learned ? `Улучшить (${cost})` : `Изучить (${cost})`}
              </button>
            </div>
          );
        })}
      </div>

      <h2 className="panel-subtitle">
        Улучшения <small>очков: {points}</small>
      </h2>
      <p className="panel-hint">3 очка за каждый уровень героя.</p>
      <div className="upgrade-list">
        {UPGRADE_KEYS.map((key) => (
          <div key={key} className="upgrade-row">
            <Icon name={UPGRADE_DEF[key].icon} size={18} className="upgrade-icon" />
            <span className="upgrade-name">
              {UPGRADE_DEF[key].label} <small>{UPGRADE_DEF[key].desc}</small>
            </span>
            <span className="upgrade-level">{state.upgrades[key]}</span>
            <button className="btn btn-small" disabled={points <= 0} onClick={() => actions.upgrade(key)}>
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
