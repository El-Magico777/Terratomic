import { Theme } from "../../../core/configuration/Config";
import { PlayerView } from "../../../core/game/GameView";
import { AnimatedSprite } from "../AnimatedSprite";
import { AnimatedSpriteLoader } from "../AnimatedSpriteLoader";
import { Fx, FxBounds, FxType } from "./Fx";

function fadeInOut(
  t: number,
  fadeIn: number = 0.3,
  fadeOut: number = 0.7,
): number {
  if (t < fadeIn) {
    const f = t / fadeIn; // Map to [0, 1]
    return f * f;
  } else if (t < fadeOut) {
    return 1;
  } else {
    const f = (t - fadeOut) / (1 - fadeOut); // Map to [0, 1]
    return 1 - f * f;
  }
}
/**
 * Fade in/out another FX
 */
export class FadeFx implements Fx {
  constructor(
    private fxToFade: SpriteFx,
    private fadeIn: number,
    private fadeOut: number,
  ) {}

  renderTick(duration: number, ctx: CanvasRenderingContext2D): boolean {
    const t = this.fxToFade.getElapsedTime() / this.fxToFade.getDuration();
    ctx.save();
    ctx.globalAlpha = fadeInOut(t, this.fadeIn, this.fadeOut);
    const result = this.fxToFade.renderTick(duration, ctx);
    ctx.restore();
    return result;
  }

  getBounds(): FxBounds | null {
    return this.fxToFade.getBounds?.() ?? null;
  }
}

/**
 * Animated sprite. Can be colored if provided an owner/theme
 */
export class SpriteFx implements Fx {
  protected animatedSprite: AnimatedSprite | null;
  protected elapsedTime = 0;
  protected duration = 1000;
  constructor(
    animatedSpriteLoader: AnimatedSpriteLoader,
    protected x: number,
    protected y: number,
    fxType: FxType,
    duration?: number,
    private owner?: PlayerView,
    private theme?: Theme,
    scale: number = 1,
  ) {
    this.animatedSprite = animatedSpriteLoader.createAnimatedSprite(
      fxType,
      owner,
      theme,
      scale,
    );
    if (!this.animatedSprite) {
      console.error("Could not load animated sprite", fxType);
    } else {
      this.duration = duration ?? this.animatedSprite.lifeTime() ?? 1000;
    }
  }

  renderTick(frameTime: number, ctx: CanvasRenderingContext2D): boolean {
    if (!this.animatedSprite) return false;

    this.elapsedTime += frameTime;
    if (this.elapsedTime >= this.duration) return false;

    if (!this.animatedSprite.isActive()) return false;

    const t = this.elapsedTime / this.duration;
    this.animatedSprite.update(frameTime);
    this.animatedSprite.draw(ctx, this.x, this.y);
    return true;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  getDuration(): number {
    return this.duration;
  }

  getBounds(): FxBounds | null {
    if (!this.animatedSprite) return null;
    const scale = this.animatedSprite.getScale();
    const originX = this.animatedSprite.getOriginX() * scale;
    const originY = this.animatedSprite.getOriginY() * scale;
    const drawX = Math.round(this.x - originX);
    const drawY = Math.round(this.y - originY);
    const width = Math.max(
      1,
      Math.ceil(this.animatedSprite.getFrameWidth() * scale),
    );
    const height = Math.max(
      1,
      Math.ceil(this.animatedSprite.getFrameHeight() * scale),
    );
    return {
      minX: drawX,
      minY: drawY,
      maxX: drawX + width,
      maxY: drawY + height,
    };
  }
}
