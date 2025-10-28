export type FxBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export interface Fx {
  renderTick(duration: number, ctx: CanvasRenderingContext2D): boolean;
  getBounds?(): FxBounds | null;
}

export enum FxType {
  MiniFire = "MiniFire",
  MiniSmoke = "MiniSmoke",
  MiniBigSmoke = "MiniBigSmoke",
  MiniSmokeAndFire = "MiniSmokeAndFire",
  MiniExplosion = "MiniExplosion",
  UnitExplosion = "UnitExplosion",
  SinkingShip = "SinkingShip",
  Nuke = "Nuke",
  SAMExplosion = "SAMExplosion",
}
