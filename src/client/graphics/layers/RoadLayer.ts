import { GameView } from "../../../core/game/GameView";
import { Layer } from "./Layer";

export class RoadLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(private game: GameView) {}

  shouldTransform(): boolean {
    return true;
  }

  init() {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d")!;
    this.canvas.width = this.game.width();
    this.canvas.height = this.game.height();
    this.redraw();
  }

  redraw(): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Only draw roads if debugRoads is enabled in the config
    if (!this.game.config().debugRoads()) {
      return;
    }

    ctx.strokeStyle = "rgba(255, 255, 0, 1)"; // Yellow roads, semi-transparent
    ctx.lineWidth = 1; // Road thickness

    for (const [
      sourceTileRef,
      connectedTileRefs,
    ] of this.game.roadConnections.entries()) {
      // Get center coordinates of the source tile
      const sourceX = this.game.x(sourceTileRef) + 0.5;
      const sourceY = this.game.y(sourceTileRef) + 0.5;

      for (const targetTileRef of connectedTileRefs) {
        // Get center coordinates of the target tile
        const targetX = this.game.x(targetTileRef) + 0.5;
        const targetY = this.game.y(targetTileRef) + 0.5;

        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      }
    }
  }

  renderLayer(context: CanvasRenderingContext2D) {
    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
  }
}
