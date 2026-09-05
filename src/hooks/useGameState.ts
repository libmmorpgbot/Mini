import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { CharacterClass, GameState } from '../types';

const BASE_SPEED = 1;
const SPEED_INCREASE_PER_LEVEL = 0.05;
const HEALTH_INCREASE_PER_LEVEL = 15;
const XP_PER_KILL = 20;
const XP_TO_NEXT_LEVEL = 100;
const GEMS_PER_LEVEL = 1;

type Action =
  | { type: 'KILL_MONSTER' }
  | { type: 'TAKE_DAMAGE'; amount: number }
  | { type: 'REGEN'; amount: number }
  | { type: 'RESET'; baseHealth: number };

function createInitialState(baseHealth: number): GameState {
  return {
    baseHealth,
    gold: 0,
    gems: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: XP_TO_NEXT_LEVEL,
    health: baseHealth,
    maxHealth: baseHealth,
    speed: BASE_SPEED,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'KILL_MONSTER': {
      let { gold, gems, level, xp, health, maxHealth, speed } = state;
      gold += 1;
      xp += XP_PER_KILL;

      while (xp >= state.xpToNextLevel) {
        xp -= state.xpToNextLevel;
        level += 1;
        speed *= 1 + SPEED_INCREASE_PER_LEVEL;
        gems += GEMS_PER_LEVEL;
        maxHealth = state.baseHealth + (level - 1) * HEALTH_INCREASE_PER_LEVEL;
        health = maxHealth;
      }

      return { ...state, gold, gems, level, xp, health, maxHealth, speed };
    }
    case 'TAKE_DAMAGE': {
      const health = state.health - action.amount;
      // A hit that would be lethal instead knocks the hero back to full health --
      // combat has real stakes (the bar visibly drops) without a punishing death/respawn flow.
      return { ...state, health: health <= 0 ? state.maxHealth : health };
    }
    case 'REGEN':
      return { ...state, health: Math.min(state.maxHealth, state.health + action.amount) };
    case 'RESET':
      return createInitialState(action.baseHealth);
    default:
      return state;
  }
}

export function useGameState(character: CharacterClass) {
  const [state, dispatch] = useReducer(reducer, character.baseHealth, createInitialState);
  const characterIdRef = useRef(character.id);

  useEffect(() => {
    if (characterIdRef.current === character.id) return;
    characterIdRef.current = character.id;
    dispatch({ type: 'RESET', baseHealth: character.baseHealth });
  }, [character.id, character.baseHealth]);

  const killMonster = useCallback(() => dispatch({ type: 'KILL_MONSTER' }), []);
  const takeDamage = useCallback((amount: number) => dispatch({ type: 'TAKE_DAMAGE', amount }), []);
  const regen = useCallback((amount: number) => dispatch({ type: 'REGEN', amount }), []);

  return { state, killMonster, takeDamage, regen };
}
