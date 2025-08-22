import { PlayerID, UnitType } from "../core/game/Game";

export class HighlightStructureEvent {
  constructor(
    public readonly unitType: UnitType,
    public readonly playerID: PlayerID,
  ) {}
}

export class ClearHighlightEvent {
  constructor() {}
}
