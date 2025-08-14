import {
  Execution,
  Game,
  isStructureType,
  Player,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";

export class RoadNodeExecution implements Execution {
  private mg: Game;
  private node: Unit | null = null;
  private active = true;
  private roadsBuilt = false;

  constructor(
    private player: Player,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (this.node === null) {
      const spawnTile = this.player.canBuild(UnitType.RoadNode, this.tile);
      if (spawnTile === false) {
        console.warn("cannot build road node");
        this.active = false;
        return;
      }
      this.node = this.player.buildUnit(UnitType.RoadNode, spawnTile, {});
      this.buildRoads();
      this.active = false; // no ongoing logic after road placement
      return;
    }
    if (!this.node.isActive()) {
      this.active = false;
      return;
    }
  }

  private buildRoads() {
    if (!this.node) return;
    const radius = 50;
    const structureTypes = Object.values(UnitType).filter(isStructureType);
    const nearby = this.mg.nearbyUnits(
      this.node.tile(),
      radius,
      structureTypes,
    );
    for (const { unit } of nearby) {
      if (unit === this.node) continue;
      const path = this.bresenham(this.node.tile(), unit.tile());
      for (const t of path) {
        this.mg.setRoad(t, true);
      }
    }
    this.roadsBuilt = true;
  }

  private bresenham(a: TileRef, b: TileRef): TileRef[] {
    const path: TileRef[] = [];
    let x0 = this.mg.x(a);
    let y0 = this.mg.y(a);
    const x1 = this.mg.x(b);
    const y1 = this.mg.y(b);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      path.push(this.mg.ref(x0, y0));
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    return path;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
