import * as PIXI from 'pixi.js';
import { lerpColor } from '../utils/color';

type DrawFn = (g: PIXI.Graphics, width: number, height: number) => void;

const SEGMENT_COUNT = 3;
const GROUND_Y_RATIO = 0.84;
const TREE_BASE_Y_RATIO = 0.8;

/** Real screen px per "art pixel" -- the lower, the chunkier/more pixelated the result. */
const PIXEL_SIZE = 3;

/**
 * Renders `draw` at full-resolution coordinates but bakes it into a
 * low-resolution, nearest-neighbour-scaled texture, so smooth vector shapes
 * come out as genuine blocky pixel art instead of an antialiased illustration.
 */
function renderPixelated(renderer: PIXI.IRenderer, width: number, height: number, draw: DrawFn): PIXI.Sprite {
  const graphics = new PIXI.Graphics();
  draw(graphics, width, height);

  const renderTexture = PIXI.RenderTexture.create({
    width,
    height,
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

export class ParallaxBackground {
  readonly container: PIXI.Container;
  private readonly layers: ParallaxLayer[];

  constructor(renderer: PIXI.IRenderer, width: number, height: number) {
    this.container = new PIXI.Container();

    this.layers = [
      new ParallaxLayer(renderer, width, height, 0.1, drawSky),
      new ParallaxLayer(renderer, width, height, 0.25, drawFarMountains),
      new ParallaxLayer(renderer, width, height, 0.4, drawNearMountains),
      new ParallaxLayer(renderer, width, height, 0.55, drawTrees),
      new ParallaxLayer(renderer, width, height, 1, drawGround),
    ];

    for (const layer of this.layers) {
      this.container.addChild(layer.container);
    }
  }

  update(deltaSeconds: number, baseSpeed: number): void {
    for (const layer of this.layers) {
      layer.update(deltaSeconds, baseSpeed);
    }
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

function drawCloud(g: PIXI.Graphics, x: number, y: number, s = 1): void {
  g.drawCircle(x, y, 22 * s);
  g.drawCircle(x + 22 * s, y + 8 * s, 18 * s);
  g.drawCircle(x - 22 * s, y + 8 * s, 18 * s);
  g.drawCircle(x + 8 * s, y - 10 * s, 16 * s);
}

function drawSky(g: PIXI.Graphics, width: number, height: number): void {
  const bandBottom = height * TREE_BASE_Y_RATIO;

  drawGradientRect(g, 0, 0, width, bandBottom, [0x3a6ea8, 0x6fa3c9, 0xa9cfe0, 0xe8dcae], 16);

  g.beginFill(0xffffff, 0.85);
  drawCloud(g, width * 0.15, height * 0.15, 1.1);
  drawCloud(g, width * 0.55, height * 0.24, 0.9);
  drawCloud(g, width * 0.85, height * 0.12, 1.2);
  g.endFill();

  g.beginFill(0xfff3c4, 0.9);
  g.drawCircle(width * 0.78, height * 0.14, 26);
  g.endFill();
}

function drawSnowPeak(g: PIXI.Graphics, x: number, tipY: number, halfWidth: number, snowHeight: number): void {
  g.drawPolygon([x - halfWidth, tipY + snowHeight, x, tipY, x + halfWidth, tipY + snowHeight]);
}

function drawMountain(
  g: PIXI.Graphics,
  x: number,
  baseY: number,
  width: number,
  peakHeight: number,
  color: number,
  snowColor: number | null
): void {
  const tipY = baseY - peakHeight;

  g.beginFill(color);
  g.moveTo(x - width / 2, baseY);
  g.lineTo(x - width / 6, baseY - peakHeight * 0.55);
  g.lineTo(x, tipY);
  g.lineTo(x + width / 6, baseY - peakHeight * 0.55);
  g.lineTo(x + width / 2, baseY);
  g.closePath();
  g.endFill();

  if (snowColor !== null) {
    g.beginFill(snowColor, 0.95);
    drawSnowPeak(g, x, tipY, width * 0.12, peakHeight * 0.28);
    g.endFill();
  }
}

function drawCastleSilhouette(g: PIXI.Graphics, x: number, baseY: number): void {
  const color = 0x4a5a78;
  g.beginFill(color, 0.7);

  g.drawEllipse(x, baseY, 90, 20);
  g.drawRect(x - 46, baseY - 34, 92, 34);
  g.drawRect(x - 58, baseY - 52, 20, 52);
  g.drawRect(x + 38, baseY - 52, 20, 52);
  g.drawRect(x - 12, baseY - 64, 24, 64);

  for (let i = -1; i <= 1; i++) {
    g.drawRect(x - 58 + i * 8, baseY - 58, 6, 8);
    g.drawRect(x + 38 + i * 8, baseY - 58, 6, 8);
  }

  g.drawPolygon([x - 12, baseY - 64, x, baseY - 82, x + 12, baseY - 64]);
  g.endFill();

  g.beginFill(0xffe9a8, 0.6);
  g.drawRect(x - 3, baseY - 46, 6, 8);
  g.drawRect(x - 51, baseY - 30, 5, 7);
  g.drawRect(x + 45, baseY - 30, 5, 7);
  g.endFill();
}

function drawFarMountains(g: PIXI.Graphics, width: number, height: number): void {
  const baseY = height * 0.58;

  drawMountain(g, width * 0.08, baseY, 220, 130, 0x7d92b5, 0xf0f4fa);
  drawMountain(g, width * 0.5, baseY, 260, 160, 0x7d92b5, 0xf0f4fa);
  drawMountain(g, width * 0.88, baseY, 210, 120, 0x7d92b5, 0xf0f4fa);

  drawCastleSilhouette(g, width * 0.68, baseY - 6);
}

function drawNearMountains(g: PIXI.Graphics, width: number, height: number): void {
  const baseY = height * TREE_BASE_Y_RATIO + 6;

  drawMountain(g, width * 0.22, baseY, 190, 95, 0x5a7099, null);
  drawMountain(g, width * 0.62, baseY, 230, 110, 0x5a7099, null);
  drawMountain(g, width * 0.95, baseY, 170, 85, 0x5a7099, null);
}

function drawPineCluster(g: PIXI.Graphics, x: number, baseY: number, darkColor: number, lightColor: number): void {
  g.beginFill(darkColor);
  g.drawPolygon([x - 26, baseY, x + 26, baseY, x, baseY - 22]);
  g.drawPolygon([x - 20, baseY - 14, x + 20, baseY - 14, x, baseY - 36]);
  g.drawPolygon([x - 14, baseY - 28, x + 14, baseY - 28, x, baseY - 48]);
  g.endFill();

  g.beginFill(lightColor, 0.55);
  g.drawPolygon([x, baseY, x + 13, baseY - 11, x, baseY - 22]);
  g.drawPolygon([x, baseY - 14, x + 10, baseY - 25, x, baseY - 36]);
  g.drawPolygon([x, baseY - 28, x + 7, baseY - 38, x, baseY - 48]);
  g.endFill();
}

function drawTrees(g: PIXI.Graphics, width: number, height: number): void {
  const baseY = height * TREE_BASE_Y_RATIO;
  const count = 8;

  for (let i = 0; i < count; i++) {
    const x = (width / count) * i + 26;
    const wobble = Math.sin(i * 2.4) * 5;
    const trunkHeight = 24 + ((i * 7) % 3) * 6 + wobble * 0.4;

    g.beginFill(0x5a3c28);
    g.drawRect(x - 5, baseY - trunkHeight, 10, trunkHeight);
    g.endFill();

    const dark = i % 3 === 0 ? 0x2d6b46 : 0x357a4f;
    drawPineCluster(g, x + wobble * 0.3, baseY - trunkHeight, dark, 0x63a56e);
  }
}

function drawGround(g: PIXI.Graphics, width: number, height: number): void {
  const groundY = height * GROUND_Y_RATIO;

  drawGradientRect(g, 0, groundY, width, height - groundY, [0x6fae55, 0x4a8a3f], 10);

  g.beginFill(0x24401f, 0.35);
  g.drawRect(0, groundY, width, 8);
  g.endFill();

  g.beginFill(0x8a6a42, 0.85);
  g.drawEllipse(width * 0.2, groundY + 20, 60, 12);
  g.drawEllipse(width * 0.42, groundY + 26, 70, 13);
  g.drawEllipse(width * 0.68, groundY + 20, 65, 12);
  g.drawEllipse(width * 0.9, groundY + 16, 50, 10);
  g.endFill();

  g.beginFill(0x74593a, 0.5);
  for (let i = 0; i < 5; i++) {
    const x = (width / 5) * i + 20;
    g.drawEllipse(x, groundY + 15, 20, 5);
  }
  g.endFill();

  g.beginFill(0x8a988f, 0.75);
  for (let i = 0; i < 6; i++) {
    const x = (width / 6) * i + 45;
    g.drawEllipse(x, groundY + 30, 6, 4);
  }
  g.endFill();

  g.beginFill(0x3d6b34);
  for (let i = 0; i < 26; i++) {
    const x = (width / 26) * i + (i % 2 === 0 ? 6 : 0);
    g.drawRect(x, groundY, 3, 12 + (i % 3) * 3);
  }
  g.endFill();
}
