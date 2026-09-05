import { useEffect, useRef, useState } from 'react';
import { GameScene } from './pixi/GameScene';
import { HUD } from './components/HUD';
import { Controls } from './components/Controls';
import { CharacterSelect } from './components/CharacterSelect';
import { BottomNav, type TabId } from './components/BottomNav';
import { StubPanel, ProfilePanel } from './components/InfoPanels';
import { useGameState } from './hooks/useGameState';
import { useTelegram } from './hooks/useTelegram';
import { CHARACTERS } from './data/characters';
import type { CharacterClass } from './types';
import './App.css';

interface GameShellProps {
  character: CharacterClass;
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  onChangeCharacter: (character: CharacterClass) => void;
  onClose: () => void;
}

function GameShell({ character, activeTab, onChangeTab, onChangeCharacter, onClose }: GameShellProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const { state, effectiveSpeed, killMonster, takeDamage, regen, activateBoost, boostReady } =
    useGameState(character);

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
    sceneRef.current?.setSpeedMultiplier(effectiveSpeed);
  }, [effectiveSpeed]);

  useEffect(() => {
    sceneRef.current?.setLevel(state.level);
  }, [state.level]);

  return (
    <div className="app-root">
      <div className="topbar">
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <HUD character={character} state={state} speed={effectiveSpeed} />

      <div className="game-content">
        <div className="game-host" ref={hostRef} hidden={activeTab !== 'game'} />

        {activeTab === 'game' && <Controls onBoost={activateBoost} boostReady={boostReady} />}

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
  const { close } = useTelegram();

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
      onClose={close}
    />
  );
}

export default App;
