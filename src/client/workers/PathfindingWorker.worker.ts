/// <reference lib="webworker" />

import { findPath } from "../../core/pathfinding/AStarSearch";
import {
  FindPathRequest,
  FindPathResponse,
  TerrainFlags,
} from "./PathfindingWorkerTypes";

self.onmessage = (e: MessageEvent<FindPathRequest>) => {
  const {
    protocolVersion,
    type,
    requestId,
    generation,
    width,
    height,
    startId,
    goalId,
    ownerIds,
    terrain,
    roadMask,
    friendlyPlayerIds,
    maxExpand,
  } = e.data;

  // Reconstruct typed arrays from the transferred buffers
  const terrainArr = new Uint8Array(terrain);
  const ownerIdsArr = new Uint16Array(ownerIds);
  const roadMaskArr = new Uint8Array(roadMask);

  // Helper function to check for land using the bitmask, as done in GameMapImpl
  const isLand = (id: number): boolean => {
    return Boolean(terrainArr[id] & (1 << TerrainFlags.IS_LAND_BIT));
  };

  // Create a fast lookup table for friendly IDs to use in the hot path
  const isFriendlyLookup = new Uint8Array(65536);
  for (let i = 0; i < friendlyPlayerIds.length; i++) {
    isFriendlyLookup[friendlyPlayerIds[i]] = 1;
  }
  const isFriendly = (ownerId: number): boolean => {
    return isFriendlyLookup[ownerId] === 1;
  };

  // Execute the pathfinding
  const path = findPath(
    width,
    height,
    startId,
    goalId,
    isLand,
    isFriendly,
    ownerIdsArr,
    roadMaskArr,
    maxExpand,
  );

  // Send the result back to the main thread
  const response: FindPathResponse = {
    protocolVersion: 1,
    type: "pathResult",
    requestId,
    generation,
    path,
  };

  if (path) {
    // Transfer ownership of the path buffer back to the main thread to avoid cloning
    self.postMessage(response, [path.buffer]);
  } else {
    self.postMessage(response);
  }
};
