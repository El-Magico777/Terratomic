export enum UnitType {
  TransportShip = "Transport",
  Warship = "Warship",
  Shell = "Shell",
  SAMMissile = "SAMMissile",
  Port = "Port",
  AtomBomb = "Atom Bomb",
  HydrogenBomb = "Hydrogen Bomb",
  TradeShip = "Trade Ship",
  MissileSilo = "Missile Silo",
  DefensePost = "Defense Post",
  SAMLauncher = "SAM Launcher",
  City = "City",
  MIRV = "MIRV",
  MIRVWarhead = "MIRV Warhead",
  Construction = "Construction",
  Hospital = "Hospital",
  Academy = "Academy",
  Airfield = "Air Field",
  CargoPlane = "Cargo Plane",
  Bomber = "Bomber",
  FighterJet = "Fighter Jet", // Represents a Fighter Jet unit.
}

/**
 * A serializable object containing pre-computed color values for the worker.
 * The main thread creates this object by calling the functions in the main Theme object.
 */
export interface WorkerTheme {
  territoryColors: Record<number, { r: number; g: number; b: number }>;
  borderColors: Record<number, { r: number; g: number; b: number }>;
  defendedBorderColors: Record<
    number,
    {
      light: { r: number; g: number; b: number };
      dark: { r: number; g: number; b: number };
    }
  >;
  focusedBorderColor: { r: number; g: number; b: number };
  falloutColor: { r: number; g: number; b: number };
  selfColor: { r: number; g: number; b: number };
  allyColor: { r: number; g: number; b: number };
  enemyColor: { r: number; g: number; b: number };
}

export interface WorkerUnit {
  type: UnitType;
  tile: number;
  ownerId: number;
}

/**
 * Sent once to initialize the worker's state. This is a minimal representation
 * of the game state, containing only what is necessary for territory computation.
 */
export interface TerritoryComputeState {
  tileOwnerBuffer: Uint16Array; // Buffer with the owner ID for each tile
  tileFalloutBuffer: Uint8Array; // Buffer with fallout status for each tile
  players: { id: number; allies: number[] }[]; // List of players and their allies
  theme: WorkerTheme; // Pre-computed, serializable color data
  myPlayerId: number;
  width: number;
  height: number;
  units: WorkerUnit[];
  defensePostRange: number;
}

/**
 * Sent from main to worker for each new frame to be rendered. Contains the
 * dynamic view-dependent state.
 */
export interface TerritoryFrameRequest {
  token: number;
  visibleRect: { x0: number; y0: number; x1: number; y1: number };
  alternativeView: boolean;
  highlightedTerritoryId: number | null;
  focusedPlayerId: number | null;
}

// Sent from worker to main with the finished result.
// This is a discriminated union to handle both rendering paths.
export type TerritoryFrameResult =
  | {
      token: number;
      kind: "bitmap";
      bitmap: ImageBitmap;
      visibleRect: { x0: number; y0: number; x1: number; y1: number };
    } // transferable: [bitmap]
  | {
      token: number;
      kind: "buffer";
      width: number;
      height: number;
      buffer: Uint8ClampedArray;
      visibleRect: { x0: number; y0: number; x1: number; y1: number };
    }; // transferable: [buffer.buffer]

export type MainToWorkerMessage =
  | { type: "init"; state: TerritoryComputeState }
  | { type: "render"; request: TerritoryFrameRequest }
  | { type: "update-tile"; tile: number; ownerId: number; fallout: boolean }
  | {
      type: "add-player";
      player: { id: number; allies: number[] };
      theme: {
        territoryColor: { r: number; g: number; b: number };
        borderColor: { r: number; g: number; b: number };
        defendedBorderColors: {
          light: { r: number; g: number; b: number };
          dark: { r: number; g: number; b: number };
        };
      };
    };

export type WorkerToMainMessage = {
  type: "result";
  result: TerritoryFrameResult;
};
