import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { GameState } from '../types';

const BASE_SPEED = 1;
const BOOST_MULTIPLIER = 2;
const BOOST_DURATION_MS = 2000;
const BOOST_COOLDOWN_MS = 10000;
const KILLS_PER_LEVEL = 5;
const SPEED_INCREASE_PER_LEVEL = 0.05;

type Action = { type: 'KILL_MONSTER' } | { type: 'ACTIVATE_BOOST' } | { type: 'DEACTIVATE_BOOST' };

const initialState: GameState = {
  gold: 0,
  level: 1,
  kills: 0,
  speed: BASE_SPEED,
  boostActive: false,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'KILL_MONSTER': {
      const kills = state.kills + 1;
      const gold = state.gold + 1;
      if (kills % KILLS_PER_LEVEL === 0) {
        return {
          ...state,
          kills,
          gold,
          level: state.level + 1,
          speed: state.speed * (1 + SPEED_INCREASE_PER_LEVEL),
        };
      }
      return { ...state, kills, gold };
    }
    case 'ACTIVATE_BOOST':
      return { ...state, boostActive: true };
    case 'DEACTIVATE_BOOST':
      return { ...state, boostActive: false };
    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [boostReady, setBoostReady] = useState(true);
  const boostTimeoutRef = useRef<number | undefined>(undefined);
  const cooldownTimeoutRef = useRef<number | undefined>(undefined);

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
