import * as PIXI from 'pixi.js';

interface FloatingNumber {
  text: PIXI.Text;
  life: number;
  maxLife: number;
}

const RISE_SPEED = 40; // px / second
const MAX_LIFE = 0.7; // seconds

export class DamageNumberEmitter {
  readonly container: PIXI.Container;
  private numbers: FloatingNumber[] = [];

  constructor() {
    this.container = new PIXI.Container();
  }

  spawn(x: number, y: number, amount: number, color: number): void {
    const text = new PIXI.Text(`${Math.round(amount)}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 18,
      fontWeight: '800',
      fill: color,
      stroke: 0x1c1c1c,
      strokeThickness: 3,
    });
    text.anchor.set(0.5, 1);
    text.x = x + (Math.random() - 0.5) * 12;
    text.y = y;

    this.numbers.push({ text, life: 0, maxLife: MAX_LIFE });
    this.container.addChild(text);
  }

  update(deltaSeconds: number): void {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life += deltaSeconds;
      const t = n.life / n.maxLife;

      if (t >= 1) {
        n.text.destroy();
        this.numbers.splice(i, 1);
        continue;
      }

      n.text.y -= RISE_SPEED * deltaSeconds;
      n.text.alpha = 1 - t;
    }
  }

  destroy(): void {
    for (const n of this.numbers) {
      n.text.destroy();
    }
    this.numbers = [];
    this.container.destroy({ children: true });
  }
}
