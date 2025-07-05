import {
  Execution,
  Game,
  MessageType,
  Player,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { StraightPathFinder } from "../pathfinding/PathFinding";

export class BomberExecution implements Execution {
  private active = true;
  private mg: Game;
  private bomber!: Unit; // the Bomber unit once spawned
  private bombsLeft = 3; // payload
  private fuelLeft!: number; // will initialize in init()
  private returning = false; // outbound vs. inbound
  private pathFinder: StraightPathFinder;

  constructor(
    private origOwner: Player,
    private sourceAirfield: Unit,
    private targetTile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    this.pathFinder = new StraightPathFinder(mg);
    this.fuelLeft = mg.config().bomberFuelTicks();
  }

  tick(_ticks: number): void {
    // 1) SPAWN
    if (!this.bomber) {
      const spawn = this.origOwner.canBuild(
        UnitType.Bomber,
        this.sourceAirfield.tile(),
      );
      if (!spawn) {
        this.active = false;
        return;
      }
      this.bomber = this.origOwner.buildUnit(UnitType.Bomber, spawn, {
        targetTile: this.targetTile,
      });
    }

    // 2) FUEL CHECK
    this.fuelLeft--;
    if (this.fuelLeft <= 0) {
      this.crash();
      return;
    }

    // 3) STILL ALIVE?
    if (!this.bomber.isActive()) {
      this.active = false;
      return;
    }

    // 4) CHOOSE DESTINATION
    const destination = this.returning
      ? this.sourceAirfield.tile()
      : this.targetTile;

    // 5) MOVE ONE STEP
    const step = this.pathFinder.nextTile(this.bomber.tile(), destination, 2);
    if (step === true) {
      // Reached end of path
      if (!this.returning) {
        // drop a bomb if needed
        if (this.bombsLeft > 0) {
          this.dropBomb();
        }
      } else {
        // touched down on return runway: end execution
        this.active = false;
      }
      return;
    }
    this.bomber.move(step);

    // 6) BOMB DROPPING (once per tick, within 1-tile distance)
    if (
      !this.returning &&
      this.bombsLeft > 0 &&
      this.mg.euclideanDistSquared(this.bomber.tile(), this.targetTile) <= 1
    ) {
      this.dropBomb();
    }
  }

  private dropBomb(): void {
    // tiny nuke explosion: radius=1, scale=0.125
    this.mg.nukeExplosion(this.bomber.tile(), 1, 0.125, this.origOwner);
    this.bombsLeft--;
    if (this.bombsLeft === 0) {
      this.returning = true; // flip into return‐home mode
    }
  }

  private crash(): void {
    this.bomber.delete(false);
    this.active = false;
    this.mg.displayMessage(
      "Bomber crashed",
      MessageType.WARN,
      this.origOwner.id(),
    );
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
