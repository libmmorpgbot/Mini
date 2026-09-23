import { useEffect, useMemo, useRef, useState } from 'react';
import { GameScene } from './pixi/GameScene';
import { HUD } from './components/HUD';
import { CharacterSelect } from './components/CharacterSelect';
import { BottomNav, type TabId } from './components/BottomNav';
import { ProfilePanel } from './components/InfoPanels';
import { MapPanel } from './components/MapPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { SkillsPanel } from './components/SkillsPanel';
import { ShopPanel } from './components/ShopPanel';
import { SkillBar } from './components/SkillBar';
import { DropFeed, type DropEntry } from './components/DropFeed';
import { useGameState } from './hooks/useGameState';
import { useTelegram } from './hooks/useTelegram';
import { Icon } from './components/Icon';
import { CHARACTERS } from './data/characters';
import { LOCATIONS, getLocationForLevel } from './data/locations';
import { GEAR_BY_ID } from './data/items';
import { BOOK_BY_ID } from './data/skills';
import { rollLoot } from './game/loot';
import { availableSkillPoints, xpForKill } from './game/stats';
import type { CharacterClass } from './types';
import './App.css';

interface GameShellProps {
  character: CharacterClass;
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  onChangeCharacter: (character: CharacterClass) => void;
}

let nextDropId = 0;
const DROP_FEED_SIZE = 5;

function GameShell({ character, activeTab, onChangeTab, onChangeCharacter }: GameShellProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const game = useGameState(character);
  const { state, stats } = game;
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [drops, setDrops] = useState<DropEntry[]>([]);

  const activeLocation = useMemo(
    () => LOCATIONS.find((l) => l.id === selectedLocationId) ?? getLocationForLevel(state.level),
    [selectedLocationId, state.level]
  );

  // The scene is created once per character; everything it reads later
  // (stats, skill levels, location) is pushed through setters below.
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    if (!hostRef.current) return;

    const pushDrop = (entry: Omit<DropEntry, 'id'>) =>
      setDrops((prev) => [{ ...entry, id: nextDropId++ }, ...prev].slice(0, DROP_FEED_SIZE));

    const scene = new GameScene(hostRef.current, character, gameRef.current.stats, {
      onMonsterKilled: (monster, location) => {
        const loot = rollLoot(location, monster, character.sourceClass);
        gameRef.current.kill(xpForKill(monster.level, location.xpMult), loot);
        for (const id of loot.gear) {
          const gear = GEAR_BY_ID[id];
          pushDrop({ name: gear.name, img: gear.img, rarity: gear.rarity });
        }
        for (const [id, qty] of Object.entries(loot.books)) {
          const book = BOOK_BY_ID[id];
          pushDrop({ name: qty > 1 ? `${book.name} ×${qty}` : book.name, img: book.img, rarity: 'uncommon' });
        }
      },
      onPlayerDamaged: (amount) => gameRef.current.takeDamage(amount),
      onPlayerHeal: (amount) => gameRef.current.heal(amount),
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
    sceneRef.current?.setStats(stats);
  }, [stats]);

  useEffect(() => {
    sceneRef.current?.setSkillLevels(state.skillLevels);
  }, [state.skillLevels]);

  useEffect(() => {
    sceneRef.current?.setPlayerHealth(state.health, state.maxHealth);
  }, [state.health, state.maxHealth]);

  useEffect(() => {
    sceneRef.current?.setLocation(activeLocation.id);
  }, [activeLocation.id]);

  // Drop toasts fade on their own after a while.
  useEffect(() => {
    if (!drops.length) return;
    const timer = window.setTimeout(() => setDrops((prev) => prev.slice(0, -1)), 6000);
    return () => window.clearTimeout(timer);
  }, [drops]);

  const hasSkillWork = availableSkillPoints(state) > 0 || Object.keys(state.books).length > 0;

  return (
    <div className="app-root">
      <HUD character={character} state={state} stats={stats} />

      <div className="game-content">
        <div className="game-host" ref={hostRef} hidden={activeTab !== 'game'} />

        {activeTab === 'game' && (
          <>
            <button className="location-badge" onClick={() => onChangeTab('map')}>
              <Icon name="pin" size={14} />
              {activeLocation.name}
            </button>
            <DropFeed drops={drops} />
            <SkillBar sceneRef={sceneRef} />
          </>
        )}

        {activeTab === 'heroes' && (
          <div className="tab-panel">
            <CharacterSelect
              characters={CHARACTERS}
              selectedId={character.id}
              title="Смена героя"
              subtitle="Прогресс каждого героя сохраняется отдельно"
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
              playerLevel={state.level}
              sourceClass={character.sourceClass}
              activeLocationId={activeLocation.id}
              onSelect={(id) => {
                setSelectedLocationId(id);
                onChangeTab('game');
              }}
            />
          </div>
        )}

        {activeTab === 'bag' && (
          <div className="tab-panel">
            <InventoryPanel character={character} state={state} stats={stats} actions={game} />
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="tab-panel">
            <SkillsPanel character={character} state={state} actions={game} />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="tab-panel">
            <ShopPanel state={state} actions={game} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-panel">
            <ProfilePanel character={character} state={state} stats={stats} />
          </div>
        )}
      </div>

      <BottomNav active={activeTab} onChange={onChangeTab} badges={{ skills: hasSkillWork }} />
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
