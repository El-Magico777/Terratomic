import { EventBus } from "../../../core/EventBus";
import { GameView, UnitView } from "../../../core/game/GameView";
import {
  ClearHighlightEvent,
  HighlightStructureEvent,
} from "../../HighlightEvents";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

export class HighlightLayer implements Layer {
  private unitsToHighlight: UnitView[] = [];

  constructor(
    private eventBus: EventBus,
    private game: GameView,
    private transform: TransformHandler,
  ) {}

  public init() {
    this.eventBus.on(HighlightStructureEvent, (event) => {
      const player = this.game.player(event.playerID);
      if (player) {
        this.unitsToHighlight = player.units(event.unitType);
      } else {
        // Player not found, do nothing or handle as needed
      }
    });

    this.eventBus.on(ClearHighlightEvent, () => {
      this.unitsToHighlight = [];
    });
  }

  public renderLayer(context: CanvasRenderingContext2D) {
    context.save();
    context.strokeStyle = "yellow"; // Change to bright red
    context.lineWidth = 3; // Make it very thick
    context.shadowColor = "yellow";
    context.shadowBlur = 10; // Increase shadow blur for more visibility
    context.fillStyle = "rgba(255, 204, 0, 0.34)"; // Add a semi-transparent red fill

    for (const unit of this.unitsToHighlight) {
      // Use world coordinates directly for drawing
      const worldX = this.game.x(unit.tile()) + 0.5 - this.game.width() / 2; // Center of the tile, then shift to be relative to game center
      const worldY = this.game.y(unit.tile()) + 0.5 - this.game.height() / 2; // Center of the tile, then shift to be relative to game center

      // No need for worldToScreenCoordinates here, as setTransform handles it
      // const { x, y } = this.transform.worldToScreenCoordinates(new Cell(worldX, worldY));

      context.beginPath();
      // Draw directly using world coordinates. The canvas transformation will handle scaling and panning.
      context.arc(worldX, worldY, 20 / this.transform.scale, 0, Math.PI * 2);
      context.stroke();
      context.fill(); // Fill the circle
    }

    context.restore();
  }

  public shouldTransform() {
    return true;
  }
}
