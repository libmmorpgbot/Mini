import * as PIXI from 'pixi.js';

type DrawFn = (g: PIXI.Graphics, width: number, height: number) => void;

const SEGMENT_COUNT = 3;

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
    this.sun.beginFill(0xfff0a3, 0.35);
    this.sun.drawCircle(0, 0, 44);
    this.sun.endFill();
    this.sun.beginFill(0xfff0a3);
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
  g.lineTo(x, baseY - height);
  g.lineTo(x + width / 2, baseY);
  g.closePath();
}

function drawSky(g: PIXI.Graphics, width: number, height: number): void {
  g.beginFill(0xbfe6ff);
  g.drawRect(0, 0, width, height * 0.75);
  g.endFill();

  g.beginFill(0xffffff, 0.9);
  drawCloud(g, width * 0.15, height * 0.18);
  drawCloud(g, width * 0.55, height * 0.26);
  drawCloud(g, width * 0.85, height * 0.14);
  g.endFill();

  g.beginFill(0x8fb9a8, 0.6);
  drawMountain(g, width * 0.1, height * 0.55, 160, 90);
  g.endFill();

  g.beginFill(0x8fb9a8, 0.6);
  drawMountain(g, width * 0.45, height * 0.55, 200, 120);
  g.endFill();

  g.beginFill(0x8fb9a8, 0.6);
  drawMountain(g, width * 0.8, height * 0.55, 170, 100);
  g.endFill();
}

function drawTrees(g: PIXI.Graphics, width: number, height: number): void {
  const baseY = height * 0.78;
  const count = 6;

  for (let i = 0; i < count; i++) {
    const x = (width / count) * i + 40;
    const trunkHeight = 50 + (i % 3) * 10;

    g.beginFill(0x6b4226);
    g.drawRect(x - 5, baseY - trunkHeight, 10, trunkHeight);
    g.endFill();

    g.beginFill(0x2f7a3d);
    g.drawCircle(x, baseY - trunkHeight - 10, 34);
    g.drawCircle(x - 20, baseY - trunkHeight + 4, 24);
    g.drawCircle(x + 20, baseY - trunkHeight + 4, 24);
    g.endFill();
  }
}

function drawGround(g: PIXI.Graphics, width: number, height: number): void {
  const groundY = height * 0.82;

  g.beginFill(0x6fbf5e);
  g.drawRect(0, groundY, width, height - groundY);
  g.endFill();

  g.beginFill(0x5aa64c);
  for (let i = 0; i < 20; i++) {
    const x = (width / 20) * i + (i % 2 === 0 ? 6 : 0);
    g.drawRect(x, groundY, 4, 14);
  }
  g.endFill();
}
