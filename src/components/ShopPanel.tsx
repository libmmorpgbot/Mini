import type { GameState } from '../types';
import type { GameApi } from '../hooks/useGameState';
import { MERCHANT_SHOP, POTION_BY_ID } from '../data/items';
import { Icon } from './Icon';

interface ShopPanelProps {
  state: GameState;
  actions: GameApi;
}

const BUY_AMOUNTS = [1, 10];

export function ShopPanel({ state, actions }: ShopPanelProps) {
  return (
    <div className="shop-panel">
      <h1 className="panel-title">Лавка торговца</h1>
      <p className="panel-hint">Зелья пьются сами, когда здоровье падает ниже 30%.</p>
      <div className="consumables-list">
        {MERCHANT_SHOP.map(({ itemId, price }) => {
          const potion = POTION_BY_ID[itemId];
          return (
            <div key={itemId} className="consumable">
              <img src={potion.img} alt="" />
              <span>
                {potion.name} <small>+{potion.hp} HP · в сумке: {state.potions[itemId] ?? 0}</small>
              </span>
              {BUY_AMOUNTS.map((qty) => (
                <button
                  key={qty}
                  className="btn btn-small"
                  disabled={state.gold < price * qty}
                  onClick={() => actions.buy(itemId, qty)}
                >
                  ×{qty} · {price * qty} <Icon name="coin" size={13} className="tint-gold" />
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
