import {
  MainToWorkerMessage,
  TerritoryComputeState,
  TerritoryFrameRequest,
  TerritoryFrameResult,
  UnitType,
} from "./types";

const hasOffscreenCanvas = "OffscreenCanvas" in self;
let offscreenCanvas: OffscreenCanvas;
let ctx: OffscreenCanvasRenderingContext2D;
let painter: TerritoryPainter | null = null;

class TerritoryPainter {
  constructor(private state: TerritoryComputeState) {}

  updateTile(tile: number, ownerId: number, fallout: boolean) {
    this.state.tileOwnerBuffer[tile] = ownerId;
    this.state.tileFalloutBuffer[tile] = fallout ? 1 : 0;
  }

  addPlayer(player: { id: number; allies: number[] }, theme: any) {
    this.state.players.push(player);
    this.state.theme.territoryColors[player.id] = theme.territoryColor;
    this.state.theme.borderColors[player.id] = theme.borderColor;
    this.state.theme.defendedBorderColors[player.id] =
      theme.defendedBorderColors;
  }

  paint(request: TerritoryFrameRequest) {
    const {
      visibleRect,
      alternativeView,
      highlightedTerritoryId,
      focusedPlayerId,
    } = request;
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    for (let y = visibleRect.y0; y <= visibleRect.y1; y++) {
      for (let x = visibleRect.x0; x <= visibleRect.x1; x++) {
        const tile = y * this.state.width + x;
        const relativeX = x - visibleRect.x0;
        const relativeY = y - visibleRect.y0;
        this.paintTerritory(
          tile,
          relativeX,
          relativeY,
          alternativeView,
          highlightedTerritoryId,
          focusedPlayerId,
        );
      }
    }
  }

  private paintTerritory(
    tile: number,
    x: number,
    y: number,
    alternativeView: boolean,
    highlightedTerritoryId: number | null,
    focusedPlayerId: number | null,
  ) {
    const ownerId = this.state.tileOwnerBuffer[tile];

    if (ownerId === 0) {
      // Terra Nullius
      if (this.state.tileFalloutBuffer[tile]) {
        this.paintTile(x, y, this.state.theme.falloutColor, 150);
      } else {
        // Cleared by default
      }
      return;
    }

    const owner = this.state.players.find((p) => p.id === ownerId);
    if (!owner) {
      return; // Cleared by default
    }

    const isHighlighted = highlightedTerritoryId === owner.id;

    if (alternativeView) {
      let color = this.isFriendly(owner)
        ? this.state.theme.allyColor
        : this.state.theme.enemyColor;
      if (owner.id === this.state.myPlayerId) {
        color = this.state.theme.selfColor;
      }
      this.paintTile(
        x,
        y,
        color,
        this.isBorder(tile, ownerId) ? 255 : isHighlighted ? 150 : 60,
      );
    } else {
      if (this.isBorder(tile, ownerId)) {
        const playerIsFocused = focusedPlayerId === owner.id;
        if (this.hasUnitNearby(tile, UnitType.DefensePost, ownerId)) {
          const borderColors = this.state.theme.defendedBorderColors[ownerId];
          const lightTile =
            (x % 2 === 0 && y % 2 === 0) || (y % 2 === 1 && x % 2 === 1);
          const borderColor = lightTile
            ? borderColors.light
            : borderColors.dark;
          this.paintTile(x, y, borderColor, 255);
        } else {
          const useBorderColor = playerIsFocused
            ? this.state.theme.focusedBorderColor
            : this.state.theme.borderColors[ownerId];
          this.paintTile(x, y, useBorderColor, 255);
        }
      } else {
        this.paintTile(x, y, this.state.theme.territoryColors[ownerId], 150);
      }
    }
  }

  private paintTile(
    x: number,
    y: number,
    color: { r: number; g: number; b: number },
    alpha: number,
  ) {
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha / 255})`;
    ctx.fillRect(x, y, 1, 1);
  }

  private isBorder(tile: number, ownerId: number): boolean {
    const x = tile % this.state.width;
    const y = Math.floor(tile / this.state.width);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (
          nx >= 0 &&
          nx < this.state.width &&
          ny >= 0 &&
          ny < this.state.height
        ) {
          const neighborTile = ny * this.state.width + nx;
          if (this.state.tileOwnerBuffer[neighborTile] !== ownerId) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private hasUnitNearby(
    tile: number,
    unitType: UnitType,
    ownerId: number,
  ): boolean {
    const searchRangeSq =
      this.state.defensePostRange * this.state.defensePostRange;
    const x1 = tile % this.state.width;
    const y1 = Math.floor(tile / this.state.width);

    for (const unit of this.state.units) {
      if (unit.type === unitType && unit.ownerId === ownerId) {
        const x2 = unit.tile % this.state.width;
        const y2 = Math.floor(unit.tile / this.state.width);
        const distSq = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
        if (distSq <= searchRangeSq) {
          return true;
        }
      }
    }
    return false;
  }

  private isFriendly(player: { id: number; allies: number[] }): boolean {
    const myPlayer = this.state.players.find(
      (p) => p.id === this.state.myPlayerId,
    );
    if (!myPlayer) return false;
    return myPlayer.allies.includes(player.id) || myPlayer.id === player.id;
  }
}

self.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  const { type } = event.data;

  if (type === "init") {
    painter = new TerritoryPainter(event.data.state);
    console.log(
      "Worker initialized. OffscreenCanvas support:",
      hasOffscreenCanvas,
    );
  } else if (type === "update-tile") {
    if (painter) {
      painter.updateTile(
        event.data.tile,
        event.data.ownerId,
        event.data.fallout,
      );
    }
  } else if (type === "add-player") {
    if (painter) {
      painter.addPlayer(event.data.player, event.data.theme);
    }
  } else if (type === "render") {
    if (!painter) {
      console.error("Worker received render request before initialization.");
      return;
    }

    const { request } = event.data;
    const { visibleRect } = request;
    const width = visibleRect.x1 - visibleRect.x0 + 1;
    const height = visibleRect.y1 - visibleRect.y0 + 1;

    if (width <= 0 || height <= 0) {
      return; // Nothing to render
    }

    if (!hasOffscreenCanvas) {
      // Fallback path: create a buffer and send it back
      // This is the slow path that we want to avoid.
      const buffer = new Uint8ClampedArray(width * height * 4);
      // The painter logic would need to be adapted to write to this buffer.
      // For now, we'll skip this to focus on the OffscreenCanvas path.
      return;
    }

    if (
      !offscreenCanvas ||
      offscreenCanvas.width !== width ||
      offscreenCanvas.height !== height
    ) {
      offscreenCanvas = new OffscreenCanvas(width, height);
      const newCtx = offscreenCanvas.getContext("2d");
      if (!newCtx) {
        console.error("Failed to get 2D context from OffscreenCanvas");
        return;
      }
      ctx = newCtx as OffscreenCanvasRenderingContext2D;
    }

    painter.paint(request);

    const bitmap = offscreenCanvas.transferToImageBitmap();
    const result: TerritoryFrameResult = {
      token: request.token,
      kind: "bitmap",
      bitmap,
      visibleRect: request.visibleRect,
    };

    (self as any as Worker).postMessage({ type: "result", result: result }, [
      result.bitmap,
    ]);
  }
};
