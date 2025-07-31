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

    if (!this.game.config().debugRoads()) {
      return;
    }

    ctx.fillStyle = "blue"; // Bright blue
    ctx.fillRect(100, 100, 100, 100); // Draw a 100x100 blue rectangle
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
