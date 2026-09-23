export const NAV_TABS = [
  { id: 'game', icon: '🎮', label: 'Игра' },
  { id: 'map', icon: '🗺️', label: 'Карта' },
  { id: 'bag', icon: '🎒', label: 'Сумка' },
  { id: 'skills', icon: '📖', label: 'Навыки' },
  { id: 'shop', icon: '🛒', label: 'Магазин' },
  { id: 'heroes', icon: '🦸', label: 'Герои' },
  { id: 'profile', icon: '👤', label: 'Профиль' },
] as const;

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
            {tab.icon}
            {badges[tab.id] && <span className="bottom-nav-dot" />}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
