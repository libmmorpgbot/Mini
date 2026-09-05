import * as PIXI from 'pixi.js';

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

    const skyLayer = new ParallaxLayer(width, height, 0.15, drawSky);
    const treesLayer = new ParallaxLayer(width, height, 0.45, drawTrees);
    const groundLayer = new ParallaxLayer(width, height, 1, drawGround);
    this.layers = [skyLayer, treesLayer, groundLayer];
    this.celestial = new CelestialLayer(width, height);

    this.container.addChild(skyLayer.container, this.celestial.container, treesLayer.container, groundLayer.container);
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
    this.sun.beginFill(0xffb15c, 0.35);
    this.sun.drawCircle(0, 0, 44);
    this.sun.endFill();
    this.sun.beginFill(0xffc978);
    this.sun.drawCircle(0, 0, 28);
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
      graphic.y = Math.random() * height * 0.6;
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

function drawCloud(g: PIXI.Graphics, x: number, y: number): void {
  g.drawCircle(x, y, 22);
  g.drawCircle(x + 22, y + 8, 18);
  g.drawCircle(x - 22, y + 8, 18);
  g.drawCircle(x + 8, y - 10, 16);
}

function drawMountain(g: PIXI.Graphics, x: number, baseY: number, width: number, height: number): void {
  g.moveTo(x - width / 2, baseY);
  g.lineTo(x - width / 6, baseY - height * 0.55);
  g.lineTo(x, baseY - height);
  g.lineTo(x + width / 6, baseY - height * 0.55);
  g.lineTo(x + width / 2, baseY);
  g.closePath();
}

function drawSky(g: PIXI.Graphics, width: number, height: number): void {
  const bandBottom = height * TREE_BASE_Y_RATIO;

  g.beginFill(0x241a35);
  g.drawRect(0, 0, width, bandBottom * 0.4);
  g.endFill();

  g.beginFill(0x3a2c50);
  g.drawRect(0, bandBottom * 0.4, width, bandBottom * 0.35);
  g.endFill();

  g.beginFill(0x6a4a63);
  g.drawRect(0, bandBottom * 0.75, width, bandBottom * 0.25);
  g.endFill();

  g.beginFill(0xcbb8d9, 0.3);
  drawCloud(g, width * 0.15, height * 0.18);
  drawCloud(g, width * 0.55, height * 0.26);
  drawCloud(g, width * 0.85, height * 0.14);
  g.endFill();

  g.beginFill(0x352a49, 0.85);
  drawMountain(g, width * 0.1, height * 0.55, 160, 90);
  g.endFill();

  g.beginFill(0x352a49, 0.85);
  drawMountain(g, width * 0.45, height * 0.55, 200, 120);
  g.endFill();

  g.beginFill(0x352a49, 0.85);
  drawMountain(g, width * 0.8, height * 0.55, 170, 100);
  g.endFill();
}

function drawPineCluster(g: PIXI.Graphics, x: number, baseY: number): void {
  g.drawPolygon([x - 26, baseY, x + 26, baseY, x, baseY - 22]);
  g.drawPolygon([x - 20, baseY - 14, x + 20, baseY - 14, x, baseY - 36]);
  g.drawPolygon([x - 14, baseY - 28, x + 14, baseY - 28, x, baseY - 48]);
}

function drawTrees(g: PIXI.Graphics, width: number, height: number): void {
  const baseY = height * TREE_BASE_Y_RATIO;
  const count = 6;

  for (let i = 0; i < count; i++) {
    const x = (width / count) * i + 40;
    const trunkHeight = 26 + (i % 3) * 6;

    g.beginFill(0x4a2e22);
    g.drawRect(x - 5, baseY - trunkHeight, 10, trunkHeight);
    g.endFill();

    g.beginFill(0x1f4d3d);
    drawPineCluster(g, x, baseY - trunkHeight);
    g.endFill();
  }
}

function drawGround(g: PIXI.Graphics, width: number, height: number): void {
  const groundY = height * GROUND_Y_RATIO;

  g.beginFill(0x3f6b4a);
  g.drawRect(0, groundY, width, height - groundY);
  g.endFill();

  g.beginFill(0x5a4632, 0.55);
  for (let i = 0; i < 5; i++) {
    const x = (width / 5) * i + 20;
    g.drawEllipse(x, groundY + 16, 22, 6);
  }
  g.endFill();

  g.beginFill(0x2f5238);
  for (let i = 0; i < 20; i++) {
    const x = (width / 20) * i + (i % 2 === 0 ? 6 : 0);
    g.drawRect(x, groundY, 4, 14);
  }
  g.endFill();
}
