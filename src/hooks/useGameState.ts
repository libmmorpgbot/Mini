import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { CharacterClass, GameState } from '../types';

const BASE_SPEED = 1;
const BOOST_MULTIPLIER = 2;
const BOOST_DURATION_MS = 2000;
const BOOST_COOLDOWN_MS = 10000;
const SPEED_INCREASE_PER_LEVEL = 0.05;
const HEALTH_INCREASE_PER_LEVEL = 15;
const XP_PER_KILL = 20;
const XP_TO_NEXT_LEVEL = 100;
const GEMS_PER_LEVEL = 1;

type Action =
  | { type: 'KILL_MONSTER' }
  | { type: 'ACTIVATE_BOOST' }
  | { type: 'DEACTIVATE_BOOST' }
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
    boostActive: false,
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
    case 'ACTIVATE_BOOST':
      return { ...state, boostActive: true };
    case 'DEACTIVATE_BOOST':
      return { ...state, boostActive: false };
    case 'RESET':
      return createInitialState(action.baseHealth);
    default:
      return state;
  }
}

export function useGameState(character: CharacterClass) {
  const [state, dispatch] = useReducer(reducer, character.baseHealth, createInitialState);
  const [boostReady, setBoostReady] = useState(true);
  const boostTimeoutRef = useRef<number | undefined>(undefined);
  const cooldownTimeoutRef = useRef<number | undefined>(undefined);
  const characterIdRef = useRef(character.id);

  useEffect(() => {
    if (characterIdRef.current === character.id) return;
    characterIdRef.current = character.id;

    window.clearTimeout(boostTimeoutRef.current);
    window.clearTimeout(cooldownTimeoutRef.current);
    setBoostReady(true);
    dispatch({ type: 'RESET', baseHealth: character.baseHealth });
  }, [character.id, character.baseHealth]);

  const killMonster = useCallback(() => dispatch({ type: 'KILL_MONSTER' }), []);

  const activateBoost = useCallback(() => {
    setBoostReady((ready) => {
      if (!ready) return ready;

      dispatch({ type: 'ACTIVATE_BOOST' });

      boostTimeoutRef.current = window.setTimeout(() => {
        dispatch({ type: 'DEACTIVATE_BOOST' });
      }, BOOST_DURATION_MS);

      cooldownTimeoutRef.current = window.setTimeout(() => {
        setBoostReady(true);
      }, BOOST_COOLDOWN_MS);

      return false;
    });
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(boostTimeoutRef.current);
      window.clearTimeout(cooldownTimeoutRef.current);
    },
    []
  );

  const effectiveSpeed = state.speed * (state.boostActive ? BOOST_MULTIPLIER : 1);

  return { state, effectiveSpeed, killMonster, activateBoost, boostReady };
}
