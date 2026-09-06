import * as PIXI from 'pixi.js';
import { lerpColor } from '../utils/color';

type DrawFn = (g: PIXI.Graphics, width: number, height: number) => void;

const SEGMENT_COUNT = 3;
const SKY_HEIGHT_RATIO = 0.79;
const GROUND_Y_RATIO = 0.84;

/** Real screen px per "art pixel" -- the lower, the chunkier/more pixelated the result. */
const PIXEL_SIZE = 3;

export interface ParallaxPalette {
  skyTop: number;
  skyMid: number;
  skyBottom: number;
  hillFar: number;
  hillNear: number;
  groundTop: number;
  groundBottom: number;
  path: number;
  accent: number;
  cloud: number;
}

export const DEFAULT_PALETTE: ParallaxPalette = {
  skyTop: 0x3d7ab8,
  skyMid: 0x6fa8d8,
  skyBottom: 0xbfe0e8,
  hillFar: 0x6a8fae,
  hillNear: 0x3f6b52,
  groundTop: 0x6a9a4e,
  groundBottom: 0x3a5c2c,
  path: 0xc9b27a,
  accent: 0xfff2c0,
  cloud: 0xffffff,
};

const SUN_X_RATIO = 0.77;
const SUN_Y_RATIO = 0.15;

const CLOUD_WIDTH = 56;
const CLOUD_HEIGHT = 30;
const CLOUD_DRIFT_SPEED = 6; // px/sec, independent of world scroll speed

/**
 * Renders `draw` at full-resolution coordinates but bakes it into a
 * low-resolution, nearest-neighbour-scaled texture, so smooth vector shapes
 * come out as genuine blocky pixel art instead of an antialiased illustration.
 *
 * Width/height are padded up to an exact multiple of PIXEL_SIZE first --
 * otherwise the fractional resolution scale produces a non-integer
 * texel-to-pixel ratio, which shows up as a stray nearest-neighbour seam
 * column when the texture is stretched back up.
 */
function renderPixelated(renderer: PIXI.IRenderer, width: number, height: number, draw: DrawFn): PIXI.Sprite {
  const paddedWidth = Math.ceil(width / PIXEL_SIZE) * PIXEL_SIZE;
  const paddedHeight = Math.ceil(height / PIXEL_SIZE) * PIXEL_SIZE;

  const graphics = new PIXI.Graphics();
  draw(graphics, paddedWidth, paddedHeight);

  const renderTexture = PIXI.RenderTexture.create({
    width: paddedWidth,
    height: paddedHeight,
    resolution: 1 / PIXEL_SIZE,
    scaleMode: PIXI.SCALE_MODES.NEAREST,
  });
  renderer.render(graphics, { renderTexture });
  graphics.destroy();

  return new PIXI.Sprite(renderTexture);
}

class ParallaxLayer {
  readonly container: PIXI.Container;
  private readonly segments: PIXI.Container[] = [];
  private readonly segmentWidth: number;
  private readonly factor: number;

  constructor(renderer: PIXI.IRenderer, width: number, height: number, factor: number, draw: DrawFn) {
    this.factor = factor;
    this.segmentWidth = width;
    this.container = new PIXI.Container();

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const segment = new PIXI.Container();
      segment.addChild(renderPixelated(renderer, width, height, draw));
      segment.x = i * width;
      this.segments.push(segment);
      this.container.addChild(segment);
    }
  }

  update(deltaSeconds: number, baseSpeed: number): void {
    const dx = baseSpeed * this.factor * deltaSeconds;
    const totalWidth = this.segmentWidth * this.segments.length;

    for (const segment of this.segments) {
      segment.x -= dx;
      if (segment.x <= -this.segmentWidth) {
        segment.x += totalWidth;
      }
    }
  }
}

class CloudLayer {
  readonly container: PIXI.Container;
  private readonly clouds: { sprite: PIXI.Sprite; speedFactor: number }[] = [];
  private readonly width: number;

  constructor(renderer: PIXI.IRenderer, width: number, height: number, palette: ParallaxPalette) {
    this.width = width;
    this.container = new PIXI.Container();

    const positions = [
      { xRatio: 0.18, yRatio: 0.18, scale: 1, speedFactor: 1 },
      { xRatio: 0.6, yRatio: 0.27, scale: 0.75, speedFactor: 0.7 },
    ];

    for (const pos of positions) {
      const sprite = renderPixelated(renderer, CLOUD_WIDTH, CLOUD_HEIGHT, makeDrawCloudShape(palette));
      sprite.anchor.set(0.5);
      sprite.scale.set(pos.scale);
      sprite.x = width * pos.xRatio;
      sprite.y = height * pos.yRatio;
      this.clouds.push({ sprite, speedFactor: pos.speedFactor });
      this.container.addChild(sprite);
    }
  }

