import {
  FindPathRequest,
  FindPathResponse,
  TerrainFlags,
} from "../../client/workers/PathfindingWorkerTypes";
import { Game, Player, PlayerID, Unit, UnitType, UpgradeType } from "./Game";
import { PriorityQueue } from "./PriorityQueue";

import { findPath } from "../pathfinding/AStarSearch";
import { TileRef } from "./GameMap";
import { RoadCache } from "./RoadCache";
import { SpatialGrid } from "./SpatialGrid";
import { StructureGraph } from "./StructureGraph";

export interface Road {
  id: number;
  path: TileRef[];
  owner: PlayerID;
}

let nextRoadId = 0;

function mix32(a: number, b: number, c: number, d: number) {
  let x = ((a | 0) * 2654435761) ^ (b | 0);
  x |= 0;
  x = ((x ^ (x >>> 16)) * 2246822519) | 0;
  x ^= c | 0;
  x = ((x ^ (x >>> 13)) * 3266489917) | 0;
  return (x ^ (d | 0)) | 0;
}

export class RoadManager {
  private roads = new Map<number, Road>();
  private roadsByOwner = new Map<PlayerID, Set<number>>();
  private structureGraph = new StructureGraph();
  private nodes: Unit[] = [];
  private newNodesQueue: Unit[] = [];
  private spatialGrid: SpatialGrid;
  private existingRoadSegments: Set<string> = new Set();
  private segmentSet = new Set<string>();
  private pendingAddedSegments: string[] = [];
  private pendingRemovedSegments: string[] = [];
  private nodeOwnerIds = new Map<number, PlayerID>();
  private nodesByOwner = new Map<PlayerID, Unit[]>();
  private roadCache: RoadCache;
  private roadTilesCache = new Set<TileRef>();
  private cachedRoadMask: Uint8Array | null = null;
  private cachedRoadsEpoch = -1;
  private tileToNode = new Map<TileRef, Unit>();
  private lastSegmentReconcileTick = 0;
  private readonly RECONCILE_INTERVAL_TICKS = 600;

  private worker: Worker | null = null;
  private readonly MAX_IN_FLIGHT = 4;
  private readonly REQUEST_TIMEOUT_MS = 50;
  private pathfindingGeneration = 0;
  private roadsEpoch = 0;
  private ownershipEpoch = 0;
  private nextRequestId = 0;
  private pathfindingQueue: {
    request: FindPathRequest;
    promiseResolve: (path: Int32Array | null) => void;
    reqKey: number;
  }[] = [];
  private inFlightRequests = new Map<
    number,
    {
      resolve: (path: Int32Array | null) => void;
      generation: number;
      reqKey: number;
    }
  >();
  private inFlightKeys = new Set<number>();

  private readonly eligible: UnitType[] = [
    UnitType.City,
    UnitType.Port,
    UnitType.Hospital,
    UnitType.Academy,
    UnitType.Airfield,
  ];

  constructor(private game: Game) {
    const map = this.game.map();
    const adaptiveChunkSize = Math.max(
      100,
      Math.floor(Math.sqrt(map.width() * map.height()) / 20),
    );
    this.spatialGrid = new SpatialGrid(map, adaptiveChunkSize);
    this.roadCache = new RoadCache(32, map.width());
    this.initializeRoadTilesCache();
    this.initializeWorker();
  }

  private initializeWorker(): void {
    if (typeof Worker === "undefined") {
      this.worker = null;
      return;
    }

    const workerScriptUrl = this.resolveWorkerScriptUrl();
    const workerSource =
      workerScriptUrl ?? "../../client/workers/PathfindingWorker.worker.ts";

    let worker: Worker;
    try {
      worker = new Worker(workerSource, { type: "module" });
    } catch (err) {
      console.warn(
        "RoadManager: Web Workers unavailable, falling back to in-process pathfinding.",
        err,
      );
      this.worker = null;
      return;
    }

    this.worker = worker;

    worker.onmessage = (e: MessageEvent<FindPathResponse>) => {
      const { protocolVersion, requestId, generation, path } = e.data;
      const requestInfo = this.inFlightRequests.get(requestId);

      if (!requestInfo) return;

      if (protocolVersion !== 1 || generation !== this.pathfindingGeneration) {
        requestInfo.resolve(null);
      } else {
        requestInfo.resolve(path);
      }

      this.inFlightRequests.delete(requestId);
      this.inFlightKeys.delete(requestInfo.reqKey);
      this.processPathfindingQueue();
    };

    worker.onmessageerror = (e) => {
      console.error("RoadManager: Worker onmessageerror:", e);
    };

    worker.onerror = (err) => {
      console.error("Pathfinding worker error:", err);
      worker.terminate();
      this.worker = null;
      this.initializeWorker();
      this.invalidatePendingPaths();
      this.processPathfindingQueue();
    };
  }

