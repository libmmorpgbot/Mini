import { useState } from 'react';
import type { CharacterClass, GameState, GearInstance } from '../types';
import type { GameApi } from '../hooks/useGameState';
import type { PlayerStats } from '../game/stats';
import {
  EQ_SLOTS,
  GEAR_BY_ID,
  INVENTORY_SIZE,
  POTION_BY_ID,
  RARITY_COLOR,
  RARITY_LABEL,
  SELL_PRICE,
  STAT_LABELS,
  canEquip,
  type GearDef,
} from '../data/items';
import { BOOK_BY_ID } from '../data/skills';

interface InventoryPanelProps {
  character: CharacterClass;
  state: GameState;
  stats: PlayerStats;
  actions: GameApi;
}

type Selection = { item: GearInstance; equipped: boolean } | null;

function ItemIcon({ def, onClick, dim }: { def: GearDef; onClick?: () => void; dim?: boolean }) {
  return (
    <button
      className={`item-cell${dim ? ' dim' : ''}`}
      style={{ borderColor: RARITY_COLOR[def.rarity], boxShadow: `inset 0 0 12px ${RARITY_COLOR[def.rarity]}55` }}
      onClick={onClick}
    >
      <img src={def.img} alt={def.name} />
    </button>
  );
}

function StatLines({ def }: { def: GearDef }) {
  return (
    <ul className="item-stats">
      {STAT_LABELS.filter((s) => def[s.key]).map((s) => (
        <li key={s.key}>
          {s.label} <b>{s.format(def[s.key] as number)}</b>
        </li>
      ))}
    </ul>
  );
}

export function InventoryPanel({ character, state, stats, actions }: InventoryPanelProps) {
  const [selected, setSelected] = useState<Selection>(null);
  const selectedDef = selected ? GEAR_BY_ID[selected.item.id] : null;
  const compareWith = selectedDef && !selected?.equipped ? state.equipment[selectedDef.slot] : undefined;

  const potions = Object.entries(state.potions).filter(([id]) => POTION_BY_ID[id]);
  const books = Object.entries(state.books).filter(([id]) => BOOK_BY_ID[id]);

  return (
    <div className="inv-panel">
      <h1 className="panel-title">Инвентарь</h1>

      <div className="inv-equipment">
        {EQ_SLOTS.map(({ slot, label, emptyIcon }) => {
          const item = state.equipment[slot];
          const def = item && GEAR_BY_ID[item.id];
          return (
            <div key={slot} className="inv-slot">
              {def && item ? (
                <ItemIcon def={def} onClick={() => setSelected({ item, equipped: true })} />
              ) : (
                <div className="item-cell empty">{emptyIcon}</div>
              )}
              <span className="inv-slot-label">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="inv-stats">
        <span>⚔️ {stats.atk}</span>
        <span>🛡️ {stats.def}</span>
        <span>❤️ {stats.maxHp}</span>
        <span>⭐ {Math.round(stats.critChance * 100)}%</span>
        <span>💥 ×{stats.critPower.toFixed(2)}</span>
        <span>⚡ {stats.atkSpeed.toFixed(2)}/с</span>
      </div>

      <h2 className="panel-subtitle">
        Сумка <small>{state.inventory.length}/{INVENTORY_SIZE}</small>
      </h2>
      {state.inventory.length === 0 ? (
        <p className="panel-hint">Пусто. Снаряжение выпадает с монстров — чем выше уровень, тем реже и ценнее.</p>
      ) : (
        <div className="inv-grid">
          {state.inventory.map((item) => {
            const def = GEAR_BY_ID[item.id];
            return (
              <ItemIcon
                key={item.uid}
                def={def}
                dim={!canEquip(def, character.sourceClass)}
                onClick={() => setSelected({ item, equipped: false })}
              />
            );
          })}
        </div>
      )}

      {(potions.length > 0 || books.length > 0) && <h2 className="panel-subtitle">Расходники</h2>}
      <div className="inv-consumables">
        {potions.map(([id, qty]) => (
          <button key={id} className="consumable" onClick={() => actions.usePotion(id)}>
            <img src={POTION_BY_ID[id].img} alt="" />
            <span>
              {POTION_BY_ID[id].name} ×{qty}
              <small>+{POTION_BY_ID[id].hp} HP · нажмите, чтобы выпить</small>
            </span>
          </button>
        ))}
        {books.map(([id, qty]) => (
          <div key={id} className="consumable">
            <img src={BOOK_BY_ID[id].img} alt="" />
            <span>
              {BOOK_BY_ID[id].name} ×{qty}
              <small>Изучается во вкладке «Навыки»</small>
            </span>
          </div>
        ))}
      </div>

      {selected && selectedDef && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <ItemIcon def={selectedDef} />
              <div>
                <div className="sheet-name" style={{ color: RARITY_COLOR[selectedDef.rarity] }}>
                  {selectedDef.name}
                </div>
                <div className="sheet-sub">
                  {RARITY_LABEL[selectedDef.rarity]} · {EQ_SLOTS.find((s) => s.slot === selectedDef.slot)?.label}
                </div>
              </div>
            </div>
            <StatLines def={selectedDef} />
            {compareWith && (
              <div className="sheet-compare">
                <div className="sheet-sub">Сейчас надето: {GEAR_BY_ID[compareWith.id].name}</div>
                <StatLines def={GEAR_BY_ID[compareWith.id]} />
              </div>
            )}
            {!canEquip(selectedDef, character.sourceClass) && (
              <p className="panel-hint">Этот предмет не подходит вашему классу.</p>
            )}

            <div className="sheet-actions">
              {selected.equipped ? (
                <button
                  className="btn"
                  disabled={state.inventory.length >= INVENTORY_SIZE}
                  onClick={() => {
                    actions.unequip(selectedDef.slot);
                    setSelected(null);
                  }}
                >
                  Снять
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    disabled={!canEquip(selectedDef, character.sourceClass)}
                    onClick={() => {
                      actions.equip(selected.item.uid);
                      setSelected(null);
                    }}
                  >
                    Надеть
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      actions.sell(selected.item.uid);
                      setSelected(null);
                    }}
                  >
                    Продать за {SELL_PRICE[selectedDef.rarity]} 💰
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
