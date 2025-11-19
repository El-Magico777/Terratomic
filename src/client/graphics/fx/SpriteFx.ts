import { Theme } from "../../../core/configuration/Config";
import { PlayerView } from "../../../core/game/GameView";
import { AnimatedSprite } from "../AnimatedSprite";
import { AnimatedSpriteLoader } from "../AnimatedSpriteLoader";
import { Fx, FxType } from "./Fx";

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
    if (this.update(frameTime)) {
      this.draw(ctx);
      return true;
    }
    return false;
  }

  update(frameTime: number): boolean {
    if (!this.animatedSprite) return false;

    this.elapsedTime += frameTime;
    if (this.elapsedTime >= this.duration) return false;

    if (!this.animatedSprite.isActive()) return false;

    this.animatedSprite.update(frameTime);
    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.animatedSprite) {
      this.animatedSprite.draw(ctx, this.x, this.y);
    }
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  getDuration(): number {
    return this.duration;
  }
}

export class FadeFx implements Fx {
  constructor(
    private fxToFade: SpriteFx,
    private fadeIn: number,
    private fadeOut: number,
  ) {}

  renderTick(duration: number, ctx: CanvasRenderingContext2D): boolean {
    if (this.update(duration)) {
      this.draw(ctx);
      return true;
    }
    return false;
  }

  update(duration: number): boolean {
    return this.fxToFade.update(duration);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.fxToFade.getElapsedTime() / this.fxToFade.getDuration();
    ctx.save();
    ctx.globalAlpha = fadeInOut(t, this.fadeIn, this.fadeOut);
    this.fxToFade.draw(ctx);
    ctx.restore();
  }
}
