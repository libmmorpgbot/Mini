import type { Rarity } from '../data/gameRules';
import { RARITY_COLOR } from '../data/items';

export interface DropEntry {
  id: number;
  name: string;
  img: string;
  rarity: Rarity;
}

/** Recent loot, newest on top, over the game view. */
export function DropFeed({ drops }: { drops: DropEntry[] }) {
  if (!drops.length) return null;
  return (
    <div className="drop-feed">
      {drops.map((d) => (
        <div key={d.id} className="drop-feed-item" style={{ borderColor: RARITY_COLOR[d.rarity] }}>
          <img className="drop-feed-icon" src={d.img} alt="" />
          <span style={{ color: RARITY_COLOR[d.rarity] }}>{d.name}</span>
        </div>
      ))}
    </div>
  );
}