  private resolveWorkerScriptUrl(): URL | null {
    try {
      const importMeta = new Function("return import.meta")() as
        | { url?: string }
        | undefined;
      if (!importMeta || typeof importMeta.url !== "string") {
        return null;
      }
      return new URL(
        "../../client/workers/PathfindingWorker.worker.ts",
        importMeta.url,
      );
    } catch {
      return null;
    }
  }

  private invalidatePendingPaths(): void {
    this.pathfindingGeneration++;
  }

  private initializeRoadTilesCache(): void {
    this.roadTilesCache.clear();
    for (const road of this.roads.values()) {
      for (const tile of road.path) {
        this.roadTilesCache.add(tile);
      }
    }
  }

  public hasRoadOnTile(tile: TileRef): boolean {
    return this.roadTilesCache.has(tile);
  }

  private getCanonicalSegment(tile1: TileRef, tile2: TileRef): string {
    return tile1 < tile2 ? `${tile1}-${tile2}` : `${tile2}-${tile1}`;
  }

  private tileToRoads = new Map<TileRef, Set<number>>();

  // The core update loop remains but will be refactored in Phase 3
  public update(): { added: string[]; removed: string[] } {
    const playersWithRoads = this.game
      .players()
      .filter((p) => p.hasUpgrade(UpgradeType.Roads));
    if (playersWithRoads.length === 0) {
      this.pathfindingQueue = [];
      return { added: [], removed: [] };
    }
    const currentNodes = playersWithRoads.flatMap((p) =>
      p.units(...this.eligible).filter((u) => u.isActive()),
    );
    const newNodeOwnerIds = new Map<number, PlayerID>();
    currentNodes.forEach((n) => newNodeOwnerIds.set(n.id(), n.owner().id()));

    const ownerChangedNodes = currentNodes.filter((n) => {
      const oldOwnerId = this.nodeOwnerIds.get(n.id());
      return oldOwnerId && oldOwnerId !== n.owner().id();
    });

    this.newNodesQueue.push(...ownerChangedNodes);
    this.nodeOwnerIds = newNodeOwnerIds;

    for (
      let i = 0;
      i < this.game.config().roadUpdatesPerTick() &&
      this.newNodesQueue.length > 0;
      i++
    ) {
      const newNode = this.newNodesQueue.shift()!;
      const ownerOfNewNode = this.game.owner(newNode.tile());
      if (!ownerOfNewNode.isPlayer()) continue;

      const nearbyNodes = this.spatialGrid
        .getNearby(newNode, 100)
        .filter((node) => {
          if (node.id() === newNode.id()) return false;
          const nodeOwner = this.game.owner(node.tile());
          return (
            nodeOwner.isPlayer() &&
            (ownerOfNewNode.id() === nodeOwner.id() ||
              ownerOfNewNode.isFriendly(nodeOwner as Player))
          );
        })
        .sort(
          (a, b) =>
            this.game.euclideanDistSquared(newNode.tile(), a.tile()) -
            this.game.euclideanDistSquared(newNode.tile(), b.tile()),
        )
        .slice(0, 5); // Consider up to 5 closest neighbors

      for (const neighbor of nearbyNodes) {
        const segment = this.getCanonicalSegment(
          newNode.tile(),
          neighbor.tile(),
        );
        if (this.existingRoadSegments.has(segment)) {
          continue;
        }

        const existingPath = this.structureGraph.findPath(newNode, neighbor);
        const roadNetworkMaxRedundantPathLength = 5;

        if (
          existingPath === null ||
          existingPath.length > roadNetworkMaxRedundantPathLength
        ) {
          this.structureGraph.addEdge(newNode, neighbor, [], true);
          this.computePath(newNode.tile(), neighbor.tile()).then((path) => {
            if (path) {
              this.structureGraph.addEdge(newNode, neighbor, Array.from(path));
              const newRoad: Road = {
                id: nextRoadId++,
                path: Array.from(path),
                owner: ownerOfNewNode.id(),
              };
              this.roads.set(newRoad.id, newRoad);

              if (!this.roadsByOwner.has(newRoad.owner)) {
                this.roadsByOwner.set(newRoad.owner, new Set());
              }
              this.roadsByOwner.get(newRoad.owner)!.add(newRoad.id);
              this.existingRoadSegments.add(segment);
              newRoad.path.forEach((tile) => {
                this.roadTilesCache.add(tile);
                if (!this.tileToRoads.has(tile)) {
                  this.tileToRoads.set(tile, new Set());
                }
                this.tileToRoads.get(tile)!.add(newRoad.id);
              });

              for (let i = 0; i < path.length - 1; i++) {
                const a = path[i];
                const b = path[i + 1];
                const seg = this.getCanonicalSegment(a, b);
                if (!this.segmentSet.has(seg)) {
                  this.segmentSet.add(seg);
                  this.pendingAddedSegments.push(seg);
                }
              }
            } else {
              this.structureGraph.removeEdge(newNode, neighbor);
            }
          });
        }
      }
    }

    this.processPathfindingQueue();
    this.maybeReconcileSegments();

    // Rebuild quick index by owner once per update call
    this.nodesByOwner.clear();
    for (const node of this.nodes) {
      const pid = node.owner().id();
      const arr = this.nodesByOwner.get(pid);
      if (arr) arr.push(node);
      else this.nodesByOwner.set(pid, [node]);
    }

    const added = this.pendingAddedSegments;
    const removed = this.pendingRemovedSegments;
    this.pendingAddedSegments = [];
    this.pendingRemovedSegments = [];
    return { added, removed };
  }

