import { useMemo, useState } from 'react';
import type { CharacterClass } from '../types';
import { animatedFrameStyle, buildSpriteKeyframes } from '../utils/characterVisuals';

interface CharacterSelectProps {
  characters: CharacterClass[];
  selectedId?: string;
  title?: string;
  subtitle?: string;
  confirmLabel?: (character: CharacterClass) => string;
  onConfirm: (character: CharacterClass) => void;
}

const PREVIEW_HEIGHT = 84;

export function CharacterSelect({
  characters,
  selectedId,
  title = 'Выберите героя',
  subtitle = 'Каждый герой играет и выглядит по-своему',
  confirmLabel = (character) => `В бой за ${character.nameAccusative}`,
  onConfirm,
}: CharacterSelectProps) {
  const [pickedId, setPickedId] = useState(selectedId ?? characters[0]?.id);
  const picked = characters.find((c) => c.id === pickedId) ?? characters[0];

  const keyframes = useMemo(
    () =>
      characters
        .map((c) => buildSpriteKeyframes(`char-idle-${c.id}`, c.animations.idle, PREVIEW_HEIGHT))
        .join('\n'),
    [characters]
  );

  return (
    <div className="char-select">
      <style>{keyframes}</style>

      <h1 className="char-select-title">{title}</h1>
      <p className="char-select-subtitle">{subtitle}</p>

      <div className="char-grid">
        {characters.map((character) => {
          const isActive = character.id === pickedId;
          return (
            <button
              key={character.id}
              className={`char-card${isActive ? ' active' : ''}`}
              style={isActive ? { borderColor: `#${character.accentColor.toString(16).padStart(6, '0')}` } : undefined}
              onClick={() => setPickedId(character.id)}
            >
              <div className="char-card-preview">
                <div
                  className="char-sprite"
                  style={animatedFrameStyle(character.animations.idle, PREVIEW_HEIGHT, `char-idle-${character.id}`)}
                />
              </div>
              <span className="char-card-name">{character.name}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="char-select-footer">
          <p className="char-select-desc">{picked.title}</p>
          <button className="char-confirm-button" onClick={() => onConfirm(picked)}>
            {confirmLabel(picked)}
          </button>
        </div>
      )}
    </div>
  );
}
