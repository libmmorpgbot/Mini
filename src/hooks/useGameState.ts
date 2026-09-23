import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { CharacterClass, GameState, GearInstance } from '../types';
import { CHARACTERS } from '../data/characters';
import {
  SKILL_MAX_LEVEL,
  SKILL_STUDY_COST,
  SKILL_UPGRADE_CHANCE,
  SKILL_UPGRADE_COST,
  UPGRADE_KEYS,
  type SkillKey,
  type UpgradeKey,
} from '../data/gameRules';
import { GEAR_BY_ID, INVENTORY_SIZE, MERCHANT_SHOP, POTION_BY_ID, SELL_PRICE, canEquip } from '../data/items';
import { skillBookId } from '../data/skills';
import { availableSkillPoints, computeStats, xpToNextLevel } from '../game/stats';
import type { Loot } from '../game/loot';

const SPEED_INCREASE_PER_LEVEL = 0.05;
const GEMS_PER_LEVEL = 1;
/** Below this share of max HP a potion is drunk automatically. */
const AUTO_POTION_THRESHOLD = 0.3;
const SAVE_KEY_PREFIX = 'mini-rpg-save-v2:';

type Action =
  | { type: 'KILL'; xp: number; loot: Loot }
  | { type: 'TAKE_DAMAGE'; amount: number }
  | { type: 'HEAL'; amount: number }
  | { type: 'EQUIP'; uid: number }
  | { type: 'UNEQUIP'; slot: keyof GameState['equipment'] }
  | { type: 'SELL'; uid: number }
  | { type: 'BUY'; itemId: string; qty: number }
  | { type: 'USE_POTION'; itemId: string }
  | { type: 'UPGRADE'; key: UpgradeKey }
  | { type: 'LEARN_SKILL'; key: SkillKey }
  /** `success` is rolled by the caller so the reducer stays pure. */
  | { type: 'UPGRADE_SKILL'; key: SkillKey; success: boolean }
  | { type: 'LOAD'; state: GameState };

function characterOf(state: GameState): CharacterClass {
  return CHARACTERS.find((c) => c.id === state.classId) ?? CHARACTERS[0];
}

function createInitialState(character: CharacterClass): GameState {
  const base: GameState = {
    classId: character.id,
    gold: 0,
    gems: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: xpToNextLevel(1),
    health: 0,
    maxHealth: 0,
    speed: 1,
    upgrades: Object.fromEntries(UPGRADE_KEYS.map((k) => [k, 0])) as Record<UpgradeKey, number>,
    skillLevels: { Q: 0, W: 0, E: 0, R: 0 },
    inventory: [],
    equipment: {},
    books: {},
    potions: {},
    kills: 0,
    nextUid: 1,
  };
  const maxHealth = computeStats(character, base).maxHp;
  return { ...base, health: maxHealth, maxHealth };
}

/** Recomputes max HP after anything that changes it; a raised cap also raises current HP by the same amount. */
function withStats(state: GameState): GameState {
  const maxHealth = computeStats(characterOf(state), state).maxHp;
  if (maxHealth === state.maxHealth) return state;
  const health = Math.min(maxHealth, state.health + Math.max(0, maxHealth - state.maxHealth));
  return { ...state, maxHealth, health };
}

function addCount(map: Record<string, number>, id: string, qty: number): Record<string, number> {
  const next = { ...map, [id]: Math.max(0, (map[id] ?? 0) + qty) };
  if (next[id] === 0) delete next[id];
  return next;
}