  private getOrBuildRoadMask(): Uint8Array {
    if (!this.cachedRoadMask || this.cachedRoadsEpoch !== this.roadsEpoch) {
      const mask = new Uint8Array(this.game.width() * this.game.height());
      this.roadTilesCache.forEach((id) => {
        mask[id] = 1;
      });
      this.cachedRoadMask = mask;
      this.cachedRoadsEpoch = this.roadsEpoch;
    }
    return this.cachedRoadMask!;
  }

  private getTerrainAndOwnerData(): {
    terrain: Uint8Array;
    ownerIds: Uint16Array;
  } {
    const mapImpl = this.game.map() as any;
    return {
      terrain: mapImpl.terrain as Uint8Array,
      ownerIds: mapImpl.state as Uint16Array,
    };
  }

  private runPathfindingInProcess(
    request: FindPathRequest,
    roadMask: Uint8Array,
  ): Int32Array | null {
    const { terrain, ownerIds } = this.getTerrainAndOwnerData();
    const isLand = (id: number): boolean => {
      return Boolean(terrain[id] & (1 << TerrainFlags.IS_LAND_BIT));
    };

    const friendlyLookup = new Uint8Array(65536);
    const friendlyIds = request.friendlyPlayerIds;
    for (let i = 0; i < friendlyIds.length; i++) {
      friendlyLookup[friendlyIds[i]] = 1;
    }
    const isFriendly = (ownerId: number): boolean => {
      return friendlyLookup[ownerId] === 1;
    };

    return findPath(
      request.width,
      request.height,
      request.startId,
      request.goalId,
      isLand,
      isFriendly,
      ownerIds,
      roadMask,
      request.maxExpand,
    );
  }

  private processPathfindingQueue() {
    if (!this.worker) {
      while (this.pathfindingQueue.length > 0) {
        const { request, promiseResolve, reqKey } =
          this.pathfindingQueue.shift()!;
        request.generation = this.pathfindingGeneration;
        const roadMask = this.getOrBuildRoadMask();
        const path = this.runPathfindingInProcess(request, roadMask);
        this.inFlightKeys.delete(reqKey);
        promiseResolve(path);
      }
      return;
    }

    while (
      this.worker &&
      this.inFlightRequests.size < this.MAX_IN_FLIGHT &&
      this.pathfindingQueue.length > 0
    ) {
      const { request, promiseResolve, reqKey } =
        this.pathfindingQueue.shift()!;

      request.generation = this.pathfindingGeneration;

      this.inFlightRequests.set(request.requestId, {
        resolve: promiseResolve,
        generation: request.generation,
        reqKey,
      });

      const roadMask = this.getOrBuildRoadMask();
      const { terrain, ownerIds } = this.getTerrainAndOwnerData();

      const requestToSend: FindPathRequest = {
        ...request,
        terrain: terrain.buffer.slice(0),
        ownerIds: ownerIds.buffer.slice(0),
        roadMask: roadMask.buffer.slice(0) as ArrayBuffer,
      };

      const transferables = [
        requestToSend.terrain,
        requestToSend.ownerIds,
        requestToSend.roadMask,
      ];

      const worker = this.worker;
      if (!worker) {
        this.pathfindingQueue.unshift({ request, promiseResolve, reqKey });
        this.inFlightRequests.delete(request.requestId);
        this.processPathfindingQueue();
        return;
      }

      worker.postMessage(requestToSend, transferables);

      setTimeout(() => {
        const requestInfo = this.inFlightRequests.get(request.requestId);
        if (requestInfo && requestInfo.generation === request.generation) {
          requestInfo.resolve(null);
          this.inFlightRequests.delete(request.requestId);
          this.inFlightKeys.delete(reqKey);
          this.processPathfindingQueue();
        }
      }, this.REQUEST_TIMEOUT_MS);
    }
  }