  update(deltaSeconds: number): void {
    const margin = CLOUD_WIDTH;
    for (const { sprite, speedFactor } of this.clouds) {
      sprite.x -= CLOUD_DRIFT_SPEED * speedFactor * deltaSeconds;
      if (sprite.x < -margin) {
        sprite.x = this.width + margin;
      }
    }
  }
}

export class ParallaxBackground {
  readonly container: PIXI.Container;
  private readonly layers: ParallaxLayer[];
  private readonly clouds: CloudLayer;

  constructor(renderer: PIXI.IRenderer, width: number, height: number, palette: ParallaxPalette = DEFAULT_PALETTE) {
    this.container = new PIXI.Container();

    this.layers = [
      new ParallaxLayer(renderer, width, height, 0.1, makeDrawSky(palette)),
      new ParallaxLayer(renderer, width, height, 0.3, makeDrawFarHills(palette)),
      new ParallaxLayer(renderer, width, height, 0.55, makeDrawNearHills(palette)),
      new ParallaxLayer(renderer, width, height, 1, makeDrawGround(palette)),
    ];
    this.clouds = new CloudLayer(renderer, width, height, palette);

    this.container.addChild(this.layers[0].container);
    this.container.addChild(this.clouds.container);
    this.container.addChild(this.layers[1].container);
    this.container.addChild(this.layers[2].container);
    this.container.addChild(this.layers[3].container);
  }

  update(deltaSeconds: number, baseSpeed: number): void {
    for (const layer of this.layers) {
      layer.update(deltaSeconds, baseSpeed);
    }
    this.clouds.update(deltaSeconds);
  }
}

function drawGradientRect(
  g: PIXI.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  stops: number[],
  steps: number
): void {
  const bandHeight = height / steps;
  const segCount = stops.length - 1;

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const segPos = t * segCount;
    const segIndex = Math.min(segCount - 1, Math.floor(segPos));
    const localT = segPos - segIndex;
    const color = lerpColor(stops[segIndex], stops[segIndex + 1], localT);

    g.beginFill(color);
    g.drawRect(x, y + i * bandHeight, width, bandHeight + 1);
    g.endFill();
  }
}

function makeDrawCloudShape(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const cx = width / 2;
    const cy = height * 0.6;

    g.beginFill(palette.cloud, 0.95);
    g.drawEllipse(cx, cy, width * 0.5, height * 0.32);
    g.drawEllipse(cx - width * 0.26, cy + height * 0.08, width * 0.28, height * 0.22);
    g.drawEllipse(cx + width * 0.26, cy + height * 0.06, width * 0.3, height * 0.24);
    g.drawEllipse(cx - width * 0.05, cy - height * 0.18, width * 0.26, height * 0.2);
    g.endFill();
  };
}

function makeDrawSky(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const skyHeight = height * SKY_HEIGHT_RATIO;

    drawGradientRect(g, 0, 0, width, skyHeight, [palette.skyTop, palette.skyMid, palette.skyBottom], 14);

    const sunX = width * SUN_X_RATIO;
    const sunY = height * SUN_Y_RATIO;

    g.beginFill(palette.accent, 0.35);
    g.drawCircle(sunX, sunY, 46);
    g.endFill();

    g.beginFill(palette.accent, 0.95);
    g.drawCircle(sunX, sunY, 24);
    g.endFill();
  };
}

/**
 * Sine-sampled silhouette built row-by-row (rather than a hand-authored
 * polygon) so it can never self-intersect regardless of amplitude/phase.
 */
function drawHillSilhouette(
  g: PIXI.Graphics,
  width: number,
  height: number,
  baseRatio: number,
  ampRatio: number,
  phase: number,
  color: number
): void {
  const baseY = height * baseRatio;
  const amplitude = height * ampRatio;
  const segments = 24;
  const points: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * width;
    const y = baseY - amplitude * (0.5 + 0.5 * Math.sin(t * Math.PI * 2.2 + phase));
    points.push(x, y);
  }

  points.push(width, height);
  points.push(0, height);

  g.beginFill(color);
  g.drawPolygon(points);
  g.endFill();
}

function makeDrawFarHills(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    drawHillSilhouette(g, width, height, 0.6, 0.07, 0.4, palette.hillFar);
  };
}

function makeDrawNearHills(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    drawHillSilhouette(g, width, height, 0.74, 0.05, 2.1, palette.hillNear);
  };
}

function makeDrawGround(palette: ParallaxPalette): DrawFn {
  return (g, width, height) => {
    const groundY = height * GROUND_Y_RATIO;

    drawGradientRect(g, 0, groundY, width, height - groundY, [palette.groundTop, palette.groundBottom], 10);

    const laneHeight = height * 0.025;

    g.beginFill(palette.groundBottom, 0.4);
    g.drawRect(0, groundY, width, 4);
    g.endFill();

    g.beginFill(palette.path, 0.9);
    g.drawRect(0, groundY + 4, width, laneHeight);
    g.endFill();
  };
}
