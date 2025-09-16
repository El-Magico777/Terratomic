import { colord } from "colord";
import { TileRef } from "../../../core/game/GameMap";
import { GameUpdateType, RoadsUpdate } from "../../../core/game/GameUpdates";
import { GameView, PlayerView } from "../../../core/game/GameView";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

const CHUNK_TILES = 64; // Define chunks in tile space

export class RoadLayer implements Layer {
  private roadSegments = new Set<string>();
  private tileToSegments = new Map<TileRef, Set<string>>();

  // Chunk-based rendering state
  private chunks = new Map<string, HTMLCanvasElement>();
  private dirtyChunks = new Set<string>();
  private lastZoom = 0;

  constructor(
    private game: GameView,
    private transform: TransformHandler,
  ) {}

  shouldTransform(): boolean {
    return true;
  }

  init() {
    // No longer need to create a single large canvas
    this.lastZoom = this.transform.scale;
  }

  tick() {
    const updates = this.game.updatesSinceLastTick();
    if (!updates) return;

    const roadUpdates = updates[GameUpdateType.Roads] as
      | RoadsUpdate[]
      | undefined;
    if (roadUpdates && roadUpdates.length > 0) {
      for (const update of roadUpdates) {
        for (const segment of update.removed) {
          if (this.roadSegments.has(segment)) {
            this.roadSegments.delete(segment);
            const [tile1, tile2] = this.parseSegment(segment);
            this.updateTileMap(tile1, segment, "remove");
            this.updateTileMap(tile2, segment, "remove");
            this.markChunkDirty(tile1);
            this.markChunkDirty(tile2);
          }
        }
        for (const segment of update.added) {
          if (!this.roadSegments.has(segment)) {
            this.roadSegments.add(segment);
            const [tile1, tile2] = this.parseSegment(segment);
            this.updateTileMap(tile1, segment, "add");
            this.updateTileMap(tile2, segment, "add");
            this.markChunkDirty(tile1);
            this.markChunkDirty(tile2);
          }
        }
      }
    }
  }

  private parseSegment(segment: string): [TileRef, TileRef] {
    const [tile1Str, tile2Str] = segment.split("-");
    return [
      parseInt(tile1Str, 10) as TileRef,
      parseInt(tile2Str, 10) as TileRef,
    ];
  }

  private updateTileMap(
    tile: TileRef,
    segment: string,
    action: "add" | "remove",
  ) {
    if (!this.tileToSegments.has(tile)) {
      this.tileToSegments.set(tile, new Set());
    }
    const segmentSet = this.tileToSegments.get(tile)!;
    if (action === "add") {
      segmentSet.add(segment);
    } else {
      segmentSet.delete(segment);
    }
  }

  private getChunkKey(tile: TileRef): string {
    const x = Math.floor(this.game.x(tile) / CHUNK_TILES);
    const y = Math.floor(this.game.y(tile) / CHUNK_TILES);
    return `${x}|${y}`;
  }

  private markChunkDirty(tile: TileRef) {
    this.dirtyChunks.add(this.getChunkKey(tile));
  }

  private redrawDirtyChunks() {
    if (this.dirtyChunks.size === 0) return;

    for (const chunkKey of this.dirtyChunks) {
      this.redrawChunk(chunkKey);
    }
    this.dirtyChunks.clear();
  }

