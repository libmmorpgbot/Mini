import { useEffect, useMemo, useRef, useState } from 'react';
import { GameScene } from './pixi/GameScene';
import { HUD } from './components/HUD';
import { CharacterSelect } from './components/CharacterSelect';
import { BottomNav, type TabId } from './components/BottomNav';
import { StubPanel, ProfilePanel } from './components/InfoPanels';
import { MapPanel } from './components/MapPanel';
import { useGameState } from './hooks/useGameState';
import { useTelegram } from './hooks/useTelegram';
import { CHARACTERS } from './data/characters';
import { LOCATIONS, getLocationForLevel } from './data/locations';
import type { CharacterClass } from './types';
import './App.css';

interface GameShellProps {
  character: CharacterClass;
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  onChangeCharacter: (character: CharacterClass) => void;
}

function GameShell({ character, activeTab, onChangeTab, onChangeCharacter }: GameShellProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const { state, killMonster, takeDamage, regen } = useGameState(character);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const activeLocation = useMemo(
    () => LOCATIONS.find((l) => l.id === selectedLocationId) ?? getLocationForLevel(state.level),
    [selectedLocationId, state.level]
  );

  useEffect(() => {
    if (!hostRef.current) return;

    const scene = new GameScene(hostRef.current, character, {
      onMonsterKilled: killMonster,
      onMonsterEscaped: () => {},
      onPlayerDamaged: takeDamage,
      onPlayerRegen: regen,
    });
    sceneRef.current = scene;

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  useEffect(() => {
    sceneRef.current?.setSpeedMultiplier(state.speed);
  }, [state.speed]);

  useEffect(() => {
    sceneRef.current?.setLevel(state.level);
  }, [state.level]);

  useEffect(() => {
    sceneRef.current?.setPlayerHealth(state.health, state.maxHealth);
  }, [state.health, state.maxHealth]);

  useEffect(() => {
    sceneRef.current?.setLocation(activeLocation.id);
  }, [activeLocation.id]);

  return (
    <div className="app-root">
      <HUD character={character} state={state} speed={state.speed} />

      <div className="game-content">
        <div className="game-host" ref={hostRef} hidden={activeTab !== 'game'} />

        {activeTab === 'heroes' && (
          <div className="tab-panel">
            <CharacterSelect
              characters={CHARACTERS}
              selectedId={character.id}
              title="Смена героя"
              subtitle="Прогресс текущего забега начнётся заново"
              confirmLabel={(c) => `Выбрать ${c.nameAccusative}`}
              onConfirm={(next) => {
                onChangeCharacter(next);
                onChangeTab('game');
              }}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="tab-panel">
            <MapPanel
              locations={LOCATIONS}
              playerLevel={state.level}
              activeLocationId={activeLocation.id}
              onSelect={(id) => {
                setSelectedLocationId(id);
                onChangeTab('game');
              }}
            />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="tab-panel">
            <StubPanel icon="🛒" title="Магазин" text="Здесь скоро появятся предметы и улучшения для героев." />
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="tab-panel">
            <StubPanel icon="🏆" title="Рейтинг" text="Скоро здесь появится таблица лидеров." />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-panel">
            <ProfilePanel character={character} state={state} />
          </div>
        )}
      </div>

      <BottomNav active={activeTab} onChange={onChangeTab} />
    </div>
  );
}

function App() {
  const [character, setCharacter] = useState<CharacterClass | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('game');
  useTelegram();

  if (!character) {
    return (
      <div className="char-select-screen">
        <CharacterSelect characters={CHARACTERS} onConfirm={setCharacter} />
      </div>
    );
  }

  return (
    <GameShell
      character={character}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      onChangeCharacter={setCharacter}
    />
  );
}

export default App;
