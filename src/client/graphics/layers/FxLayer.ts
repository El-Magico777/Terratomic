import { Theme } from "../../../core/configuration/Config";
import { UnitType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView, UnitView } from "../../../core/game/GameView";
import { AnimatedSpriteLoader } from "../AnimatedSpriteLoader";
import { Fx, FxType } from "../fx/Fx";
import { doomsdayFxFactory, nukeFxFactory, ShockwaveFx } from "../fx/NukeFx";
import { SpriteFx } from "../fx/SpriteFx";
import { UnitExplosionFx } from "../fx/UnitExplosionFx";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

export class FxLayer implements Layer {
  private lastRefresh: number = 0;
  // Target ~60 FPS for FX layer to reduce CPU (was 10ms ~= 100 FPS)
  private refreshRate: number = 10;
  // Adapt refresh rate under load to reduce CPU spikes
  private adaptiveRefresh: boolean = true;
  private theme: Theme;
  private animatedSpriteLoader: AnimatedSpriteLoader =
    new AnimatedSpriteLoader();

  private allFx: Fx[] = [];

  constructor(
    private game: GameView,
    private transformHandler: TransformHandler,
  ) {
    this.theme = this.game.config().theme();
  }

  shouldTransform(): boolean {
    return false;
  }

  tick() {
    this.game
      .updatesSinceLastTick()
      ?.[GameUpdateType.Unit]?.map((unit) => this.game.unit(unit.id))
      ?.forEach((unitView) => {
        if (unitView === undefined) return;
        this.onUnitEvent(unitView);
      });

    this.game
      .updatesSinceLastTick()
      ?.[GameUpdateType.BomberExplosion]?.forEach((update) => {
        const { x, y, radius } = update;
        const bomberFx = nukeFxFactory(
          this.animatedSpriteLoader,
          x,
          y,
          radius,
          this.game,
          0.2,
        );
        for (const fx of bomberFx) {
          this.allFx.push(fx);
        }
      });

    this.game
      .updatesSinceLastTick()
      ?.[GameUpdateType.DoomsdayExplosion]?.forEach((update) => {
        const { x, y, radius } = update;
        const doomFx = doomsdayFxFactory(
          this.animatedSpriteLoader,
          x,
          y,
          radius,
          this.game,
        );
        for (const fx of doomFx) {
          this.allFx.push(fx);
        }
      });
  }

  onUnitEvent(unit: UnitView) {
    switch (unit.type()) {
      case UnitType.AtomBomb:
      case UnitType.MIRVWarhead:
        this.onNukeEvent(unit, 70);
        break;
      case UnitType.HydrogenBomb:
        this.onNukeEvent(unit, 160);
        break;
      case UnitType.Warship:
        this.onWarshipEvent(unit);
        break;
      case UnitType.Shell:
        this.onShellEvent(unit);
        break;
    }
  }

  onShellEvent(unit: UnitView) {
    if (!unit.isActive()) {
      if (unit.reachedTarget()) {
        const x = this.game.x(unit.lastTile());
        const y = this.game.y(unit.lastTile());
        const shipExplosion = new SpriteFx(
          this.animatedSpriteLoader,
          x,
          y,
          FxType.MiniExplosion,
        );
        this.allFx.push(shipExplosion);
      }
    }
  }

  onWarshipEvent(unit: UnitView) {
    if (!unit.isActive()) {
      const x = this.game.x(unit.lastTile());
      const y = this.game.y(unit.lastTile());
      const shipExplosion = new UnitExplosionFx(
        this.animatedSpriteLoader,
        x,
        y,
        this.game,
      );
      this.allFx.push(shipExplosion);
      const sinkingShip = new SpriteFx(
        this.animatedSpriteLoader,
        x,
        y,
        FxType.SinkingShip,
        undefined,
        unit.owner(),
        this.theme,
      );
      this.allFx.push(sinkingShip);
    }
  }

  onNukeEvent(unit: UnitView, radius: number) {
    if (!unit.isActive()) {
      if (!unit.reachedTarget()) {
        this.handleSAMInterception(unit);
      } else {
        // Kaboom
        this.handleNukeExplosion(unit, radius);
      }
    }
  }

  handleNukeExplosion(unit: UnitView, radius: number) {
    const x = this.game.x(unit.lastTile());
    const y = this.game.y(unit.lastTile());
    const nukeFx = nukeFxFactory(
      this.animatedSpriteLoader,
      x,
      y,
      radius,
      this.game,
    );
    for (const fx of nukeFx) {
      this.allFx.push(fx);
    }
  }

  handleSAMInterception(unit: UnitView) {
    const x = this.game.x(unit.lastTile());
    const y = this.game.y(unit.lastTile());
    const explosion = new SpriteFx(
      this.animatedSpriteLoader,
      x,
      y,
      FxType.SAMExplosion,
    );
    this.allFx.push(explosion);
    const shockwave = new ShockwaveFx(x, y, 800, 40);
    this.allFx.push(shockwave);
  }

  async init() {
    try {
      this.animatedSpriteLoader.loadAllAnimatedSpriteImages();
      console.log("FX sprites loaded successfully");
    } catch (err) {
      console.error("Failed to load FX sprites:", err);
    }
  }

  renderLayer(context: CanvasRenderingContext2D) {
    const now = Date.now();
    if (this.game.config().userSettings()?.fxLayer()) {
      const delta = now - this.lastRefresh;
      // Cap delta to avoid huge jumps if tab was inactive
      const cappedDelta = Math.min(delta, 100);

      context.save();
      this.transformHandler.handleTransform(context);
      // Fix: Translate context to align absolute coordinates (0..width) with centered view
      context.translate(-this.game.width() / 2, -this.game.height() / 2);

      // Use nearest neighbor for sharp pixels
      context.imageSmoothingEnabled = false;

      this.renderAllFx(context, cappedDelta);

      context.restore();

      this.lastRefresh = now;
    }
  }

  renderAllFx(context: CanvasRenderingContext2D, delta: number) {
    if (this.allFx.length > 0) {
      // Get visible bounds for culling
      const bounds = this.transformHandler.getVisibleWorldBounds();
      // Add some padding to bounds to avoid popping
      const padding = 100;
      const visibleMinX = bounds.minX - padding;
      const visibleMaxX = bounds.maxX + padding;
      const visibleMinY = bounds.minY - padding;
      const visibleMaxY = bounds.maxY + padding;

      this.renderContextFx(
        delta,
        context,
        visibleMinX,
        visibleMaxX,
        visibleMinY,
        visibleMaxY,
      );
    }
  }

  renderContextFx(
    duration: number,
    context: CanvasRenderingContext2D,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  ) {
    for (let i = 0; i < this.allFx.length; ) {
      const fx = this.allFx[i];

      // Update state
      if (!fx.update(duration)) {
        // FX is done, remove it
        const last = this.allFx.length - 1;
        if (i !== last) this.allFx[i] = this.allFx[last];
        this.allFx.pop();
        continue;
      }

      // Culling: Only draw if visible
      let isVisible = true;
      if ("x" in fx && "y" in fx) {
        const x = (fx as any).x;
        const y = (fx as any).y;
        if (x < minX || x > maxX || y < minY || y > maxY) {
          isVisible = false;
        }
      }

      if (isVisible) {
        fx.draw(context);
      }

      i++;
    }
  }
}
