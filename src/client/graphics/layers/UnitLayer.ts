import { colord, Colord } from "colord";
import { EventBus } from "../../../core/EventBus";
import { Theme } from "../../../core/configuration/Config";
import { UnitType } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView, UnitView } from "../../../core/game/GameView";
import { BezenhamLine } from "../../../core/utilities/Line";
import {
  AlternateViewEvent,
  MouseUpEvent,
  ReplaySpeedChangeEvent,
  UnitSelectionEvent,
} from "../../InputHandler";
import {
  MoveFighterJetIntentEvent,
  MoveSubmarineIntentEvent,
  MoveWarshipIntentEvent,
} from "../../Transport";
import {
  defaultReplaySpeedMultiplier,
  ReplaySpeedMultiplier,
} from "../../utilities/ReplaySpeedMultiplier";
import { TransformHandler } from "../TransformHandler";
import { UIState } from "../UIState";
import { Layer } from "./Layer";

import { getColoredSprite, loadAllSprites } from "../SpriteLoader";

enum Relationship {
  Self,
  Ally,
  Enemy,
}

export class UnitLayer implements Layer {
  private transportShipTrailCanvas: HTMLCanvasElement;
  private unitTrailContext: CanvasRenderingContext2D;

  private unitToTrail = new Map<UnitView, TileRef[]>();
  private unitToLastAngle = new Map<UnitView, number>();
  private theme: Theme;
  private alternateView = false;
  private oldShellTile = new Map<UnitView, TileRef>();
  private transformHandler: TransformHandler;
  private selectedUnit: UnitView | null = null;

  // Configuration for unit selection
  private readonly WARSHIP_SELECTION_RADIUS = 10;
  private readonly SUBMARINE_SELECTION_RADIUS = 10;
  private readonly FIGHTER_JET_SELECTION_RADIUS = 10;

  // Unit types that should be interpolated between ticks
  private readonly interpolatedUnitTypes: UnitType[] = [
    UnitType.SAMMissile,
    UnitType.AtomBomb,
    UnitType.HydrogenBomb,
    UnitType.MIRV,
    UnitType.MIRVWarhead,
    UnitType.Shell,
    UnitType.Warship,
    UnitType.TransportShip,
    UnitType.TradeShip,
    UnitType.Submarine,
    UnitType.Bomber,
    UnitType.FighterJet,
    UnitType.CargoPlane,
  ];

  private baseTickIntervalMs = 100;
  private tickIntervalMs = 100;
  private replaySpeedMultiplier: ReplaySpeedMultiplier =
    defaultReplaySpeedMultiplier;
  private lastTickTimestamp = 0;

  // Cache sprite sizes per UnitType
  private spriteSizeCache = new Map<UnitType, number>();

