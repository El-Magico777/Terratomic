import { Execution, Game, UnitType } from "../game/Game";

export class LandTradeExecution implements Execution {
  constructor(private game: Game) {}

  isActive(): boolean {
    return true;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  init(mg: Game, ticks: number): void {}

  tick(ticks: number): void {
    for (const player of this.game.players()) {
      let landTradeIncome = 0n;
      for (const roadNode of player.units(UnitType.RoadNode)) {
        const connectedNodes = this.game.getConnectedRoadNodes(roadNode.tile());
        for (const connectedNode of connectedNodes) {
          const owner = this.game.owner(connectedNode);
          if (owner.isPlayer() && owner.id() === player.id()) {
            const connectedStructure = this.game
              .unitsAt(connectedNode)
              .find(
                (u) => u.type() === UnitType.City || u.type() === UnitType.Port,
              );
            if (connectedStructure) {
              const income = BigInt(
                Math.floor((player.population() + owner.population()) / 100),
              );
              landTradeIncome += income;
            }
          }
        }
      }
      player.addGold(landTradeIncome);
    }
  }
}