function autoDrinkPotion(state: GameState): GameState {
  if (state.health >= state.maxHealth * AUTO_POTION_THRESHOLD) return state;
  // Big potion when the gap is worth it, otherwise the small one.
  const missing = state.maxHealth - state.health;
  const order = missing >= 250 ? ['pt2', 'pt1'] : ['pt1', 'pt2'];
  const id = order.find((p) => (state.potions[p] ?? 0) > 0);
  if (!id) return state;
  return {
    ...state,
    potions: addCount(state.potions, id, -1),
    health: Math.min(state.maxHealth, state.health + POTION_BY_ID[id].hp),
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'KILL': {
      let { level, xp, gems, speed, xpToNextLevel: need, nextUid } = state;
      xp += action.xp;
      let leveled = false;
      while (xp >= need) {
        xp -= need;
        level += 1;
        need = xpToNextLevel(level);
        speed *= 1 + SPEED_INCREASE_PER_LEVEL;
        gems += GEMS_PER_LEVEL;
        leveled = true;
      }

      const inventory = [...state.inventory];
      for (const id of action.loot.gear) {
        if (inventory.length >= INVENTORY_SIZE) break;
        inventory.push({ uid: nextUid++, id });
      }
      let books = state.books;
      for (const [id, qty] of Object.entries(action.loot.books)) books = addCount(books, id, qty);

      let next: GameState = {
        ...state,
        level,
        xp,
        xpToNextLevel: need,
        gems,
        speed,
        gold: state.gold + action.loot.gold,
        inventory,
        books,
        nextUid,
        kills: state.kills + 1,
      };
      next = withStats(next);
      // A level-up heals to full, as before.
      if (leveled) next = { ...next, health: next.maxHealth };
      return next;
    }
    case 'TAKE_DAMAGE': {
      const health = state.health - action.amount;
      // A hit that would be lethal instead knocks the hero back to full health --
      // combat has real stakes (the bar visibly drops) without a punishing death/respawn flow.
      if (health <= 0) return { ...state, health: state.maxHealth };
      return autoDrinkPotion({ ...state, health });
    }
    case 'HEAL':
      return { ...state, health: Math.min(state.maxHealth, state.health + action.amount) };
    case 'EQUIP': {
      const item = state.inventory.find((i) => i.uid === action.uid);
      const def = item && GEAR_BY_ID[item.id];
      if (!item || !def || !canEquip(def, characterOf(state).sourceClass)) return state;
      const inventory = state.inventory.filter((i) => i.uid !== action.uid);
      const previous = state.equipment[def.slot];
      if (previous) inventory.push(previous);
      return withStats({ ...state, inventory, equipment: { ...state.equipment, [def.slot]: item } });
    }
    case 'UNEQUIP': {
      const item = state.equipment[action.slot];
      if (!item || state.inventory.length >= INVENTORY_SIZE) return state;
      const equipment = { ...state.equipment };
      delete equipment[action.slot];
      return withStats({ ...state, equipment, inventory: [...state.inventory, item] });
    }
    case 'SELL': {
      const item = state.inventory.find((i) => i.uid === action.uid);
      const def = item && GEAR_BY_ID[item.id];
      if (!item || !def) return state;
      return {
        ...state,
        gold: state.gold + SELL_PRICE[def.rarity],
        inventory: state.inventory.filter((i) => i.uid !== action.uid),
      };
    }
    case 'BUY': {
      const offer = MERCHANT_SHOP.find((o) => o.itemId === action.itemId);
      const cost = offer ? offer.price * action.qty : Infinity;
      if (!offer || action.qty <= 0 || state.gold < cost) return state;
      return { ...state, gold: state.gold - cost, potions: addCount(state.potions, action.itemId, action.qty) };
    }
    case 'USE_POTION': {
      const potion = POTION_BY_ID[action.itemId];
      if (!potion || (state.potions[action.itemId] ?? 0) <= 0 || state.health >= state.maxHealth) return state;
      return {
        ...state,
        potions: addCount(state.potions, action.itemId, -1),
        health: Math.min(state.maxHealth, state.health + potion.hp),
      };
    }
    case 'UPGRADE': {
      if (availableSkillPoints(state) <= 0) return state;
      return withStats({ ...state, upgrades: { ...state.upgrades, [action.key]: state.upgrades[action.key] + 1 } });
    }
    case 'LEARN_SKILL': {
      const bookId = skillBookId(characterOf(state).sourceClass, action.key);
      if (state.skillLevels[action.key] > 0 || (state.books[bookId] ?? 0) < SKILL_STUDY_COST) return state;
      return {
        ...state,
        books: addCount(state.books, bookId, -SKILL_STUDY_COST),
        skillLevels: { ...state.skillLevels, [action.key]: 1 },
      };
    }
    case 'UPGRADE_SKILL': {
      const bookId = skillBookId(characterOf(state).sourceClass, action.key);
      const lvl = state.skillLevels[action.key];
      if (lvl <= 0 || lvl >= SKILL_MAX_LEVEL || (state.books[bookId] ?? 0) < SKILL_UPGRADE_COST) return state;
      return {
        ...state,
        books: addCount(state.books, bookId, -SKILL_UPGRADE_COST),
        skillLevels: action.success ? { ...state.skillLevels, [action.key]: lvl + 1 } : state.skillLevels,
      };
    }
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}

function loadSave(character: CharacterClass): GameState {
  const fresh = createInitialState(character);
  try {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + character.id);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<GameState>;
    // Merge over a fresh state so saves from older versions pick up new fields.
    const merged: GameState = {
      ...fresh,
      ...saved,
      classId: character.id,
      xpToNextLevel: xpToNextLevel(saved.level ?? 1),
      upgrades: { ...fresh.upgrades, ...saved.upgrades },
      skillLevels: { ...fresh.skillLevels, ...saved.skillLevels },
      inventory: (saved.inventory ?? []).filter((i: GearInstance) => GEAR_BY_ID[i.id]),
      equipment: Object.fromEntries(
        Object.entries(saved.equipment ?? {}).filter(([, i]) => i && GEAR_BY_ID[(i as GearInstance).id])
      ),
    };
    const maxHealth = computeStats(character, merged).maxHp;
    return { ...merged, maxHealth, health: Math.min(maxHealth, merged.health > 0 ? merged.health : maxHealth) };
  } catch {
    return fresh;
  }
}

