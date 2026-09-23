import type { MonsterDef } from '../data/monsters';

interface MonsterThumbProps {
  def: MonsterDef;
  /** Box size, px. */
  size: number;
  grayscale?: boolean;
}

/** First walking frame (facing left) of a monster's sheet, zoomed to fill a square box. */
export function MonsterThumb({ def, size, grayscale }: MonsterThumbProps) {
  const { frameSize, feetY, walk } = def.sprite;
  // The figure fills roughly half its frame, so draw the frame ~1.7× the box.
  const inner = size * 1.7;
  const top = size * 0.95 - (feetY / frameSize) * inner;
  return (
    <div className="monster-thumb" style={{ width: size, height: size }}>
      <div
        style={{
          position: 'absolute',
          left: (size - inner) / 2,
          top,
          width: inner,
          height: inner,
          backgroundImage: `url(${walk.src})`,
          backgroundSize: `${walk.cols * 100}% 400%`,
          backgroundPosition: '0% 66.667%',
          imageRendering: 'pixelated',
          filter: grayscale ? 'grayscale(1) brightness(0.5)' : undefined,
        }}
      />
    </div>
  );
}