  private pathCache = new Map<string, Int32Array | null>();

  private computePath(
    start: TileRef,
    goal: TileRef,
  ): Promise<Int32Array | null> {
    const key = this.getCanonicalSegment(start, goal);
    if (this.pathCache.has(key)) {
      return Promise.resolve(this.pathCache.get(key)!);
    }

    return new Promise((resolve) => {
      const owner = this.game.owner(start);
      if (!owner.isPlayer()) {
        resolve(null);
        return;
      }

      const reqKey = mix32(
        start,
        goal,
        this.roadsEpoch | 0,
        this.ownershipEpoch | 0,
      );
      if (this.inFlightKeys.has(reqKey)) {
        resolve(null);
        return;
      }

      this.nextRequestId = (this.nextRequestId + 1) >>> 0;
      const friendlyPlayerIds = new Uint16Array([
        owner.smallID(),
        ...owner.allies().map((p) => p.smallID()),
      ]);

      const request: FindPathRequest = {
        protocolVersion: 1,
        type: "findPath",
        requestId: this.nextRequestId,
        generation: this.pathfindingGeneration,
        width: this.game.width(),
        height: this.game.height(),
        startId: start,
        goalId: goal,
        ownerIds: new ArrayBuffer(0),
        terrain: new ArrayBuffer(0),
        roadMask: new ArrayBuffer(0),
        friendlyPlayerIds,
        maxExpand: 20000,
      };

      this.inFlightKeys.add(reqKey);
      this.pathfindingQueue.push({
        request,
        promiseResolve: (path) => {
          this.pathCache.set(key, path);
          resolve(path);
        },
        reqKey,
      });
      this.processPathfindingQueue();
    });
  }

  // --- All other original public methods are preserved below ---

  public findCompleteStructurePath(
    startUnit: Unit,
    endUnit: Unit,
  ): TileRef[] | null {
    const structurePath = this.structureGraph.findPath(startUnit, endUnit);
    if (!structurePath || structurePath.length < 2) return null;

    const completePath: TileRef[] = [];
    for (let i = 0; i < structurePath.length - 1; i++) {
      const from = structurePath[i];
      const to = structurePath[i + 1];
      const edge = this.structureGraph.getEdge(from, to);
      if (edge) {
        const segmentPath = [...edge.path];
        if (segmentPath[0] !== from.tile()) segmentPath.reverse();
        completePath.push(...(i === 0 ? segmentPath : segmentPath.slice(1)));
      }
    }
    return completePath;
  }

  public getConnectedNodes(player: Player): Unit[] {
    return this.nodesByOwner.get(player.id()) ?? [];
  }

  public destroyPlayerRoads(player: Player): void {
    const roadIdsToDestroy = this.roadsByOwner.get(player.id());
    if (!roadIdsToDestroy) return;

    for (const roadId of roadIdsToDestroy) {
      const road = this.roads.get(roadId);
      if (road) {
        for (const tile of road.path) {
          this.roadTilesCache.delete(tile);
          const roadsOnTile = this.tileToRoads.get(tile);
          if (roadsOnTile) {
            roadsOnTile.delete(road.id);
          }
        }

        const startNode = this.findNodeByTile(road.path[0]);
        const endNode = this.findNodeByTile(road.path[road.path.length - 1]);

        if (startNode && endNode) {
          this.structureGraph.removeEdge(startNode, endNode);
          const segment = this.getCanonicalSegment(
            startNode.tile(),
            endNode.tile(),
          );
          this.existingRoadSegments.delete(segment);
        }

        this.roads.delete(roadId);

        for (let i = 0; i < road.path.length - 1; i++) {
          const seg = this.getCanonicalSegment(road.path[i], road.path[i + 1]);
          if (this.segmentSet.delete(seg)) {
            this.pendingRemovedSegments.push(seg);
          }
        }
      }
    }
    this.roadsByOwner.delete(player.id());
    this.invalidatePendingPaths(); // Invalidate paths due to road changes
    this.roadsEpoch++;
  }

