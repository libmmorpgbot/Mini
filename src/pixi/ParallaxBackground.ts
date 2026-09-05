import * as PIXI from 'pixi.js';
import { lerpColor } from './DayNightCycle';

type DrawFn = (g: PIXI.Graphics, width: number, height: number) => void;

const SEGMENT_COUNT = 3;
const GROUND_Y_RATIO = 0.84;
const TREE_BASE_Y_RATIO = 0.8;

class ParallaxLayer {
  readonly container: PIXI.Container;
  private readonly segments: PIXI.Container[] = [];
  private readonly segmentWidth: number;
  private readonly factor: number;

  constructor(width: number, height: number, factor: number, draw: DrawFn) {
    this.factor = factor;
    this.segmentWidth = width;
    this.container = new PIXI.Container();

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const segment = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      draw(graphics, width, height);
      segment.addChild(graphics);
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
  private readonly celestial: CelestialLayer;

  constructor(width: number, height: number) {
    this.container = new PIXI.Container();

    const skyLayer = new ParallaxLayer(width, height, 0.1, drawSky);
    const farMountainLayer = new ParallaxLayer(width, height, 0.25, drawFarMountains);
    const nearMountainLayer = new ParallaxLayer(width, height, 0.4, drawNearMountains);
    const treesLayer = new ParallaxLayer(width, height, 0.55, drawTrees);
    const groundLayer = new ParallaxLayer(width, height, 1, drawGround);
    this.layers = [skyLayer, farMountainLayer, nearMountainLayer, treesLayer, groundLayer];
    this.celestial = new CelestialLayer(width, height);

    this.container.addChild(
      skyLayer.container,
      this.celestial.container,
      farMountainLayer.container,
      nearMountainLayer.container,
      treesLayer.container,
      groundLayer.container
    );
  }

  update(deltaSeconds: number, baseSpeed: number, dayFactor: number): void {
    for (const layer of this.layers) {
      layer.update(deltaSeconds, baseSpeed);
    }
    this.celestial.update(deltaSeconds, dayFactor);
  }
}

class CelestialLayer {
  readonly container: PIXI.Container;
  private readonly sun: PIXI.Graphics;
  private readonly moon: PIXI.Graphics;
  private readonly starsContainer: PIXI.Container;
  private readonly stars: { graphic: PIXI.Graphics; baseAlpha: number; speed: number; phase: number }[] = [];

