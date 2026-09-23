// Active skills ported from libmmorpgbot-'s SKILL_DEF (js/definitions.js) and
// SKILL_DMG_MULT (shared/definitions.js). Every class has Q/W/E/R; a skill is
// learned and levelled with its own book, exactly like the original. Here
// they are cast automatically during a run, as soon as they come off cooldown.
//
// Movement skills (jumps, teleports) turn into "push the monsters back by the
// same distance" -- in a side-scroller that is the same thing as leaping away.
import type { SkillKey } from './gameRules';

const ICONS = import.meta.glob('../assets/skills/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const icon = (file: string) => ICONS[`../assets/skills/${file}.png`];

export type BuffKind = 'atkPct' | 'defPct' | 'critChance' | 'atkSpeedMult' | 'lifesteal' | 'runSpeedMult';

export type SkillEffect =
  /** Hits the engaged monster `hits` times for `mult` × damage, optionally stunning it. */
  | { kind: 'hit'; mult: number; hits?: number; stunSec?: number; projectile?: boolean }
  /** One `mult` × hit on each of the `targets` nearest monsters. */
  | { kind: 'multi'; mult: number; targets: number }
  /** Hits every monster within `radius` px of the hero. */
  | { kind: 'aoe'; mult: number; radius: number; stunSec?: number }
  /** Timed self-buff; lasts `sec` + 1 second per skill level. */
  | { kind: 'buff'; buff: BuffKind; value: number; sec: number }
  /** Leap away from the fight: every monster in range is pushed back `px`. */
  | { kind: 'leap'; px: number };

export interface SkillDef {
  key: SkillKey;
  name: string;
  img: string;
  /** Cooldown, seconds. */
  cd: number;
  desc: string;
  effect: SkillEffect;
}

export const SKILL_DEF: Record<string, SkillDef[]> = {
  lev: [
    { key: 'Q', name: 'Ледяной удар', img: icon('wstun_v2'), cd: 18, desc: '×2 урон по цели + стан 3 сек', effect: { kind: 'hit', mult: 2, stunSec: 3 } },
    { key: 'W', name: 'Смерч клинков', img: icon('wvixr_v2'), cd: 12, desc: 'АОЕ урон, радиус 110', effect: { kind: 'aoe', mult: 1, radius: 110 } },
    { key: 'E', name: 'Гнев мертвеца', img: icon('wboevoy_v2'), cd: 20, desc: '+80% защиты на 10 сек', effect: { kind: 'buff', buff: 'defPct', value: 0.8, sec: 10 } },
    { key: 'R', name: 'Рывок света', img: icon('wrivok_v2'), cd: 15, desc: 'Прыгает к цели нанося ×1.5 урона', effect: { kind: 'hit', mult: 1.5 } },
  ],
  deathknight: [
    { key: 'Q', name: 'Вампиризм', img: icon('adim_v2'), cd: 28, desc: 'Вампиризм 10% от удара на 10 сек', effect: { kind: 'buff', buff: 'lifesteal', value: 0.1, sec: 10 } },
    { key: 'W', name: 'Вихрь клинка', img: icon('asmertudar'), cd: 12, desc: 'АОЕ урон, радиус 110', effect: { kind: 'aoe', mult: 1, radius: 110 } },
    { key: 'E', name: 'Ярость', img: icon('ainvidible_v2'), cd: 20, desc: '+20% атака на 5 сек', effect: { kind: 'buff', buff: 'atkPct', value: 0.2, sec: 5 } },
    { key: 'R', name: 'Кувырок', img: icon('audarteni'), cd: 15, desc: 'Прыгает к цели нанося ×1.5 урона', effect: { kind: 'hit', mult: 1.5 } },
  ],
  ranger: [
    { key: 'Q', name: 'Мульти-выстрел', img: icon('lmulti'), cd: 6, desc: '3 стрелы по разным целям', effect: { kind: 'multi', mult: 1, targets: 3 } },
    { key: 'W', name: 'Комбо стрела', img: icon('lkombo'), cd: 10, desc: '3 стрелы ×1 урон', effect: { kind: 'hit', mult: 1, hits: 3, projectile: true } },
    { key: 'E', name: 'Прыжок', img: icon('lprijok'), cd: 8, desc: 'Рывок 160px от врагов', effect: { kind: 'leap', px: 160 } },
    { key: 'R', name: 'Скорость атаки', img: icon('latkspeed'), cd: 20, desc: '×1.5 скорость атаки на 5 сек', effect: { kind: 'buff', buff: 'atkSpeedMult', value: 1.5, sec: 5 } },
  ],
  mage: [
    { key: 'Q', name: 'Ледяной шар', img: icon('mshar_v2'), cd: 5, desc: 'Снаряд ×2 урона', effect: { kind: 'hit', mult: 2, projectile: true } },
    { key: 'W', name: 'Ледяная нова', img: icon('mnova'), cd: 10, desc: 'АОЕ урон 130 + заморозка 3 сек', effect: { kind: 'aoe', mult: 1, radius: 130, stunSec: 3 } },
    { key: 'E', name: 'Барьер', img: icon('mbarier'), cd: 18, desc: 'Защита +50% на 3 сек', effect: { kind: 'buff', buff: 'defPct', value: 0.5, sec: 3 } },
    { key: 'R', name: 'Телепорт', img: icon('mteleport'), cd: 12, desc: 'Рывок 360px от врагов', effect: { kind: 'leap', px: 360 } },
  ],
  assassin: [
    { key: 'Q', name: 'Шепот смерти', img: icon('as_whisper'), cd: 20, desc: 'Удар ×3 урона', effect: { kind: 'hit', mult: 3 } },
    { key: 'W', name: 'Буйство', img: icon('as_rampage'), cd: 8, desc: 'АОЕ ×2 урона, радиус 120', effect: { kind: 'aoe', mult: 2, radius: 120 } },
    { key: 'E', name: 'Пронзание', img: icon('as_pierce'), cd: 30, desc: '+50% шанс крита на 5 сек', effect: { kind: 'buff', buff: 'critChance', value: 0.5, sec: 5 } },
    { key: 'R', name: 'Бегство', img: icon('as_flee'), cd: 20, desc: '×2 скорость бега на 5 сек', effect: { kind: 'buff', buff: 'runSpeedMult', value: 2, sec: 5 } },
  ],
};

export function skillBookId(sourceClass: string, key: SkillKey): string {
  return `book_${sourceClass}_${key}`;
}

export interface BookDef {
  id: string;
  name: string;
  img: string;
  sourceClass: string;
  key: SkillKey;
}

export const BOOK_DEF: BookDef[] = Object.entries(SKILL_DEF).flatMap(([sourceClass, skills]) =>
  skills.map((s) => ({ id: skillBookId(sourceClass, s.key), name: `Книга: ${s.name}`, img: s.img, sourceClass, key: s.key }))
);

export const BOOK_BY_ID: Record<string, BookDef> = Object.fromEntries(BOOK_DEF.map((b) => [b.id, b]));