  public markPlayerNodesForReconnection(player: Player): void {
    const playerNodes = player
      .units(...this.eligible)
      .filter((u) => u.isActive());
    for (const node of playerNodes) {
      this.newNodesQueue.push(node);
    }
  }

  public buildInitialRoadNetwork(player: Player): void {
    const playerNodes = player
      .units(...this.eligible)
      .filter((u) => u.isActive());

    for (const newNode of playerNodes) {
      const nearbyNodes = this.spatialGrid
        .getNearby(newNode, 100)
        .filter((node) => {
          if (node.id() === newNode.id()) return false;
          const nodeOwner = this.game.owner(node.tile());
          return (
            nodeOwner.isPlayer() &&
            (player.id() === nodeOwner.id() ||
              player.isFriendly(nodeOwner as Player))
          );
        })
        .sort(
          (a, b) =>
            this.game.euclideanDistSquared(newNode.tile(), a.tile()) -
            this.game.euclideanDistSquared(newNode.tile(), b.tile()),
        )
        .slice(0, 5);

      for (const neighbor of nearbyNodes) {
        const segment = this.getCanonicalSegment(
          newNode.tile(),
          neighbor.tile(),
        );
        if (this.existingRoadSegments.has(segment)) {
          continue;
        }

        const existingPath = this.structureGraph.findPath(newNode, neighbor);
        const roadNetworkMaxRedundantPathLength = 5;

        if (
          existingPath === null ||
          existingPath.length > roadNetworkMaxRedundantPathLength
        ) {
          const path = this.shortestPathOverFriendlyLand(
            newNode.tile(),
            neighbor.tile(),
          );
          if (path) {
            this.structureGraph.addEdge(newNode, neighbor, path);
            const newRoad: Road = {
              id: nextRoadId++,
              path: path,
              owner: player.id(),
            };
            this.roads.set(newRoad.id, newRoad);

            if (!this.roadsByOwner.has(newRoad.owner)) {
              this.roadsByOwner.set(newRoad.owner, new Set());
            }
            this.roadsByOwner.get(newRoad.owner)!.add(newRoad.id);
            this.existingRoadSegments.add(segment);
            newRoad.path.forEach((tile) => {
              this.roadTilesCache.add(tile);
              if (!this.tileToRoads.has(tile)) {
                this.tileToRoads.set(tile, new Set());
              }
              this.tileToRoads.get(tile)!.add(newRoad.id);
            });

            for (let i = 0; i < path.length - 1; i++) {
              const a = path[i];
              const b = path[i + 1];
              const seg = this.getCanonicalSegment(a, b);
              if (!this.segmentSet.has(seg)) {
                this.segmentSet.add(seg);
                this.pendingAddedSegments.push(seg);
              }
            }
          }
        }
      }
    }
  }

