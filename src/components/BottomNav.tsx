export const NAV_TABS = [
  { id: 'game', icon: '🎮', label: 'Игра' },
  { id: 'heroes', icon: '🦸', label: 'Герои' },
  { id: 'shop', icon: '🛒', label: 'Магазин' },
  { id: 'ranking', icon: '🏆', label: 'Рейтинг' },
  { id: 'profile', icon: '👤', label: 'Профиль' },
] as const;

export type TabId = (typeof NAV_TABS)[number]['id'];

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {NAV_TABS.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav-item${tab.id === active ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
