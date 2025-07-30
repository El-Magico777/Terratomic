import { TileRef } from "./GameMap";
import { GameUpdateType } from "./GameUpdates";

export interface RoadConnectionsUpdate {
  type: GameUpdateType.RoadConnections;
  connections: [TileRef, TileRef[]][];
}