  constructor(width: number, height: number) {
    this.container = new PIXI.Container();

    const x = width * 0.8;
    const y = height * 0.16;

    this.sun = new PIXI.Graphics();
    this.sun.beginFill(0xffb15c, 0.25);
    this.sun.drawCircle(0, 0, 52);
    this.sun.endFill();
    this.sun.beginFill(0xffb15c, 0.4);
    this.sun.drawCircle(0, 0, 38);
    this.sun.endFill();
    this.sun.beginFill(0xffd68a);
    this.sun.drawCircle(0, 0, 27);
    this.sun.endFill();
    this.sun.x = x;
    this.sun.y = y;

    this.moon = new PIXI.Graphics();
    this.moon.beginFill(0xe8eef7);
    this.moon.drawCircle(0, 0, 22);
    this.moon.endFill();
    this.moon.beginFill(0xc9d6e8);
    this.moon.drawCircle(-8, -6, 5);
    this.moon.drawCircle(6, 4, 4);
    this.moon.endFill();
    this.moon.x = x;
    this.moon.y = y;

    this.starsContainer = new PIXI.Container();
    for (let i = 0; i < 25; i++) {
      const graphic = new PIXI.Graphics();
      const radius = 1 + Math.random() * 1.5;
      graphic.beginFill(0xffffff);
      graphic.drawCircle(0, 0, radius);
      graphic.endFill();
      graphic.x = Math.random() * width;
      graphic.y = Math.random() * height * 0.55;
      this.starsContainer.addChild(graphic);
      this.stars.push({
        graphic,
        baseAlpha: 0.4 + Math.random() * 0.6,
        speed: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.container.addChild(this.starsContainer, this.sun, this.moon);
  }

  update(deltaSeconds: number, dayFactor: number): void {
    this.sun.alpha = dayFactor;
    this.moon.alpha = 1 - dayFactor;
    this.starsContainer.alpha = 1 - dayFactor;

    for (const star of this.stars) {
      star.phase += deltaSeconds * star.speed;
      star.graphic.alpha = star.baseAlpha * (0.6 + 0.4 * Math.sin(star.phase));
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

  drawGradientRect(g, 0, 0, width, bandBottom, [0x140f24, 0x2c2044, 0x5a3f5c, 0xba7b6e, 0xe6a67a], 28);

  g.beginFill(0xd9c3e0, 0.28);
  drawCloud(g, width * 0.15, height * 0.16, 1.1);
  drawCloud(g, width * 0.55, height * 0.24, 0.9);
  drawCloud(g, width * 0.85, height * 0.12, 1.2);
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
    g.beginFill(snowColor, 0.9);
    drawSnowPeak(g, x, tipY, width * 0.12, peakHeight * 0.28);
    g.endFill();
  }
}

function drawCastleSilhouette(g: PIXI.Graphics, x: number, baseY: number): void {
  const color = 0x241a35;
  g.beginFill(color, 0.55);

  // hill the castle sits on
  g.drawEllipse(x, baseY, 90, 20);

  // curtain wall
  g.drawRect(x - 46, baseY - 34, 92, 34);

  // towers
  g.drawRect(x - 58, baseY - 52, 20, 52);
  g.drawRect(x + 38, baseY - 52, 20, 52);
  g.drawRect(x - 12, baseY - 64, 24, 64);

  // crenellations
  for (let i = -1; i <= 1; i++) {
    g.drawRect(x - 58 + i * 8, baseY - 58, 6, 8);
    g.drawRect(x + 38 + i * 8, baseY - 58, 6, 8);
  }

  // central spire roof
  g.drawPolygon([x - 12, baseY - 64, x, baseY - 82, x + 12, baseY - 64]);
  g.endFill();

  g.beginFill(0xffd68a, 0.4);
  g.drawRect(x - 3, baseY - 46, 6, 8);
  g.drawRect(x - 51, baseY - 30, 5, 7);
  g.drawRect(x + 45, baseY - 30, 5, 7);
  g.endFill();
}

function drawFarMountains(g: PIXI.Graphics, width: number, height: number): void {
  const baseY = height * 0.58;

  drawMountain(g, width * 0.08, baseY, 220, 130, 0x4a3d66, 0xd8cbe6);
  drawMountain(g, width * 0.5, baseY, 260, 160, 0x4a3d66, 0xd8cbe6);
  drawMountain(g, width * 0.88, baseY, 210, 120, 0x4a3d66, 0xd8cbe6);

  drawCastleSilhouette(g, width * 0.68, baseY - 6);
}

function drawNearMountains(g: PIXI.Graphics, width: number, height: number): void {
  const baseY = height * TREE_BASE_Y_RATIO + 6;

  drawMountain(g, width * 0.22, baseY, 190, 95, 0x2f2440, null);
  drawMountain(g, width * 0.62, baseY, 230, 110, 0x2f2440, null);
  drawMountain(g, width * 0.95, baseY, 170, 85, 0x2f2440, null);
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

    g.beginFill(0x3a2418);
    g.drawRect(x - 5, baseY - trunkHeight, 10, trunkHeight);
    g.endFill();

    const dark = i % 3 === 0 ? 0x1a3f33 : 0x1f4d3d;
    drawPineCluster(g, x + wobble * 0.3, baseY - trunkHeight, dark, 0x3f7a5c);
  }
}

function drawGround(g: PIXI.Graphics, width: number, height: number): void {
  const groundY = height * GROUND_Y_RATIO;

  drawGradientRect(g, 0, groundY, width, height - groundY, [0x4a7a52, 0x33562f], 10);

  // contact shadow where the trees meet the grass
  g.beginFill(0x14241a, 0.35);
  g.drawRect(0, groundY, width, 8);
  g.endFill();

  // winding dirt path
  g.beginFill(0x6b4f34, 0.8);
  g.drawEllipse(width * 0.2, groundY + 20, 60, 12);
  g.drawEllipse(width * 0.42, groundY + 26, 70, 13);
  g.drawEllipse(width * 0.68, groundY + 20, 65, 12);
  g.drawEllipse(width * 0.9, groundY + 16, 50, 10);
  g.endFill();

  g.beginFill(0x5a4632, 0.5);
  for (let i = 0; i < 5; i++) {
    const x = (width / 5) * i + 20;
    g.drawEllipse(x, groundY + 15, 20, 5);
  }
  g.endFill();

  // small rocks
  g.beginFill(0x7c8a86, 0.7);
  for (let i = 0; i < 6; i++) {
    const x = (width / 6) * i + 45;
    g.drawEllipse(x, groundY + 30, 6, 4);
  }
  g.endFill();

  // grass blades
  g.beginFill(0x2a4a2c);
  for (let i = 0; i < 26; i++) {
    const x = (width / 26) * i + (i % 2 === 0 ? 6 : 0);
    g.drawRect(x, groundY, 3, 12 + (i % 3) * 3);
  }
  g.endFill();
}