  private shortestPathOverFriendlyLand(
    start: TileRef,
    goal: TileRef,
  ): TileRef[] | null {
    if (start === goal) return [start];

    const startOwner = this.game.owner(start);
    if (!startOwner.isPlayer()) return null;

    // Check maximum road distance (100 tiles)
    const maxRoadDistSquared = 100 * 100;
    if (this.game.euclideanDistSquared(start, goal) > maxRoadDistSquared) {
      return null;
    }

    const ok = (r: TileRef) => {
      if (!this.game.isLand(r)) return false;
      const owner = this.game.owner(r);
      if (!owner.isPlayer()) return false;
      if (owner.id() === startOwner.id()) return true;
      return startOwner.isFriendly(owner as Player);
    };

    if (!ok(start) || !ok(goal)) return null;

    // Fallback to regular A* search if no road path found
    const costs = new Map<TileRef, number>();
    const prev = new Map<TileRef, TileRef | null>();
    const pq = new PriorityQueue<TileRef>();

    costs.set(start, 0);
    pq.enqueue(0, start);

    while (pq.size > 0) {
      const current = pq.dequeue();
      if (!current) break;

      if (current === goal) break;

      const currentCost = costs.get(current) ?? Infinity;

      for (const neighbor of this.game.neighbors(current)) {
        if (!ok(neighbor)) continue;

        const cost = this.roadTilesCache.has(neighbor) ? 1 : 2;
        const newCost = currentCost + cost;

        if (newCost < (costs.get(neighbor) ?? Infinity)) {
          costs.set(neighbor, newCost);
          prev.set(neighbor, current);
          pq.enqueue(newCost, neighbor);
        }
      }
    }

    if (!costs.has(goal)) return null;

    const path: TileRef[] = [];
    for (
      let at: TileRef | null = goal;
      at !== null;
      at = prev.get(at) ?? null
    ) {
      path.push(at);
    }
    path.reverse();

    return path.length > 0 ? path : null;
  }

  public getRoads(): Road[] {
    return Array.from(this.roads.values());
  }

  private maybeReconcileSegments(force: boolean = false): void {
    const nowTick = this.game.ticks();
    if (
      !force && // Check force parameter
      nowTick - this.lastSegmentReconcileTick < this.RECONCILE_INTERVAL_TICKS
    ) {
      return;
    }
    this.lastSegmentReconcileTick = nowTick;

    // Build current authoritative set from roads
    const current = new Set<string>();
    for (const road of this.roads.values()) {
      for (let i = 0; i < road.path.length - 1; i++) {
        current.add(this.getCanonicalSegment(road.path[i], road.path[i + 1]));
      }
    }

    // Compute differences
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    for (const seg of current) {
      if (!this.segmentSet.has(seg)) toAdd.push(seg);
    }
    for (const seg of this.segmentSet) {
      if (!current.has(seg)) toRemove.push(seg);
    }

    if (toAdd.length === 0 && toRemove.length === 0) return;

    // Apply reconciliation to internal state and queue for renderer
    for (const seg of toAdd) this.segmentSet.add(seg);
    for (const seg of toRemove) this.segmentSet.delete(seg);
    this.pendingAddedSegments.push(...toAdd);
    this.pendingRemovedSegments.push(...toRemove);
  }

  public handleStructureCreated(unit: Unit) {
    if (!this.eligible.includes(unit.type())) return;
    this.newNodesQueue.push(unit);
    this.nodes.push(unit);
    this.tileToNode.set(unit.tile(), unit);
    this.spatialGrid.add(unit);
    this.structureGraph.addNode(unit);
  }

  public handleStructureDestroyed(tile: TileRef) {
    const unit = this.findNodeByTile(tile);
    if (!unit) return;

    if (!this.eligible.includes(unit.type())) return;

    const owner = this.game.owner(unit.tile());
    if (owner.isPlayer()) {
      this.markPlayerNodesForReconnection(owner as Player);
    }
    this.roadsEpoch++;
    this.invalidatePendingPaths();

    const affectedRoads = this.tileToRoads.get(unit.tile()) ?? new Set();

    for (const roadId of affectedRoads) {
      const road = this.roads.get(roadId);
      if (road) {
        for (const tile of road.path) {
          this.roadTilesCache.delete(tile);
        }
        const ownerRoads = this.roadsByOwner.get(road.owner);
        if (ownerRoads) {
          ownerRoads.delete(roadId);
        }

        const startTile = road.path[0];
        const endTile = road.path[road.path.length - 1];
        for (let i = 0; i < road.path.length - 1; i++) {
          const seg = this.getCanonicalSegment(road.path[i], road.path[i + 1]);
          if (this.segmentSet.delete(seg)) {
            this.pendingRemovedSegments.push(seg);
          }
        }
        this.roads.delete(roadId);
        this.existingRoadSegments.delete(
          this.getCanonicalSegment(startTile, endTile),
        );
      }
    }

    this.nodes = this.nodes.filter((n) => n.id() !== unit.id());
    this.tileToNode.delete(unit.tile());
    this.spatialGrid.remove(unit);
    this.structureGraph.removeNode(unit);
  }
  public handleAllianceChange() {
    this.ownershipEpoch++;
    this.invalidatePendingPaths();
  }

  private findNodeByTile(tile: TileRef): Unit | undefined {
    return this.tileToNode.get(tile);
  }
}
