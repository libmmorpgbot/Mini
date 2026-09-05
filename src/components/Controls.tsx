import { useEffect, useState } from 'react';

interface ControlsProps {
  onBoost: () => void;
  boostReady: boolean;
}

const COOLDOWN_MS = 10000;

export function Controls({ onBoost, boostReady }: ControlsProps) {
  const [cooldownLeftMs, setCooldownLeftMs] = useState(0);

  useEffect(() => {
    if (boostReady) {
      setCooldownLeftMs(0);
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - startedAt));
      setCooldownLeftMs(remaining);
      if (remaining <= 0) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [boostReady]);

  const handleClick = () => {
    if (boostReady) {
      onBoost();
    }
  };

  return (
    <div className="controls">
      <button className="boost-button" onClick={handleClick} disabled={!boostReady}>
        {boostReady ? '⚡ Ускорение' : `${Math.ceil(cooldownLeftMs / 1000)}с`}
      </button>
    </div>
  );
}