function writeSave(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY_PREFIX + state.classId, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode) -- progress just isn't kept.
  }
}

export function useGameState(character: CharacterClass) {
  const [state, dispatch] = useReducer(reducer, character, loadSave);
  const characterIdRef = useRef(character.id);

  useEffect(() => {
    if (characterIdRef.current === character.id) return;
    characterIdRef.current = character.id;
    dispatch({ type: 'LOAD', state: loadSave(character) });
  }, [character]);

  useEffect(() => {
    if (state.classId === character.id) writeSave(state);
  }, [state, character.id]);

  const stats = useMemo(() => computeStats(character, state), [character, state]);

  const actions = useMemo(
    () => ({
      kill: (xp: number, loot: Loot) => dispatch({ type: 'KILL', xp, loot }),
      takeDamage: (amount: number) => dispatch({ type: 'TAKE_DAMAGE', amount }),
      heal: (amount: number) => dispatch({ type: 'HEAL', amount }),
      equip: (uid: number) => dispatch({ type: 'EQUIP', uid }),
      unequip: (slot: keyof GameState['equipment']) => dispatch({ type: 'UNEQUIP', slot }),
      sell: (uid: number) => dispatch({ type: 'SELL', uid }),
      buy: (itemId: string, qty: number) => dispatch({ type: 'BUY', itemId, qty }),
      usePotion: (itemId: string) => dispatch({ type: 'USE_POTION', itemId }),
      upgrade: (key: UpgradeKey) => dispatch({ type: 'UPGRADE', key }),
      learnSkill: (key: SkillKey) => dispatch({ type: 'LEARN_SKILL', key }),
      upgradeSkill: (key: SkillKey): boolean => {
        const success = Math.random() < SKILL_UPGRADE_CHANCE;
        dispatch({ type: 'UPGRADE_SKILL', key, success });
        return success;
      },
    }),
    []
  );

  return { state, stats, ...actions };
}

export type GameApi = ReturnType<typeof useGameState>;
