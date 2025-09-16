import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Colord } from "colord";
import { Theme } from "../../../core/configuration/Config";
import { EventBus } from "../../../core/EventBus";
import { Cell, PlayerType, UnitType } from "../../../core/game/Game";
import { euclDistFN, TileRef } from "../../../core/game/GameMap";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView, PlayerView } from "../../../core/game/GameView";
import { PseudoRandom } from "../../../core/PseudoRandom";
import {
  AlternateViewEvent,
  DragEvent,
  MouseOverEvent,
} from "../../InputHandler";
import {
  MainToWorkerMessage,
  TerritoryComputeState,
  TerritoryFrameRequest,
  WorkerTheme,
  WorkerToMainMessage,
} from "../../workers/types";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

export class TerritoryLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private imageData: ImageData;
  private alternativeImageData: ImageData;

  private tileToRenderQueue: PriorityQueue<{
    tile: TileRef;
    lastUpdate: number;
  }> = new PriorityQueue((a, b) => {
    return a.lastUpdate - b.lastUpdate;
  });
  private random = new PseudoRandom(123);
  private theme: Theme;

  // Used for spawn highlighting
  private highlightCanvas: HTMLCanvasElement;
  private highlightContext: CanvasRenderingContext2D;

  private highlightedTerritory: PlayerView | null = null;

  private alternativeView = false;
  private lastDragTime = 0;
  private nodrawDragDuration = 200;
  private lastMousePosition: { x: number; y: number } | null = null;

  // --- Worker Properties ---
  private worker: Worker | null = null;
  private workerEnabled = false;
  private workerInitialized = false;
  private inFlight = false;
  private latestToken = 0;
  private inFlightTimeoutId: number | null = null;
  private fallbackImageData: ImageData | null = null;
  private snapshotCanvas: HTMLCanvasElement; // For legacy path
  private bitmapInFlight = false; // For legacy path
  private bitmapToken = 0; // For legacy path
  private sentPlayerIDs = new Set<number>();
  // --- End of Worker Properties ---

  private useBitmapRendering = false; // Legacy path

  private refreshRate = 15; //refresh every 15ms
  private lastRefresh = 0;

  private lastFocusedPlayer: PlayerView | null = null;

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
  ) {
    this.theme = game.config().theme();
  }

  shouldTransform(): boolean {
    return true;
  }

  async paintPlayerBorder(player: PlayerView) {
    const tiles = await player.borderTiles();
    tiles.borderTiles.forEach((tile: TileRef) => {
      this.paintTerritory(tile, true); // Immediately paint the tile instead of enqueueing
    });
  }

  tick() {
    if (this.workerEnabled && !this.workerInitialized) {
      this.initializeWorker();
    }

    if (this.workerEnabled && this.workerInitialized) {
      for (const player of this.game.playerViews()) {
        if (!this.sentPlayerIDs.has(player.smallID())) {
          const newPlayerData = {
            id: player.smallID(),
            allies: player.allies().map((ally) => ally.smallID()),
          };
          const theme = this.game.config().theme();
          const newPlayerTheme = {
            territoryColor: theme.territoryColor(player).toRgb(),
            borderColor: theme.borderColor(player).toRgb(),
            defendedBorderColors: {
              light: theme.defendedBorderColors(player).light.toRgb(),
              dark: theme.defendedBorderColors(player).dark.toRgb(),
            },
          };

          this.worker?.postMessage({
            type: "add-player",
            player: newPlayerData,
            theme: newPlayerTheme,
          });

          this.sentPlayerIDs.add(player.smallID());
        }
      }
    }

    this.game.recentlyUpdatedTiles().forEach((t) => {
      if (this.workerEnabled) {
        this.worker?.postMessage({
          type: "update-tile",
          tile: t,
          ownerId: this.game.ownerID(t),
          fallout: this.game.hasFallout(t),
        });
      } else {
        this.enqueueTile(t);
      }
    });
    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    unitUpdates.forEach((update) => {
      if (update.unitType === UnitType.DefensePost) {
        const tile = update.pos;
        this.game
          .bfs(tile, euclDistFN(tile, this.game.config().defensePostRange()))
          .forEach((t) => {
            if (
              this.game.isBorder(t) &&
              (this.game.ownerID(t) === update.ownerID ||
                this.game.ownerID(t) === update.lastOwnerID)
            ) {
              this.enqueueTile(t);
            }
          });
      }
    });

    // Detect alliance mutations
    const myPlayer = this.game.myPlayer();
    if (myPlayer) {
      updates?.[GameUpdateType.BrokeAlliance]?.forEach((update) => {
        const territory = this.game.playerBySmallID(update.betrayedID);
        console.log("betrayedID", update.betrayedID);
        console.log("territory", territory);
        if (territory && territory instanceof PlayerView) {
          this.redrawTerritory(territory);
        }
      });

      updates?.[GameUpdateType.AllianceRequestReply]?.forEach((update) => {
        if (
          update.accepted &&
          (update.request.requestorID === myPlayer.smallID() ||
            update.request.recipientID === myPlayer.smallID())
        ) {
          const territoryId =
            update.request.requestorID === myPlayer.smallID()
              ? update.request.recipientID
              : update.request.requestorID;
          const territory = this.game.playerBySmallID(territoryId);
          if (territory && territory instanceof PlayerView) {
            this.redrawTerritory(territory);
          }
        }
      });
    }

    const focusedPlayer = this.game.focusedPlayer();
    if (focusedPlayer !== this.lastFocusedPlayer) {
      if (this.lastFocusedPlayer) {
        this.paintPlayerBorder(this.lastFocusedPlayer);
      }
      if (focusedPlayer) {
        this.paintPlayerBorder(focusedPlayer);
      }
      this.lastFocusedPlayer = focusedPlayer;
    }

    if (!this.game.inSpawnPhase()) {
      return;
    }
    if (this.game.ticks() % 5 === 0) {
      return;
    }

    this.highlightContext.clearRect(
      0,
      0,
      this.game.width(),
      this.game.height(),
    );
    const humans = this.game
      .playerViews()
      .filter((p) => p.type() === PlayerType.Human);

    for (const human of humans) {
      const center = human.nameLocation();
      if (!center) {
        continue;
      }
      const centerTile = this.game.ref(center.x, center.y);
      if (!centerTile) {
        continue;
      }
      let color = this.theme.spawnHighlightColor();
      const myPlayer = this.game.myPlayer();
      if (
        myPlayer !== null &&
        myPlayer !== human &&
        myPlayer.isFriendly(human)
      ) {
        color = this.theme.selfColor();
      }
      for (const tile of this.game.bfs(
        centerTile,
        euclDistFN(centerTile, 9, true),
      )) {
        if (!this.game.hasOwner(tile)) {
          this.paintHighlightTile(tile, color, 255);
        }
      }
    }
  }

  init() {
    this.eventBus.on(MouseOverEvent, (e) => this.onMouseOver(e));
    this.eventBus.on(AlternateViewEvent, (e) => {
      this.alternativeView = e.alternateView;
    });
    this.eventBus.on(DragEvent, (e) => {
      // TODO: consider re-enabling this on mobile or low end devices for smoother dragging.
      // this.lastDragTime = Date.now();
    });

    this.workerEnabled = this.game.config().USE_WORKER_TERRITORY_LAYER();

    // Note: Worker initialization is deferred to the tick() method to ensure myPlayer is available.
    if (!this.workerEnabled) {
      this.useBitmapRendering =
        this.game.config().USE_BITMAP_TERRITORY_LAYER() &&
        typeof createImageBitmap === "function";
      this.snapshotCanvas = document.createElement("canvas");
    }

    this.redraw();
  }

  private initializeWorker() {
    const myPlayer = this.game.myPlayer();
    if (!myPlayer) {
      return; // Defer initialization
    }

    this.workerInitialized = true;

    this.worker = new Worker(
      new URL("../../workers/TerritoryWorker.ts", import.meta.url),
    );

    this.worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      if (this.inFlightTimeoutId) {
        clearTimeout(this.inFlightTimeoutId);
        this.inFlightTimeoutId = null;
      }

      const { result } = event.data;
      if (result.token !== this.latestToken) {
        if (result.kind === "bitmap") result.bitmap.close();
        return; // Stale result, do nothing.
      }

      const { visibleRect } = result;
      const w = visibleRect.x1 - visibleRect.x0 + 1;
      const h = visibleRect.y1 - visibleRect.y0 + 1;

      if (result.kind === "bitmap") {
        this.context.clearRect(visibleRect.x0, visibleRect.y0, w, h);
        this.context.drawImage(result.bitmap, visibleRect.x0, visibleRect.y0);
        result.bitmap.close();
      } else {
        // Fallback for browsers without OffscreenCanvas
        if (
          !this.fallbackImageData ||
          this.fallbackImageData.width !== w ||
          this.fallbackImageData.height !== h
        ) {
          this.fallbackImageData = new ImageData(w, h);
        }
        this.fallbackImageData.data.set(result.buffer);
        if (this.context && this.fallbackImageData) {
          createImageBitmap(this.fallbackImageData).then((bmp) => {
            this.context.clearRect(visibleRect.x0, visibleRect.y0, w, h);
            this.context.drawImage(bmp, visibleRect.x0, visibleRect.y0);
            bmp.close();
          });
        }
      }

      this.inFlight = false;
    };

    const players = this.game.playerViews().map((p) => ({
      id: p.smallID(),
      allies: p.allies().map((ally) => ally.smallID()),
    }));

    const theme = this.game.config().theme();
    const workerTheme: WorkerTheme = {
      territoryColors: {},
      borderColors: {},
      defendedBorderColors: {},
      focusedBorderColor: theme.focusedBorderColor().toRgb(),
      falloutColor: theme.falloutColor().toRgb(),
      selfColor: theme.selfColor().toRgb(),
      allyColor: theme.allyColor().toRgb(),
      enemyColor: theme.enemyColor().toRgb(),
    };

    for (const player of this.game.playerViews()) {
      workerTheme.territoryColors[player.smallID()] = theme
        .territoryColor(player)
        .toRgb();
      workerTheme.borderColors[player.smallID()] = theme
        .borderColor(player)
        .toRgb();
      const defendedColors = theme.defendedBorderColors(player);
      workerTheme.defendedBorderColors[player.smallID()] = {
        light: defendedColors.light.toRgb(),
        dark: defendedColors.dark.toRgb(),
      };
    }

    const numTiles = this.game.width() * this.game.height();
    const tileOwnerBuffer = new Uint16Array(numTiles);
    const tileFalloutBuffer = new Uint8Array(numTiles);
    this.game.forEachTile((t) => {
      tileOwnerBuffer[t] = this.game.ownerID(t);
      tileFalloutBuffer[t] = this.game.hasFallout(t) ? 1 : 0;
    });

    const workerUnits = this.game.units(UnitType.DefensePost).map((u) => ({
      type: u.type(),
      tile: u.tile(),
      ownerId: u.owner().smallID(),
    }));

    const initialState: TerritoryComputeState = {
      tileOwnerBuffer,
      tileFalloutBuffer,
      players,
      theme: workerTheme,
      myPlayerId: myPlayer.smallID(),
      width: this.game.width(),
      height: this.game.height(),
      units: workerUnits,
      defensePostRange: this.game.config().defensePostRange(),
    };

    const initMessage: MainToWorkerMessage = {
      type: "init",
      state: initialState,
    };
    this.worker.postMessage(initMessage, [
      tileOwnerBuffer.buffer,
      tileFalloutBuffer.buffer,
    ]);

    this.sentPlayerIDs = new Set(players.map((p) => p.id));
  }

  onMouseOver(event: MouseOverEvent) {
    this.lastMousePosition = { x: event.x, y: event.y };
    this.updateHighlightedTerritory();
  }

  private updateHighlightedTerritory() {
    if (!this.alternativeView) {
      return;
    }

    if (!this.lastMousePosition) {
      return;
    }

    const cell = this.transformHandler.screenToWorldCoordinates(
      this.lastMousePosition.x,
      this.lastMousePosition.y,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return;
    }

    const previousTerritory = this.highlightedTerritory;
    const territory = this.getTerritoryAtCell(cell);

    if (territory) {
      this.highlightedTerritory = territory;
    } else {
      this.highlightedTerritory = null;
    }

    if (previousTerritory?.id() !== this.highlightedTerritory?.id()) {
      const territories: PlayerView[] = [];
      if (previousTerritory) {
        territories.push(previousTerritory);
      }
      if (this.highlightedTerritory) {
        territories.push(this.highlightedTerritory);
      }
      this.redrawTerritory(territories);
    }
  }

  private getTerritoryAtCell(cell: { x: number; y: number }) {
    const tile = this.game.ref(cell.x, cell.y);
    if (!tile) {
      return null;
    }
    // If the tile has no owner, it is either a fallout tile or a terra nullius tile.
    if (!this.game.hasOwner(tile)) {
      return null;
    }
    const owner = this.game.owner(tile);
    return owner instanceof PlayerView ? owner : null;
  }

  redraw() {
    console.log("redrew territory layer");
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d");
    if (context === null) throw new Error("2d context not supported");
    this.context = context;
    this.canvas.width = this.game.width();
    this.canvas.height = this.game.height();

    this.imageData = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.alternativeImageData = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.initImageData();

    this.context.putImageData(
      this.alternativeView ? this.alternativeImageData : this.imageData,
      0,
      0,
    );

    // Add a second canvas for highlights
    this.highlightCanvas = document.createElement("canvas");
    const highlightContext = this.highlightCanvas.getContext("2d", {
      alpha: true,
    });
    if (highlightContext === null) throw new Error("2d context not supported");
    this.highlightContext = highlightContext;
    this.highlightCanvas.width = this.game.width();
    this.highlightCanvas.height = this.game.height();

    this.game.forEachTile((t) => {
      this.paintTerritory(t);
    });
  }

  redrawTerritory(territory: PlayerView | PlayerView[]) {
    const territories = Array.isArray(territory) ? territory : [territory];
    const territorySet = new Set(territories);

    this.game.forEachTile((t) => {
      const owner = this.game.owner(t) as PlayerView;
      if (territorySet.has(owner)) {
        this.paintTerritory(t);
      }
    });
  }

  initImageData() {
    this.game.forEachTile((tile) => {
      const cell = new Cell(this.game.x(tile), this.game.y(tile));
      const index = cell.y * this.game.width() + cell.x;
      const offset = index * 4;
      this.imageData.data[offset + 3] = 0;
      this.alternativeImageData.data[offset + 3] = 0;
    });
  }

  renderLayer(mainContext: CanvasRenderingContext2D): void {
    // When the worker is enabled, the main thread's job is just to composite
    // the latest canvas image and request new frames.
    if (this.workerEnabled) {
      const now = performance.now();
      if (now > this.lastRefresh + this.refreshRate) {
        this.lastRefresh = now;

        if (!this.inFlight) {
          this.inFlight = true;

          // Set a timeout to handle unresponsive frames.
          this.inFlightTimeoutId = setTimeout(() => {
            console.warn("TerritoryLayer worker frame timed out.");
            this.inFlight = false;
            this.latestToken++; // Invalidate the in-flight request
          }, 300) as unknown as number;

          const [topLeft, bottomRight] =
            this.transformHandler.screenBoundingRect();

          const request: TerritoryFrameRequest = {
            token: this.latestToken,
            visibleRect: {
              x0: Math.max(0, topLeft.x),
              y0: Math.max(0, topLeft.y),
              x1: Math.min(this.game.width() - 1, bottomRight.x),
              y1: Math.min(this.game.height() - 1, bottomRight.y),
            },
            alternativeView: this.alternativeView,
            highlightedTerritoryId:
              this.highlightedTerritory?.smallID() ?? null,
            focusedPlayerId: this.game.focusedPlayer()?.smallID() ?? null,
          };

          const message: MainToWorkerMessage = { type: "render", request };
          this.worker?.postMessage(message);
        }
      }
    } else {
      // Fallback to old rendering logic if worker is disabled
      this.renderTerritory();
      const now = Date.now();
      if (now > this.lastRefresh + this.refreshRate) {
        this.lastRefresh = now;
        const [topLeft, bottomRight] =
          this.transformHandler.screenBoundingRect();
        const vx0 = Math.max(0, topLeft.x);
        const vy0 = Math.max(0, topLeft.y);
        const w = Math.min(this.game.width(), bottomRight.x) - vx0;
        const h = Math.min(this.game.height(), bottomRight.y) - vy0;

        if (w > 0 && h > 0) {
          const sourceImageData = this.alternativeView
            ? this.alternativeImageData
            : this.imageData;
          this.context.putImageData(sourceImageData, 0, 0, vx0, vy0, w, h);
        }
      }
    }

    // ALWAYS composite our updated off-screen canvas to the main display.
    mainContext.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
    );
    if (this.game.inSpawnPhase()) {
      mainContext.drawImage(
        this.highlightCanvas,
        -this.game.width() / 2,
        -this.game.height() / 2,
      );
    }
  }

  renderTerritory() {
    let numToRender = Math.floor(this.tileToRenderQueue.size() / 10);
    if (numToRender === 0 || this.game.inSpawnPhase()) {
      numToRender = this.tileToRenderQueue.size();
    }

    while (numToRender > 0) {
      numToRender--;

      const entry = this.tileToRenderQueue.pop();
      if (!entry) {
        break;
      }

      const tile = entry.tile;
      this.paintTerritory(tile);
      for (const neighbor of this.game.neighbors(tile)) {
        this.paintTerritory(neighbor, true);
      }
    }
  }

  paintTerritory(tile: TileRef, isBorder: boolean = false) {
    if (isBorder && !this.game.hasOwner(tile)) {
      return;
    }

    if (!this.game.hasOwner(tile)) {
      if (this.game.hasFallout(tile)) {
        this.paintTile(this.imageData, tile, this.theme.falloutColor(), 150);
        this.paintTile(
          this.alternativeImageData,
          tile,
          this.theme.falloutColor(),
          150,
        );
        return;
      }
      this.clearTile(tile);
      return;
    }
    const owner = this.game.owner(tile) as PlayerView;
    const isHighlighted =
      this.highlightedTerritory &&
      this.highlightedTerritory.id() === owner.id();
    const myPlayer = this.game.myPlayer();

    if (this.game.isBorder(tile)) {
      const playerIsFocused = owner && this.game.focusedPlayer() === owner;
      if (myPlayer) {
        let alternativeColor = owner.isFriendly(myPlayer)
          ? this.theme.allyColor()
          : this.theme.enemyColor();
        if (owner.smallID() === myPlayer.smallID()) {
          alternativeColor = this.theme.selfColor();
        }
        this.paintTile(this.alternativeImageData, tile, alternativeColor, 255);
      }
      if (
        this.game.hasUnitNearby(
          tile,
          this.game.config().defensePostRange(),
          UnitType.DefensePost,
          owner.id(),
        )
      ) {
        const borderColors = this.theme.defendedBorderColors(owner);
        const x = this.game.x(tile);
        const y = this.game.y(tile);
        const lightTile =
          (x % 2 === 0 && y % 2 === 0) || (y % 2 === 1 && x % 2 === 1);
        const borderColor = lightTile ? borderColors.light : borderColors.dark;
        this.paintTile(this.imageData, tile, borderColor, 255);
      } else {
        const useBorderColor = playerIsFocused
          ? this.theme.focusedBorderColor()
          : this.theme.borderColor(owner);
        this.paintTile(this.imageData, tile, useBorderColor, 255);
      }
    } else {
      if (myPlayer) {
        let alternativeColor = owner.isFriendly(myPlayer)
          ? this.theme.allyColor()
          : this.theme.enemyColor();
        // If the current player is the owner
        if (owner.smallID() === myPlayer.smallID()) {
          alternativeColor = this.theme.selfColor();
        }
        // If the tile is on a ally territory, use the ally color
        this.paintTile(
          this.alternativeImageData,
          tile,
          alternativeColor,
          isHighlighted ? 150 : 60,
        );
      }

      this.paintTile(
        this.imageData,
        tile,
        this.theme.territoryColor(owner),
        150,
      );
    }
  }

  paintTile(imageData: ImageData, tile: TileRef, color: Colord, alpha: number) {
    const offset = tile * 4;
    imageData.data[offset] = color.rgba.r;
    imageData.data[offset + 1] = color.rgba.g;
    imageData.data[offset + 2] = color.rgba.b;
    imageData.data[offset + 3] = alpha;
  }

  clearTile(tile: TileRef) {
    const offset = tile * 4;
    this.imageData.data[offset + 3] = 0; // Set alpha to 0 (fully transparent)
    this.alternativeImageData.data[offset + 3] = 0; // Set alpha to 0 (fully transparent)
  }

  enqueueTile(tile: TileRef) {
    this.tileToRenderQueue.push({
      tile: tile,
      lastUpdate: this.game.ticks() + this.random.nextFloat(0, 0.5),
    });
  }

  async enqueuePlayerBorder(player: PlayerView) {
    const playerBorderTiles = await player.borderTiles();
    playerBorderTiles.borderTiles.forEach((tile: TileRef) => {
      this.enqueueTile(tile);
    });
  }

  paintHighlightTile(tile: TileRef, color: Colord, alpha: number) {
    this.clearTile(tile);
    const x = this.game.x(tile);
    const y = this.game.y(tile);
    this.highlightContext.fillStyle = color.alpha(alpha / 255).toRgbString();
    this.highlightContext.fillRect(x, y, 1, 1);
  }

  clearHighlightTile(tile: TileRef) {
    const x = this.game.x(tile);
    const y = this.game.y(tile);
    this.highlightContext.clearRect(x, y, 1, 1);
  }
}