  private ghosts: Array<{
    id: number;
    pos: number;
    expiresAt: number;
    ownerID: number;
  }> = [];

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    transformHandler: TransformHandler,
    private uiState: UIState,
  ) {
    this.theme = game.config().theme();
    this.transformHandler = transformHandler;
    this.baseTickIntervalMs = this.game
      .config()
      .serverConfig()
      .turnIntervalMs();
    this.updateTickInterval();
    this.lastTickTimestamp = this.now();
  }

  shouldTransform(): boolean {
    return false;
  }

  tick() {
    this.lastTickTimestamp = this.now();
    const configuredInterval = this.game
      .config()
      .serverConfig()
      .turnIntervalMs();
    if (configuredInterval !== this.baseTickIntervalMs) {
      this.baseTickIntervalMs = configuredInterval;
      this.updateTickInterval();
    }

    // Update ghosts data
    this.ghosts = (this.game as any).submarineGhosts?.call(this.game) ?? [];
  }

  init() {
    this.eventBus.on(AlternateViewEvent, (e) => this.onAlternativeViewEvent(e));
    this.eventBus.on(MouseUpEvent, (e) => this.onMouseUp(e));
    this.eventBus.on(UnitSelectionEvent, (e) => this.onUnitSelectionChange(e));
    this.eventBus.on(ReplaySpeedChangeEvent, (e) =>
      this.onReplaySpeedChange(e.replaySpeedMultiplier),
    );
    this.redraw();

    loadAllSprites();
  }

  private findWarshipsNearCell(cell: { x: number; y: number }): UnitView[] {
    if (!this.game.isValidCoord(cell.x, cell.y)) return [];
    const clickRef = this.game.ref(cell.x, cell.y);
    return this.game
      .units(UnitType.Warship)
      .filter(
        (unit) =>
          unit.isActive() &&
          unit.owner() === this.game.myPlayer() &&
          this.game.manhattanDist(unit.tile(), clickRef) <=
            this.WARSHIP_SELECTION_RADIUS,
      )
      .sort((a, b) => {
        const distA = this.game.manhattanDist(a.tile(), clickRef);
        const distB = this.game.manhattanDist(b.tile(), clickRef);
        return distA - distB;
      });
  }

  private findSubmarinesNearCell(cell: { x: number; y: number }): UnitView[] {
    if (!this.game.isValidCoord(cell.x, cell.y)) return [];
    const clickRef = this.game.ref(cell.x, cell.y);
    return this.game
      .units(UnitType.Submarine)
      .filter(
        (unit) =>
          unit.isActive() &&
          unit.owner() === this.game.myPlayer() &&
          this.game.manhattanDist(unit.tile(), clickRef) <=
            this.SUBMARINE_SELECTION_RADIUS,
      )
      .sort((a, b) => {
        const distA = this.game.manhattanDist(a.tile(), clickRef);
        const distB = this.game.manhattanDist(b.tile(), clickRef);
        return distA - distB;
      });
  }

  private findFighterJetsNearCell(cell: { x: number; y: number }): UnitView[] {
    if (!this.game.isValidCoord(cell.x, cell.y)) return [];
    const clickRef = this.game.ref(cell.x, cell.y);
    return this.game
      .units(UnitType.FighterJet)
      .filter(
        (unit) =>
          unit.isActive() &&
          unit.owner() === this.game.myPlayer() &&
          this.game.manhattanDist(unit.tile(), clickRef) <=
            this.FIGHTER_JET_SELECTION_RADIUS,
      )
      .sort((a, b) => {
        const distA = this.game.manhattanDist(a.tile(), clickRef);
        const distB = this.game.manhattanDist(b.tile(), clickRef);
        return distA - distB;
      });
  }

  private onMouseUp(event: MouseUpEvent) {
    const cell = this.transformHandler.screenToWorldCoordinates(
      event.x,
      event.y,
    );
    const nearbyWarships = this.findWarshipsNearCell(cell);
    const nearbySubmarines = this.findSubmarinesNearCell(cell);
    const nearbyFighterJets = this.findFighterJetsNearCell(cell);

    if (this.selectedUnit) {
      const clickRef = this.game.ref(cell.x, cell.y);
      if (this.selectedUnit.type() === UnitType.FighterJet) {
        this.eventBus.emit(
          new MoveFighterJetIntentEvent(this.selectedUnit.id(), clickRef),
        );
      } else if (
        this.selectedUnit.type() === UnitType.Warship &&
        this.game.isOcean(clickRef)
      ) {
        this.eventBus.emit(
          new MoveWarshipIntentEvent(this.selectedUnit.id(), clickRef),
        );
      } else if (
        this.selectedUnit.type() === UnitType.Submarine &&
        this.game.isOcean(clickRef)
      ) {
        this.eventBus.emit(
          new MoveSubmarineIntentEvent(this.selectedUnit.id(), clickRef),
        );
      }
      event.consumed = true;
      this.eventBus.emit(new UnitSelectionEvent(this.selectedUnit, false));
      return;
    } else if (nearbyWarships.length > 0) {
      this.eventBus.emit(new UnitSelectionEvent(nearbyWarships[0], true));
    } else if (nearbySubmarines.length > 0) {
      this.eventBus.emit(new UnitSelectionEvent(nearbySubmarines[0], true));
    } else if (nearbyFighterJets.length > 0) {
      this.eventBus.emit(new UnitSelectionEvent(nearbyFighterJets[0], true));
    }
  }

  private onUnitSelectionChange(event: UnitSelectionEvent) {
    if (event.isSelected) {
      this.selectedUnit = event.unit;
    } else if (this.selectedUnit === event.unit) {
      this.selectedUnit = null;
    }
  }

  private handleUnitDeactivation(unit: UnitView) {
    if (this.selectedUnit === unit && !unit.isActive()) {
      this.eventBus.emit(new UnitSelectionEvent(unit, false));
    }
    this.unitToLastAngle.delete(unit);
    this.clearTrail(unit);
  }

  renderLayer(context: CanvasRenderingContext2D) {
    context.save();
    this.transformHandler.handleTransform(context);
    // Fix: Translate context to align absolute coordinates (0..width) with centered view
    context.translate(-this.game.width() / 2, -this.game.height() / 2);
    context.imageSmoothingEnabled = false;

    // Draw trails (offscreen canvas)
    context.drawImage(this.transportShipTrailCanvas, 0, 0);

    const bounds = this.transformHandler.getVisibleWorldBounds();
    const padding = 100;
    const visibleMinX = bounds.minX - padding;
    const visibleMaxX = bounds.maxX + padding;
    const visibleMinY = bounds.minY - padding;
    const visibleMaxY = bounds.maxY + padding;

    const scale = this.transformHandler.scale;
    const useLOD = scale < 0.4;

    const alpha = this.computeTickAlpha();
    const units = this.game.units();

    for (const unit of units) {
      if (!unit.isActive()) {
        this.handleUnitDeactivation(unit);
        continue;
      }

      if (
        unit.type() === UnitType.Submarine &&
        unit.owner() !== this.game.myPlayer()
      ) {
        // Server handles visibility
      }

      const startTile = unit.lastTile();
      const startX = this.game.x(startTile);
      const startY = this.game.y(startTile);

      // Simple culling check
      if (
        startX < visibleMinX ||
        startX > visibleMaxX ||
        startY < visibleMinY ||
        startY > visibleMaxY
      ) {
        continue;
      }

      let position = { x: startX, y: startY };
      if (this.interpolatedUnitTypes.includes(unit.type())) {
        position = this.interpolatePosition(unit, alpha);
      }

      if (useLOD) {
        this.renderUnitLOD(context, unit, position);
      } else {
        this.renderUnitDirect(context, unit, position);
      }
    }

    // Render ghosts
    for (const ghost of this.ghosts) {
      const x = this.game.x(ghost.pos);
      const y = this.game.y(ghost.pos);
      if (
        x >= visibleMinX &&
        x <= visibleMaxX &&
        y >= visibleMinY &&
        y <= visibleMaxY
      ) {
        this.drawGhostDirect(context, ghost);
      }
    }

    // Cleanup trails for destroyed/inactive units
    this.cleanupTrails();

    context.restore();
  }

  private cleanupTrails() {
    for (const unit of this.unitToTrail.keys()) {
      if (!unit.isActive() || !this.game.unit(unit.id())) {
        this.handleUnitDeactivation(unit);
      }
    }
  }

  private renderUnitLOD(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    const color = this.theme.territoryColor(unit.owner());
    context.fillStyle = color.toRgbString();
    // Draw a simple square dot
    const size = 4; // LOD size
    context.fillRect(position.x - size / 2, position.y - size / 2, size, size);
  }

  private renderUnitDirect(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    // START: Custom rendering for owner's submarine visibility
    if (
      unit.type() === UnitType.Submarine &&
      unit.owner() === this.game.myPlayer()
    ) {
      const isAttacking = unit.isAttacking();
      const isDetected = unit.isDetectedByNavalUnit();
      const isOnCooldown = unit.isCooldown();
      const isVisibleToEnemies = isAttacking || isDetected || isOnCooldown;
      if (!isVisibleToEnemies) {
        this.drawSpriteAtPosition(context, unit, position, undefined, 0.75);
        return;
      }
    }
    // END: Custom rendering

    switch (unit.type()) {
      case UnitType.TransportShip:
      case UnitType.Paratrooper:
        this.handleBoatEvent(context, unit, position);
        break;
      case UnitType.Submarine:
      case UnitType.Warship:
        this.handleWarShipEvent(context, unit, position);
        break;
      case UnitType.Shell:
        this.handleShellEvent(context, unit, position);
        break;
      case UnitType.SAMMissile:
        this.handleMissileEvent(context, unit, position);
        break;
      case UnitType.TradeShip:
        this.handleTradeShipEvent(context, unit, position);
        break;
      case UnitType.CargoPlane:
        this.handleCargoPlaneEvent(context, unit, position);
        break;
      case UnitType.MIRVWarhead:
        this.handleMIRVWarhead(context, unit, position);
        break;
      case UnitType.Bomber:
        this.handleBomberEvent(context, unit, position);
        break;
      case UnitType.FighterJet:
        this.handleFighterJetEvent(context, unit, position);
        break;
      case UnitType.AtomBomb:
      case UnitType.HydrogenBomb:
      case UnitType.MIRV:
        this.handleNuke(context, unit, position);
        break;
    }
  }

  private handleWarShipEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    if (unit.targetUnitId()) {
      this.drawSpriteAtPosition(
        context,
        unit,
        position,
        colord({ r: 200, b: 0, g: 0 }),
      );
    } else {
      this.drawSpriteAtPosition(context, unit, position);
    }
  }

  private handleShellEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    const rel = this.relationship(unit);
    const color = this.theme.borderColor(unit.owner());

    // Draw interpolated shell (squares + segment)
    this.drawInterpolatedSquare(context, position, rel, color, 1, 1);
    this.drawInterpolatedSquare(context, position, rel, color, 2, 0.4);

    const last = {
      x: this.game.x(unit.lastTile()),
      y: this.game.y(unit.lastTile()),
    };
    if (last.x !== position.x || last.y !== position.y) {
      this.drawInterpolatedSegment(context, last, position, rel, color, 0.7);
    }
  }

  private handleMissileEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    this.drawSpriteAtPosition(context, unit, position);
  }

  private handleNuke(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    const rel = this.relationship(unit);

    if (!this.unitToTrail.has(unit)) {
      this.unitToTrail.set(unit, []);
    }

    let newTrailSize = 1;
    const trail = this.unitToTrail.get(unit) ?? [];
    if (trail.length >= 1) {
      const cur = {
        x: this.game.x(unit.lastTile()),
        y: this.game.y(unit.lastTile()),
      };
      const prev = {
        x: this.game.x(trail[trail.length - 1]),
        y: this.game.y(trail[trail.length - 1]),
      };
      const line = new BezenhamLine(prev, cur);
      let point = line.increment();
      while (point !== true) {
        trail.push(this.game.ref(point.x, point.y));
        point = line.increment();
      }
      newTrailSize = line.size();
    } else {
      trail.push(unit.lastTile());
    }

    this.drawTrail(
      trail.slice(-newTrailSize),
      this.theme.territoryColor(unit.owner()),
      rel,
    );
    this.drawSpriteAtPosition(context, unit, position);
  }

  private handleMIRVWarhead(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    const rel = this.relationship(unit);
    const color = this.theme.borderColor(unit.owner());
    this.drawInterpolatedSquare(context, position, rel, color, 1, 1);
    this.drawInterpolatedSquare(context, position, rel, color, 2, 0.35);

    const last = {
      x: this.game.x(unit.lastTile()),
      y: this.game.y(unit.lastTile()),
    };
    if (last.x !== position.x || last.y !== position.y) {
      this.drawInterpolatedSegment(context, last, position, rel, color, 0.5);
    }
  }

  private handleTradeShipEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    this.drawSpriteAtPosition(context, unit, position);
  }

  private handleCargoPlaneEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    this.drawSpriteAtPosition(context, unit, position);
  }

  private handleBomberEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    this.drawSpriteAtPosition(context, unit, position);
  }

  private handleFighterJetEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    if (unit.targetUnitId()) {
      this.drawSpriteAtPosition(
        context,
        unit,
        position,
        colord({ r: 200, b: 0, g: 0 }),
      );
    } else {
      this.drawSpriteAtPosition(context, unit, position);
    }
  }

  private handleBoatEvent(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
  ) {
    const rel = this.relationship(unit);

    if (!this.unitToTrail.has(unit)) {
      this.unitToTrail.set(unit, []);
    }
    const trail = this.unitToTrail.get(unit) ?? [];
    const lastTile = unit.lastTile();

    // Only push if the tile is different from the last one in the trail
    if (trail.length === 0 || trail[trail.length - 1] !== lastTile) {
      trail.push(lastTile);
    }

    this.drawTrail(
      trail.slice(-1),
      this.theme.territoryColor(unit.owner()),
      rel,
    );
    this.drawSpriteAtPosition(context, unit, position);
  }

  onAlternativeViewEvent(event: AlternateViewEvent) {
    this.alternateView = event.alternateView;
    this.redraw();
  }

  redraw() {
    this.transportShipTrailCanvas = document.createElement("canvas");
    const trailContext = this.transportShipTrailCanvas.getContext("2d");
    if (trailContext === null) throw new Error("2d context not supported");
    this.unitTrailContext = trailContext;

    this.transportShipTrailCanvas.width = this.game.width();
    this.transportShipTrailCanvas.height = this.game.height();

    this.unitToTrail.forEach((trail, unit) => {
      for (const t of trail) {
        this.paintCell(
          this.game.x(t),
          this.game.y(t),
          this.relationship(unit),
          this.theme.territoryColor(unit.owner()),
          150,
          this.unitTrailContext,
        );
      }
    });
  }

  private interpolatePosition(unit: UnitView, alpha: number) {
    const startTile = unit.lastTile();
    const endTile = unit.tile();

    const startX = this.game.x(startTile);
    const startY = this.game.y(startTile);
    const endX = this.game.x(endTile);
    const endY = this.game.y(endTile);

    return {
      x: startX + (endX - startX) * alpha,
      y: startY + (endY - startY) * alpha,
    };
  }

  private drawInterpolatedSquare(
    context: CanvasRenderingContext2D,
    position: { x: number; y: number },
    relationship: Relationship,
    color: Colord,
    size: number,
    alpha: number,
  ) {
    context.fillStyle = this.resolveInterpolatedColor(
      relationship,
      color,
      alpha,
    );
    context.fillRect(position.x - size / 2, position.y - size / 2, size, size);
  }

  private drawInterpolatedSegment(
    context: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
    relationship: Relationship,
    color: Colord,
    alpha: number,
  ) {
    context.strokeStyle = this.resolveInterpolatedColor(
      relationship,
      color,
      alpha,
    );
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  private resolveInterpolatedColor(
    relationship: Relationship,
    color: Colord,
    alpha: number,
  ): string {
    if (this.alternateView) {
      return this.getAlternateViewColor(relationship)
        .alpha(alpha)
        .toRgbString();
    }
    return color.alpha(alpha).toRgbString();
  }

  private getAlternateViewColor(relationship: Relationship): Colord {
    switch (relationship) {
      case Relationship.Self:
        return this.theme.selfColor();
      case Relationship.Ally:
        return this.theme.allyColor();
      case Relationship.Enemy:
      default:
        return this.theme.enemyColor();
    }
  }

  private relationship(unit: UnitView): Relationship {
    const myPlayer = this.game.myPlayer();
    if (myPlayer === null) {
      return Relationship.Enemy;
    }
    if (myPlayer === unit.owner()) {
      return Relationship.Self;
    }
    if (myPlayer.isFriendly(unit.owner())) {
      return Relationship.Ally;
    }
    return Relationship.Enemy;
  }

  private drawTrail(trail: number[], color: Colord, rel: Relationship) {
    for (const t of trail) {
      this.paintCell(
        this.game.x(t),
        this.game.y(t),
        rel,
        color,
        150,
        this.unitTrailContext,
      );
    }
  }

  private clearTrail(unit: UnitView) {
    const trail = this.unitToTrail.get(unit) ?? [];
    const rel = this.relationship(unit);
    for (const t of trail) {
      this.clearCell(this.game.x(t), this.game.y(t), this.unitTrailContext);
    }
    this.unitToTrail.delete(unit);

    const trailSet = new Set(trail);
    for (const [other, trail] of this.unitToTrail) {
      for (const t of trail) {
        if (trailSet.has(t)) {
          this.paintCell(
            this.game.x(t),
            this.game.y(t),
            rel,
            this.theme.territoryColor(other.owner()),
            150,
            this.unitTrailContext,
          );
        }
      }
    }
  }

  paintCell(
    x: number,
    y: number,
    relationship: Relationship,
    color: Colord,
    alpha: number,
    context: CanvasRenderingContext2D,
  ) {
    this.clearCell(x, y, context);
    if (this.alternateView) {
      switch (relationship) {
        case Relationship.Self:
          context.fillStyle = this.theme.selfColor().toRgbString();
          break;
        case Relationship.Ally:
          context.fillStyle = this.theme.allyColor().toRgbString();
          break;
        case Relationship.Enemy:
          context.fillStyle = this.theme.enemyColor().toRgbString();
          break;
      }
    } else {
      context.fillStyle = color.alpha(alpha / 255).toRgbString();
    }
    context.fillRect(x, y, 1, 1);
  }

  clearCell(x: number, y: number, context: CanvasRenderingContext2D) {
    context.clearRect(x, y, 1, 1);
  }

  private drawSpriteAtPosition(
    context: CanvasRenderingContext2D,
    unit: UnitView,
    position: { x: number; y: number },
    customTerritoryColor?: Colord,
    sizeMultiplier: number = 1.0,
  ) {
    let alternateViewColor: Colord | null = null;

    if (this.alternateView) {
      let rel = this.relationship(unit);
      const destinationId = unit.targetUnitId();
      if (
        (unit.type() === UnitType.TradeShip ||
          unit.type() === UnitType.CargoPlane) &&
        destinationId !== undefined
      ) {
        const target = this.game.unit(destinationId)?.owner();
        const myPlayer = this.game.myPlayer();
        if (myPlayer !== null && target !== undefined) {
          if (myPlayer === target) {
            rel = Relationship.Self;
          } else if (myPlayer.isFriendly(target)) {
            rel = Relationship.Ally;
          }
        }
      }
      switch (rel) {
        case Relationship.Self:
          alternateViewColor = this.theme.selfColor();
          break;
        case Relationship.Ally:
          alternateViewColor = this.theme.allyColor();
          break;
        case Relationship.Enemy:
          alternateViewColor = this.theme.enemyColor();
          break;
      }
    }

    const sprite = getColoredSprite(
      unit,
      this.theme,
      alternateViewColor ?? customTerritoryColor,
      alternateViewColor ?? undefined,
    );

    if (unit.isActive()) {
      const targetable = unit.targetable();
      if (!targetable) {
        context.save();
        context.globalAlpha = 0.5;
      }

      const offsetX = Math.round(position.x - sprite.width / 2);
      const offsetY = Math.round(position.y - sprite.width / 2);

      const isAircraft =
        unit.type() === UnitType.Bomber ||
        unit.type() === UnitType.FighterJet ||
        unit.type() === UnitType.CargoPlane;
      let rotated = false;
      if (isAircraft) {
        const angle = this.getUnitAngle(unit);
        if (angle !== null) {
          const cx = offsetX + sprite.width / 2;
          const cy = offsetY + sprite.width / 2;
          context.save();
          context.translate(cx, cy);
          context.rotate(angle);
          context.translate(-cx, -cy);
          rotated = true;
        }
      }

      const newWidth = sprite.width * sizeMultiplier;
      const newHeight = sprite.width * sizeMultiplier;

      context.drawImage(sprite, offsetX, offsetY, newWidth, newHeight);

      const type = unit.type();
      if (
        type === UnitType.Warship ||
        type === UnitType.FighterJet ||
        type === UnitType.Submarine
      ) {
        const level = (unit as any).level ? (unit as any).level() : 1;
        const tierColor =
          level >= 4
            ? "#E5E4E2"
            : level === 3
              ? "#FFD700"
              : level === 2
                ? "#C0C0C0"
                : "#CD7F32";
        const badgeSize = Math.max(
          2,
          Math.min(3, Math.round(sprite.width * 0.18)),
        );
        const offset = 1;
        const cx = offsetX + sprite.width / 2;
        const cy = offsetY + sprite.width / 2;
        const badgeLeft = Math.round(cx + sprite.width / 2 + offset);
        const badgeTop = Math.round(cy - sprite.width / 2 - badgeSize - offset);
        context.fillStyle = tierColor;
        context.fillRect(badgeLeft, badgeTop, badgeSize, badgeSize);
      }

      if (rotated) {
        context.restore();
      }

      if (!targetable) {
        context.restore();
      }
    }
  }

  private drawGhostDirect(
    context: CanvasRenderingContext2D,
    ghost: { id: number; pos: number; ownerID: number },
  ) {
    context.save();
    context.globalAlpha = 0.3;
    const dummyUnit = {
      tile: () => ghost.pos,
      type: () => UnitType.Submarine,
      owner: () => this.game.playerBySmallID(ghost.ownerID),
      targetable: () => true,
      isActive: () => true,
      lastTile: () => ghost.pos,
    } as unknown as UnitView;

    const position = {
      x: this.game.x(ghost.pos),
      y: this.game.y(ghost.pos),
    };

    this.drawSpriteAtPosition(context, dummyUnit as UnitView, position);
    context.restore();
  }

  private getUnitAngle(unit: UnitView): number | null {
    const lastTile = unit.lastTile();
    const currentTile = unit.tile();

    if (
      lastTile &&
      currentTile &&
      (unit.type() === UnitType.Bomber ||
        unit.type() === UnitType.FighterJet ||
        unit.type() === UnitType.CargoPlane)
    ) {
      const lastPos = { x: this.game.x(lastTile), y: this.game.y(lastTile) };
      const currentPos = {
        x: this.game.x(currentTile),
        y: this.game.y(currentTile),
      };
      const dx = currentPos.x - lastPos.x;
      const dy = currentPos.y - lastPos.y;

      const lastAngle = this.unitToLastAngle.get(unit);

      if (dx === 0 && dy === 0) {
        return lastAngle ?? null;
      }

      let angle = Math.atan2(dy, dx);

      if (unit.type() === UnitType.FighterJet) {
        angle += Math.PI / 2;
      }

      if (lastAngle !== undefined) {
        const smoothingFactor = 0.25;
        let angleDiff = angle - lastAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        angle = lastAngle + angleDiff * smoothingFactor;
      }

      this.unitToLastAngle.set(unit, angle);
      return angle;
    }
    return null;
  }

  private getSpriteSize(unit: UnitView): number {
    const t = unit.type();
    const existing = this.spriteSizeCache.get(t);
    if (existing !== undefined) return existing;
    const canvas = getColoredSprite(unit, this.theme);
    const size = canvas.width;
    this.spriteSizeCache.set(t, size);
    return size;
  }

  private effectiveSizeMultiplier(unit: UnitView): number {
    if (
      unit.type() === UnitType.Submarine &&
      unit.owner() === this.game.myPlayer()
    ) {
      const isAttacking = (unit as any).isAttacking?.() ?? false;
      const isDetected = (unit as any).isDetectedByNavalUnit?.() ?? false;
      const isOnCooldown = (unit as any).isCooldown?.() ?? false;
      const isVisibleToEnemies = isAttacking || isDetected || isOnCooldown;
      if (!isVisibleToEnemies) {
        return 0.75;
      }
    }
    return 1.0;
  }

  private computeTickAlpha(): number {
    const elapsed = Math.min(
      this.now() - this.lastTickTimestamp,
      this.tickIntervalMs,
    );
    if (this.tickIntervalMs === 0) {
      return 1;
    }
    return Math.max(0, elapsed / this.tickIntervalMs);
  }

  private onReplaySpeedChange(multiplier: ReplaySpeedMultiplier) {
    this.replaySpeedMultiplier = multiplier;
    this.updateTickInterval();
    this.lastTickTimestamp = this.now();
  }

  private updateTickInterval() {
    const baseInterval = this.baseTickIntervalMs;
    if (baseInterval <= 0) {
      this.tickIntervalMs = 0;
      return;
    }
    this.tickIntervalMs = baseInterval * this.replaySpeedMultiplier;
  }

  private now(): number {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    return Date.now();
  }
}
