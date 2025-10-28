import { GameView } from "../../../core/game/GameView";
import { AnimatedSpriteLoader } from "../AnimatedSpriteLoader";
import { Fx, FxBounds, FxType } from "./Fx";
import { SpriteFx } from "./SpriteFx";
import { Timeline } from "./Timeline";

/**
 * Explosion Effect: a few timed explosions
 */
export class UnitExplosionFx implements Fx {
  private timeline = new Timeline();
  private explosions: Fx[] = [];

  constructor(
    animatedSpriteLoader: AnimatedSpriteLoader,
    private x: number,
    private y: number,
    game: GameView,
  ) {
    const config = [
      { dx: 0, dy: 0, delay: 0, type: FxType.UnitExplosion },
      { dx: 4, dy: -6, delay: 80, type: FxType.UnitExplosion },
      { dx: -6, dy: 4, delay: 160, type: FxType.UnitExplosion },
    ];
    for (const { dx, dy, delay, type } of config) {
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
    let bounds: FxBounds | null = null;
    for (const fx of this.explosions) {
      const childBounds = fx.getBounds?.();
      if (!childBounds) continue;
      if (!bounds) {
        bounds = { ...childBounds };
      } else {
        bounds.minX = Math.min(bounds.minX, childBounds.minX);
        bounds.minY = Math.min(bounds.minY, childBounds.minY);
        bounds.maxX = Math.max(bounds.maxX, childBounds.maxX);
        bounds.maxY = Math.max(bounds.maxY, childBounds.maxY);
      }
    }
    return bounds;
  }
}
