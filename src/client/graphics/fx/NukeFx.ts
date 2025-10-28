import { GameView } from "../../../core/game/GameView";
import { AnimatedSpriteLoader } from "../AnimatedSpriteLoader";
import { Fx, FxBounds, FxType } from "./Fx";
import { FadeFx, SpriteFx } from "./SpriteFx";

/**
 * Shockwave effect: draw a growing 1px white circle
 */
export class ShockwaveFx implements Fx {
  private lifeTime: number = 0;
  constructor(
    private x: number,
    private y: number,
    private duration: number,
    private maxRadius: number,
  ) {}

  renderTick(frameTime: number, ctx: CanvasRenderingContext2D): boolean {
    this.lifeTime += frameTime;
    if (this.lifeTime >= this.duration) {
      return false;
    }
    const t = this.lifeTime / this.duration;
    const radius = t * this.maxRadius;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, " + (1 - t) + ")";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    return true;
  }

  getBounds(): FxBounds | null {
    const clamped = Math.min(this.lifeTime, this.duration);
    const t = this.duration === 0 ? 1 : clamped / this.duration;
    const radius = Math.max(0, t * this.maxRadius);
    const padded = radius + 2;
    return {
      minX: this.x - padded,
      minY: this.y - padded,
      maxX: this.x + padded,
      maxY: this.y + padded,
    };
  }
}

/**
 * Spawn @p number of @p type animation within a perimeter
 */
const MAX_TOTAL_DEBRIS_SPRITES = 80;
const MAX_DEBRIS_PER_TYPE = 28;

function addSpriteInCircle(
  animatedSpriteLoader: AnimatedSpriteLoader,
  x: number,
  y: number,
  radius: number,
  num: number,
  type: FxType,
  result: Fx[],
  game: GameView,
  scale: number = 1,
  maxPerType: number = MAX_DEBRIS_PER_TYPE,
  totalRemaining?: { value: number },
): number {
  const desired = Math.max(0, num);
  if (desired <= 0) return 0;
  const limitRemaining = totalRemaining ? totalRemaining.value : Infinity;
  const integerPart = Math.floor(desired);
  let spawnTarget = Math.min(integerPart, maxPerType, limitRemaining);
  const fractional = desired - integerPart;
  if (
    spawnTarget < maxPerType &&
    spawnTarget < limitRemaining &&
    fractional > 0 &&
    Math.random() < fractional
  ) {
    spawnTarget++;
  }
  if (spawnTarget <= 0) return 0;

  let spawned = 0;
  for (let i = 0; i < spawnTarget; i++) {
    if (totalRemaining && totalRemaining.value <= 0) break;
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * (radius / 2);
    const spawnX = Math.floor(x + Math.cos(angle) * distance);
    const spawnY = Math.floor(y + Math.sin(angle) * distance);
    if (
      game.isValidCoord(spawnX, spawnY) &&
      game.isLand(game.ref(spawnX, spawnY))
    ) {
      const sprite = new FadeFx(
        new SpriteFx(
          animatedSpriteLoader,
          spawnX,
          spawnY,
          type,
          6000,
          undefined,
          undefined,
          scale,
        ),
        0.1,
        0.8,
      );
      result.push(sprite as Fx);
      spawned++;
      if (totalRemaining) totalRemaining.value--;
    }
  }
  return spawned;
}

/**
 * Explosion effect:
 * - explosion animation
 * - shockwave
 * - ruins and desolation fx
 */
export function nukeFxFactory(
  animatedSpriteLoader: AnimatedSpriteLoader,
  x: number,
  y: number,
  radius: number,
  game: GameView,
  scale: number = 1,
): Fx[] {
  const nukeFx: Fx[] = [];
  // Explosion animation
  nukeFx.push(
    new SpriteFx(
      animatedSpriteLoader,
      x,
      y,
      FxType.Nuke,
      undefined,
      undefined,
      undefined,
      scale,
    ),
  );
  // Shockwave animation
  nukeFx.push(new ShockwaveFx(x, y, 1500, radius * 1.5));
  // Ruins and desolation sprites
  const remaining = { value: MAX_TOTAL_DEBRIS_SPRITES };
  const debrisPlan: Array<{
    type: FxType;
    radiusFactor: number;
    density: number;
  }> = [
    { type: FxType.MiniFire, radiusFactor: 1.0, density: 1 / 25 },
    { type: FxType.MiniSmoke, radiusFactor: 1.0, density: 1 / 28 },
    { type: FxType.MiniBigSmoke, radiusFactor: 0.9, density: 1 / 70 },
    { type: FxType.MiniSmokeAndFire, radiusFactor: 0.9, density: 1 / 70 },
  ];

  for (const { type, radiusFactor, density } of debrisPlan) {
    if (remaining.value <= 0) break;
    addSpriteInCircle(
      animatedSpriteLoader,
      x,
      y,
      radius * radiusFactor,
      radius * density,
      type,
      nukeFx,
      game,
      scale,
      MAX_DEBRIS_PER_TYPE,
      remaining,
    );
  }
  return nukeFx;
}
