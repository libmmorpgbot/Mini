import { Icon, type IconName } from './Icon';

export const NAV_TABS = [
  { id: 'game', icon: 'swords', label: 'Бой' },
  { id: 'map', icon: 'map', label: 'Карта' },
  { id: 'bag', icon: 'bag', label: 'Сумка' },
  { id: 'skills', icon: 'book', label: 'Навыки' },
  { id: 'shop', icon: 'shop', label: 'Лавка' },
  { id: 'heroes', icon: 'crown', label: 'Герои' },
  { id: 'profile', icon: 'user', label: 'Профиль' },
] as const satisfies readonly { id: string; icon: IconName; label: string }[];

export type TabId = (typeof NAV_TABS)[number]['id'];

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  /** Tabs that show a "something to do here" dot. */
  badges?: Partial<Record<TabId, boolean>>;
}

export function BottomNav({ active, onChange, badges = {} }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {NAV_TABS.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav-item${tab.id === active ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav-icon">
            <Icon name={tab.icon} size={22} />
            {badges[tab.id] && <span className="bottom-nav-dot" />}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
