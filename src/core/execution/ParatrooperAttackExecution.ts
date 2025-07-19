import { Execution, Game, MessageType, Player, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { StraightPathFinder } from "../pathfinding/PathFinding";
import { AttackExecution } from "./AttackExecution";

export class ParatrooperAttackExecution implements Execution {
  private paratrooperUnitID: number | null = null;
  private pathFinder: StraightPathFinder | null = null;
  private currentPathIndex: number = 0;
  private troops: number;
  private dst: TileRef;
  private targetPlayerID: string | null;
  private attacker: Player;
  private mg: Game; // Add this line

  constructor(
    attacker: Player,
    targetPlayerID: string | null,
    troops: number,
    dst: TileRef,
  ) {
    this.attacker = attacker;
    this.targetPlayerID = targetPlayerID;
    this.troops = troops;
    this.dst = dst;
  }

  isActive(): boolean {
    return this.paratrooperUnitID !== null;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  init(game: Game, ticks: number): void {
    this.mg = game;
    const airfields = this.attacker.units(UnitType.Airfield);
    if (airfields.length === 0) {
      game.displayMessage(
        "No airfields available to launch paratrooper attack.",
        MessageType.WARN,
        this.attacker.id(),
      );
      return;
    }

    // Find the closest airfield to the destination
    let closestAirfield: TileRef | null = null;
    let minDistance = Infinity;

    for (const airfield of airfields) {
      const airfieldTile = airfield.tile();
      const distance = game.manhattanDist(airfieldTile, this.dst);
      if (distance < minDistance) {
        minDistance = distance;
        closestAirfield = airfieldTile;
      }
    }

    if (closestAirfield === null) {
      game.displayMessage(
        "Could not find a suitable airfield for paratrooper attack.",
        MessageType.WARN,
        this.attacker.id(),
      );
      return;
    }

    if (this.troops <= 0 || this.troops > this.attacker.troops()) {
      game.displayMessage(
        "Invalid number of troops for paratrooper attack.",
        MessageType.WARN,
        this.attacker.id(),
      );
      return;
    }

    if (
      this.attacker.units(UnitType.Paratrooper).length >=
      game.config().paratrooperMaxNumber()
    ) {
      game.displayMessage(
        "Maximum number of active paratrooper units reached.",
        MessageType.WARN,
        this.attacker.id(),
      );
      return;
    }

    // Spawn the paratrooper unit
    const paratrooper = this.attacker.buildUnit(
      UnitType.Paratrooper,
      closestAirfield,
      { troops: this.troops, destination: this.dst },
    );
    this.paratrooperUnitID = paratrooper.id();

    // Initialize pathfinder
    this.pathFinder = new StraightPathFinder(this.mg.map());

    game.paratrooperLandingZones().add(this.dst);

    game.displayMessage(
      `Incoming Paratrooper Attack on (${this.mg.map().x(this.dst)}, ${this.mg.map().y(this.dst)}) from ${this.attacker.displayName()}`,
      MessageType.PARATROOPER_INBOUND,
      this.targetPlayerID,
    );

    game.stats().paratrooperAttack(this.attacker, this.troops);
  }

  tick(ticks: number): void {
    const game = this.mg;
    if (this.paratrooperUnitID === null) {
      return;
    }

    const paratrooper = game
      .units(UnitType.Paratrooper)
      .find((u) => u.id() === this.paratrooperUnitID);

    if (!paratrooper || !paratrooper.isActive()) {
      this.paratrooperUnitID = null; // Unit was destroyed or became inactive
      return;
    }

    if (this.pathFinder === null) {
      // This should not happen if init was successful
      this.paratrooperUnitID = null;
      return;
    }

    const speed = game.config().paratrooperSpeed();
    let currentTile = paratrooper.tile();
    for (let i = 0; i < speed; i++) {
      const nextTileResult = this.pathFinder.nextTile(currentTile, this.dst, 1);
      if (nextTileResult === true) {
        // Paratrooper reached destination
        const targetOwner = game.owner(this.dst);
        if (targetOwner === this.attacker) {
          // Landed on own territory, add troops to tile
          this.attacker.addTroops(paratrooper.troops());
          game.displayMessage(
            `Paratroopers landed safely on (${this.mg.map().x(this.dst)}, ${this.mg.map().y(this.dst)})`,
            MessageType.WARN,
            this.attacker.id(),
          );
        } else {
          // Initiate AttackExecution
          const attackExecution = new AttackExecution(
            paratrooper.troops(),
            this.attacker,
            targetOwner.id(),
            this.dst,
            false, // Do not remove troops from attacker, as they are from the paratrooper
            true, // NEW: This attack originates from a paratrooper
          );
          game.addExecution(attackExecution);
          game.displayMessage(
            `Paratroopers initiated attack on (${this.mg.map().x(this.dst)}, ${this.mg.map().y(this.dst)})`,
            MessageType.ATTACK_REQUEST,
            this.attacker.id(),
          );
        }
        paratrooper.delete();
        this.paratrooperUnitID = null;
        game.paratrooperLandingZones().delete(this.dst);
        return;
      } else {
        currentTile = nextTileResult;
        paratrooper.move(currentTile);
      }
    }
  }
}
