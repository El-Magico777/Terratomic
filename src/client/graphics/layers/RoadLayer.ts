import { GameView } from "../../../core/game/GameView";
import { Layer } from "./Layer";

export class RoadLayer implements Layer {
  constructor(
    private game: GameView,
    private canvas: HTMLCanvasElement,
  ) {}

  tick(): void {
    if (!this.game.config().debugRoads()) {
      return;
    }
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const drawnConnections = new Set<string>();

    for (const [startTile, endTiles] of this.game.roadConnections.entries()) {
      for (const endTile of endTiles) {
        const startCoords = this.game.cell(startTile);
        const endCoords = this.game.cell(endTile);

        // Avoid drawing the same line twice
        const connectionKey = [startTile, endTile].sort().join("-");
        if (drawnConnections.has(connectionKey)) {
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(endCoords.x, endCoords.y);
        ctx.stroke();

        drawnConnections.add(connectionKey);
      }
    }
  }
}
