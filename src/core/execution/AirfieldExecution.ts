import { Execution, Game, Player, Unit, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { CargoPlaneExecution } from "./CargoPlaneExecution";

export class AirfieldExecution implements Execution {
  private active = true;
  private mg: Game | null = null;
  private airfield: Unit | null = null;
  private random: PseudoRandom | null = null;
  private checkOffset: number | null = null;

  constructor(
    private player: Player,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    this.random = new PseudoRandom(mg.ticks());
    this.checkOffset = mg.ticks() % 10;
  }

  tick(ticks: number): void {
    if (this.mg === null || this.random === null || this.checkOffset === null) {
      throw new Error("Not initialized");
    }
    if (this.airfield === null) {
      const tile = this.tile;
      const spawn = this.player.canBuild(UnitType.Airfield, tile);
      if (spawn === false) {
        console.warn(
          `player ${this.player.id()} cannot build airfield at ${this.tile}`,
        );
        this.active = false;
        return;
      }
      this.airfield = this.player.buildUnit(UnitType.Airfield, spawn, {});
    }

    if (!this.airfield.isActive()) {
      this.active = false;
      return;
    }

    if (this.player.id() !== this.airfield.owner().id()) {
      this.player = this.airfield.owner();
    }

    // Only check every 10 ticks for performance.
    if ((this.mg.ticks() + this.checkOffset) % 10 !== 0) {
      return;
    }

    const totalNumberOfAirfields = this.mg.units(UnitType.Airfield).length;
    if (
      !this.random.chance(
        this.mg.config().cargoPlaneSpawnRate(totalNumberOfAirfields),
      )
    ) {
      return;
    }

    const airfields = this.player.airfields(this.airfield);

    if (airfields.length === 0) {
      return;
    }

    const airfield = this.random.randElement(airfields);
    this.mg.addExecution(
      new CargoPlaneExecution(this.player, this.airfield, airfield),
    );
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
