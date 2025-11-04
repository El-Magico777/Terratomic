import { GameView } from "../../../core/game/GameView";
import { AnimatedSpriteLoader } from "../AnimatedSpriteLoader";
import { Fx, FxBounds, FxType } from "./Fx";
import { SpriteFx } from "./SpriteFx";
import { Timeline } from "./Timeline";

const UNIT_EXPLOSION_PLAN: Array<{
  dx: number;
  dy: number;
  delay: number;
  type: FxType;
}> = [
  { dx: 0, dy: 0, delay: 0, type: FxType.UnitExplosion },
  { dx: 4, dy: -6, delay: 80, type: FxType.UnitExplosion },
  { dx: -6, dy: 4, delay: 160, type: FxType.UnitExplosion },
];

/**
 * Explosion Effect: a few timed explosions
 */
export class UnitExplosionFx implements Fx {
  private timeline = new Timeline();
  private explosions: Fx[] = [];
  private readonly fallbackBounds: FxBounds | null;

  constructor(
    animatedSpriteLoader: AnimatedSpriteLoader,
    private x: number,
    private y: number,
    game: GameView,
  ) {
    this.fallbackBounds = this.computeFallbackBounds(
      animatedSpriteLoader,
      x,
      y,
    );

    for (const { dx, dy, delay, type } of UNIT_EXPLOSION_PLAN) {
      this.timeline.add(delay, () => {
        if (game.isValidCoord(x + dx, y + dy)) {
          this.explosions.push(
            new SpriteFx(animatedSpriteLoader, x + dx, y + dy, type),
          );
        }
      });
    }
  }

  renderTick(frameTime: number, ctx: CanvasRenderingContext2D): boolean {
    this.timeline.update(frameTime);
    let allDone = true;
    for (const fx of this.explosions) {
      if (fx.renderTick(frameTime, ctx)) {
        allDone = false;
      }
    }

    return !allDone || !this.timeline.isComplete();
  }

  getBounds(): FxBounds | null {
    let bounds = this.fallbackBounds ? { ...this.fallbackBounds } : null;
    for (const fx of this.explosions) {
      const childBounds = fx.getBounds?.();
      if (!childBounds) continue;
      bounds = UnitExplosionFx.combineBounds(bounds, childBounds);
    }
    return bounds;
  }

  private computeFallbackBounds(
    animatedSpriteLoader: AnimatedSpriteLoader,
    originX: number,
    originY: number,
  ): FxBounds | null {
    let aggregated: FxBounds | null = null;
    for (const { dx, dy, type } of UNIT_EXPLOSION_PLAN) {
      const sprite = animatedSpriteLoader.createAnimatedSprite(type);
      if (!sprite) continue;
      const scale = sprite.getScale();
      const originOffsetX = sprite.getOriginX() * scale;
      const originOffsetY = sprite.getOriginY() * scale;
      const drawX = Math.round(originX + dx - originOffsetX);
      const drawY = Math.round(originY + dy - originOffsetY);
      const width = Math.max(1, Math.ceil(sprite.getFrameWidth() * scale));
      const height = Math.max(1, Math.ceil(sprite.getFrameHeight() * scale));
      const spriteBounds: FxBounds = {
        minX: drawX,
        minY: drawY,
        maxX: drawX + width,
        maxY: drawY + height,
      };
      aggregated = UnitExplosionFx.combineBounds(aggregated, spriteBounds);
    }

    if (!aggregated) {
      const padding = 20;
      return {
        minX: originX - padding,
        minY: originY - padding,
        maxX: originX + padding,
        maxY: originY + padding,
      };
    }
    return aggregated;
  }

  private static combineBounds(
    current: FxBounds | null,
    addition: FxBounds,
  ): FxBounds {
    if (!current) return { ...addition };
    return {
      minX: Math.min(current.minX, addition.minX),
      minY: Math.min(current.minY, addition.minY),
      maxX: Math.max(current.maxX, addition.maxX),
      maxY: Math.max(current.maxY, addition.maxY),
    };
  }
}