  private redrawChunk(chunkKey: string) {
    const [chunkX, chunkY] = chunkKey.split("|").map(Number);
    const chunkCanvas = this.getOrCreateChunkCanvas(chunkKey);
    const ctx = chunkCanvas.getContext("2d")!;

    ctx.clearRect(0, 0, chunkCanvas.width, chunkCanvas.height);
    ctx.save();
    // Translate context to the chunk's origin for drawing
    ctx.translate(-chunkX * CHUNK_TILES, -chunkY * CHUNK_TILES);

    const segmentsToDraw = new Set<string>();
    const startX = chunkX * CHUNK_TILES;
    const startY = chunkY * CHUNK_TILES;
    const endX = startX + CHUNK_TILES;
    const endY = startY + CHUNK_TILES;

    // Gather all segments that are part of this chunk
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (this.game.isValidCoord(x, y)) {
          const tile = this.game.ref(x, y);
          const segments = this.tileToSegments.get(tile);
          if (segments) {
            segments.forEach((seg) => segmentsToDraw.add(seg));
          }
        }
      }
    }

    if (segmentsToDraw.size === 0) {
      ctx.restore();
      return;
    }

    // Group segments by owner for efficient color batching
    const segmentsByOwner = new Map<PlayerView | null, string[]>();
    for (const segment of segmentsToDraw) {
      const [tile1] = this.parseSegment(segment);
      const owner = this.game.owner(tile1);
      const playerOwner = owner.isPlayer() ? (owner as PlayerView) : null;
      if (!segmentsByOwner.has(playerOwner)) {
        segmentsByOwner.set(playerOwner, []);
      }
      segmentsByOwner.get(playerOwner)!.push(segment);
    }

    // The actual drawing logic, now scoped to a single chunk
    for (const [owner, segments] of segmentsByOwner.entries()) {
      const baseColor = owner
        ? this.game.config().theme().territoryColor(owner)
        : colord("#808080");
      const darkerColor = baseColor.darken(0.05).toRgbString();
      const evenDarkerColor = baseColor.darken(0.1).toRgbString();

      const roadWidth = 1.2 / this.transform.scale; // Adjust width for zoom
      const edgeWidth = 1.8 / this.transform.scale;

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.strokeStyle = evenDarkerColor;
      ctx.lineWidth = edgeWidth;
      ctx.beginPath();
      for (const segment of segments) {
        const [tile1, tile2] = this.parseSegment(segment);
        this.traceSegment(ctx, tile1, tile2);
      }
      ctx.stroke();

      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = roadWidth;
      ctx.beginPath();
      for (const segment of segments) {
        const [tile1, tile2] = this.parseSegment(segment);
        this.traceSegment(ctx, tile1, tile2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private getOrCreateChunkCanvas(chunkKey: string): HTMLCanvasElement {
    if (!this.chunks.has(chunkKey)) {
      const canvas = document.createElement("canvas");
      canvas.width = CHUNK_TILES;
      canvas.height = CHUNK_TILES;
      this.chunks.set(chunkKey, canvas);
    }
    return this.chunks.get(chunkKey)!;
  }

  renderLayer(context: CanvasRenderingContext2D) {
    // Check for zoom changes to invalidate all visible chunks
    const currentZoom = this.transform.scale;
    if (this.lastZoom !== currentZoom) {
      this.lastZoom = currentZoom;
      const [topLeft, bottomRight] = this.transform.screenBoundingRect();
      const startChunkX = Math.floor(topLeft.x / CHUNK_TILES);
      const startChunkY = Math.floor(topLeft.y / CHUNK_TILES);
      const endChunkX = Math.ceil(bottomRight.x / CHUNK_TILES);
      const endChunkY = Math.ceil(bottomRight.y / CHUNK_TILES);
      for (let y = startChunkY; y < endChunkY; y++) {
        for (let x = startChunkX; x < endChunkX; x++) {
          this.dirtyChunks.add(`${x}|${y}`);
        }
      }
    }

    this.redrawDirtyChunks();

    const [topLeft, bottomRight] = this.transform.screenBoundingRect();
    const startChunkX = Math.floor(topLeft.x / CHUNK_TILES);
    const startChunkY = Math.floor(topLeft.y / CHUNK_TILES);
    const endChunkX = Math.ceil(bottomRight.x / CHUNK_TILES);
    const endChunkY = Math.ceil(bottomRight.y / CHUNK_TILES);

    for (let y = startChunkY; y < endChunkY; y++) {
      for (let x = startChunkX; x < endChunkX; x++) {
        const chunkKey = `${x}|${y}`;
        if (this.chunks.has(chunkKey)) {
          const chunkCanvas = this.chunks.get(chunkKey)!;
          context.drawImage(
            chunkCanvas,
            x * CHUNK_TILES - this.game.width() / 2,
            y * CHUNK_TILES - this.game.height() / 2,
          );
        }
      }
    }
  }

  private traceSegment(
    ctx: CanvasRenderingContext2D,
    tile1: TileRef,
    tile2: TileRef,
  ) {
    const x1 = this.game.x(tile1) + 0.5;
    const y1 = this.game.y(tile1) + 0.5;
    const x2 = this.game.x(tile2) + 0.5;
    const y2 = this.game.y(tile2) + 0.5;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
}
