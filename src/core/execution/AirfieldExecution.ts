import { Execution, Game, Player, Unit, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { BomberExecution } from "./BomberExecution";
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

    // 1) Build the Airfield if we haven't yet
    if (this.airfield === null) {
      const spawn = this.player.canBuild(UnitType.Airfield, this.tile);
      if (!spawn) {
        console.warn(
          `player ${this.player.id()} cannot build airfield at ${this.tile}`,
        );
        this.active = false;
        return;
      }
      this.airfield = this.player.buildUnit(UnitType.Airfield, spawn, {});
    }

    // 2) If it ever goes inactive, kill this execution
    if (!this.airfield.isActive()) {
      this.active = false;
      return;
    }

    // 3) Owner might’ve changed via conquest
    if (this.player.id() !== this.airfield.owner().id()) {
      this.player = this.airfield.owner();
    }

    // 4) Only run every 10 ticks
    if ((this.mg.ticks() + this.checkOffset) % 10 !== 0) {
      return;
    }

    // ——> Capture non-null Airfield exactly once
    const airfieldUnit = this.airfield;

    // 3.3: Limit active Bombers per airfield
    const existingBombers = this.mg
      .nearbyUnits(airfieldUnit.tile(), 0, UnitType.Bomber)
      .filter(({ unit }) => unit.owner().id() === this.player.id()).length;
    if (existingBombers >= this.mg.config().bomberMaxPerAirfield()) {
      return;
    }

    // Cargo-plane spawn
    const totalAirfields = this.mg.units(UnitType.Airfield).length;
    if (
      this.random.chance(this.mg.config().cargoPlaneSpawnRate(totalAirfields))
    ) {
      const possiblePorts = this.player.airfields(airfieldUnit);
      if (possiblePorts.length > 0) {
        const destField = this.random.randElement(possiblePorts);
        this.mg.addExecution(
          new CargoPlaneExecution(this.player, airfieldUnit, destField),
        );
      }
    }

    // 3.4: Bomber spawn chance
    if (!this.random.chance(this.mg.config().bomberSpawnRate(totalAirfields))) {
      return;
    }

    // 3.4a: Pick a valid target tile
    const targets = this.mg
      .nearbyUnits(airfieldUnit.tile(), 80, [
        UnitType.Port,
        UnitType.City,
        UnitType.DefensePost,
      ])
      .map(({ unit }) => unit.tile())
      .filter((t) => this.mg!.owner(t).id() !== this.player.id());

    if (targets.length === 0) {
      return;
    }
    const targetTile = this.random.randElement(targets);

    // 3.4b: Actually launch the Bomber
    this.mg.addExecution(
      new BomberExecution(this.player, airfieldUnit, targetTile),
    );
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
