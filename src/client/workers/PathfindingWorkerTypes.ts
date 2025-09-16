/**
 * Defines the strict, serializable-only message contract for communication
 * with the PathfindingWorker.
 */

// This flag must be kept in sync with GameMapImpl.ts
export const TerrainFlags = { IS_LAND_BIT: 7 };

/**
 * Message from the Main Thread to the Worker to request a path.
 */
export type FindPathRequest = {
  protocolVersion: 1;
  type: "findPath";
  requestId: number;
  generation: number;

  // Grid & Pathing Data (Sent as transferable buffers)
  width: number;
  height: number;
  startId: number;
  goalId: number;
  ownerIds: ArrayBuffer; // Buffer of a Uint16Array
  terrain: ArrayBuffer; // Raw terrain buffer from GameMapImpl
  roadMask: ArrayBuffer; // Buffer of a Uint8Array (1=road)
  friendlyPlayerIds: Uint16Array;

  // Guardrails
  maxExpand: number;
};

/**
 * Message from the Worker to the Main Thread with the result.
 */
export type FindPathResponse = {
  protocolVersion: 1;
  type: "pathResult";
  requestId: number;
  generation: number;
  path: Int32Array | null; // Transferred
};
