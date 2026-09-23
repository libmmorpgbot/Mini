import { useEffect, useState, type RefObject } from 'react';
import { Icon } from './Icon';
import { BUFF_LABEL, type BuffStatus, type GameScene, type SkillStatus } from '../pixi/GameScene';

const POLL_MS = 200;

interface SkillBarProps {
  sceneRef: RefObject<GameScene | null>;
}

/** Q/W/E/R cooldowns, active buffs and the boss countdown, polled from the scene. */
export function SkillBar({ sceneRef }: SkillBarProps) {
  const [skills, setSkills] = useState<SkillStatus[]>([]);
  const [buffs, setBuffs] = useState<BuffStatus[]>([]);
  const [bossIn, setBossIn] = useState<number | null>(null);

  useEffect(() => {
    const poll = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      setSkills(scene.getSkillStatus());
      setBuffs(scene.getBuffStatus());
      setBossIn(scene.getKillsUntilBoss());
    };
    poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(timer);
  }, [sceneRef]);

  return (
    <>
      <div className="battle-info">
        {bossIn !== null && (
          <span className="battle-chip battle-chip-boss">
            <Icon name="skull" size={13} />
            {bossIn === 0 ? 'Босс идёт!' : `Босс через ${bossIn}`}
          </span>
        )}
        {buffs.map((b) => (
          <span key={b.buff} className="battle-chip battle-chip-buff">
            {BUFF_LABEL[b.buff]} {Math.ceil(b.secLeft)}с
          </span>
        ))}
      </div>

      <div className="skill-bar">
        {skills.map((s) => {
          const locked = s.level <= 0;
          const pct = s.cd > 0 ? (s.cdLeft / s.cd) * 100 : 0;
          return (
            <div key={s.key} className={`skill-slot${locked ? ' locked' : ''}`} title={s.name}>
              <img src={s.img} alt={s.name} />
              {!locked && s.cdLeft > 0 && (
                <div className="skill-slot-cd" style={{ height: `${pct}%` }}>
                  <span>{Math.ceil(s.cdLeft)}</span>
                </div>
              )}
              <span className="skill-slot-key">{s.key}</span>
              {locked ? <Icon name="lock" size={16} className="skill-slot-lock" /> : <span className="skill-slot-lvl">{s.level}</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}
