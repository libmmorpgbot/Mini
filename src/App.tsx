import { useEffect, useRef } from 'react';
import { GameScene } from './pixi/GameScene';
import { HUD } from './components/HUD';
import { Controls } from './components/Controls';
import { useGameState } from './hooks/useGameState';
import { useTelegram } from './hooks/useTelegram';
import './App.css';

function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const { state, effectiveSpeed, killMonster, activateBoost, boostReady } = useGameState();
  const { close } = useTelegram();

  useEffect(() => {
    if (!hostRef.current) return;

    const scene = new GameScene(hostRef.current, {
      onMonsterKilled: killMonster,
      onMonsterEscaped: () => {},
    });
    sceneRef.current = scene;

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setSpeedMultiplier(effectiveSpeed);
  }, [effectiveSpeed]);

  return (
    <div className="app-root">
      <div className="game-host" ref={hostRef} />

      <div className="topbar">
        <span className="topbar-title">⚔️ Idle Runner</span>
        <button className="close-button" onClick={close}>
          ✕ Закрыть
        </button>
      </div>

      <HUD gold={state.gold} level={state.level} speed={effectiveSpeed} />
      <Controls onBoost={activateBoost} boostReady={boostReady} />
    </div>
  );
}

export default App;
