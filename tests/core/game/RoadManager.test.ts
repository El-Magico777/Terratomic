import {
  FindPathRequest,
  FindPathResponse,
  TerrainFlags,
} from "../../../src/client/workers/PathfindingWorkerTypes";
import {
  Player,
  PlayerType,
  UnitType,
  UpgradeType,
} from "../../../src/core/game/Game";
import { GameImpl } from "../../../src/core/game/GameImpl";
import { PlayerImpl } from "../../../src/core/game/PlayerImpl";
import { RoadManager } from "../../../src/core/game/RoadManager";
import { findPath } from "../../../src/core/pathfinding/AStarSearch";
import { playerInfo, setup } from "../../util/Setup";

const originalWorker = (globalThis as any).Worker;
const flushMicrotasks = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

describe("RoadManager", () => {
  afterEach(() => {
    (globalThis as any).Worker = originalWorker;
  });


  describe("when Web Workers are unavailable", () => {
    let game: GameImpl;
    let playerA: Player;
    let roadManager: RoadManager;

    beforeEach(async () => {
      (globalThis as any).Worker = undefined;
      game = (await setup("ocean_and_land", {
        instantBuild: true,
      })) as GameImpl;
      const pInfo = playerInfo("Player A", PlayerType.Human);
      game.addPlayer(pInfo);
      playerA = game.player(pInfo.id);
      roadManager = (game as any).roadManager;
    });

    it("caches computed paths when the player has the Roads upgrade", async () => {
      playerA.addUpgrade(UpgradeType.Roads);

      const tile1 = game.ref(0, 10);
      const tile2 = game.ref(0, 15);

      for (let i = 10; i <= 15; i++) {
        const tile = game.ref(0, i);
        if (game.owner(tile) !== playerA) {
          game.conquer(playerA as PlayerImpl, tile);
        }
      }

      playerA.buildUnit(UnitType.City, tile1, {});
      playerA.buildUnit(UnitType.City, tile2, {});

      const path = await (roadManager as any).computePath(tile1, tile2);
      expect(path).toBeInstanceOf(Int32Array);
      expect((roadManager as any).pathCache.size).toBeGreaterThan(0);
    });

    it("caches null paths when the player lacks the Roads upgrade", async () => {
      const tile1 = game.ref(0, 10);
      const tile2 = game.ref(0, 15);
      game.conquer(playerA as PlayerImpl, tile1);
      game.conquer(playerA as PlayerImpl, tile2);

      playerA.buildUnit(UnitType.City, tile1, {});
      playerA.buildUnit(UnitType.City, tile2, {});

      const path = await (roadManager as any).computePath(tile1, tile2);
      expect(path).toBeNull();
      const segmentKey = (roadManager as any).getCanonicalSegment(tile1, tile2);
      expect((roadManager as any).pathCache.size).toBe(1);
      expect((roadManager as any).pathCache.get(segmentKey)).toBeNull();

      const cachedPath = await (roadManager as any).computePath(tile1, tile2);
      expect(cachedPath).toBeNull();
    });

    it("destroyPlayerRoads clears road structures but retains cached paths", async () => {
      playerA.addUpgrade(UpgradeType.Roads);
      const tile1 = game.ref(0, 10);
      const tile2 = game.ref(0, 15);
      for (let i = 10; i <= 15; i++) {
        game.conquer(playerA as PlayerImpl, game.ref(0, i));
      }

      playerA.buildUnit(UnitType.City, tile1, {});
      playerA.buildUnit(UnitType.City, tile2, {});

      const path = await (roadManager as any).computePath(tile1, tile2);
      const segmentKey = (roadManager as any).getCanonicalSegment(tile1, tile2);
      expect((roadManager as any).pathCache.size).toBeGreaterThan(0);
      expect((roadManager as any).pathCache.get(segmentKey)).toBe(path);

      roadManager.destroyPlayerRoads(playerA);

      expect((roadManager as any).roads.size).toBe(0);
      expect((roadManager as any).pathCache.get(segmentKey)).toBe(path);
    });

    it("markPlayerNodesForReconnection can reuse cached paths", async () => {
      playerA.addUpgrade(UpgradeType.Roads);
      const tile1 = game.ref(0, 10);
      const tile2 = game.ref(0, 15);
      for (let i = 10; i <= 15; i++) {
        game.conquer(playerA as PlayerImpl, game.ref(0, i));
      }


      playerA.buildUnit(UnitType.City, tile1, {});
      playerA.buildUnit(UnitType.City, tile2, {});

      const path = await (roadManager as any).computePath(tile1, tile2);
      const segmentKey = (roadManager as any).getCanonicalSegment(tile1, tile2);
      expect((roadManager as any).pathCache.size).toBeGreaterThan(0);
      expect((roadManager as any).pathCache.get(segmentKey)).toBe(path);

      roadManager.destroyPlayerRoads(playerA);
      expect((roadManager as any).roads.size).toBe(0);

      playerA.addUpgrade(UpgradeType.Roads);
      roadManager.markPlayerNodesForReconnection(playerA);

      const recomputedPath = await (roadManager as any).computePath(
        tile1,
        tile2,
      );
      expect(recomputedPath).toBe(path);
      expect((roadManager as any).pathCache.get(segmentKey)).toBe(path);
    });

    it("uses in-process pathfinding when workers are unavailable", async () => {
      playerA.addUpgrade(UpgradeType.Roads);
      const tile1 = game.ref(0, 10);
      const tile2 = game.ref(0, 15);
      for (let i = 10; i <= 15; i++) {
        game.conquer(playerA as PlayerImpl, game.ref(0, i));
      }


      const path = await (roadManager as any).computePath(tile1, tile2);

      expect((roadManager as any).worker).toBeNull();
      expect(path).toBeInstanceOf(Int32Array);
      expect(path?.length).toBeGreaterThan(0);
    });
  });

  describe("when Web Workers are available", () => {
    class PathfindingWorkerMock {
      public onmessage: ((event: { data: FindPathResponse }) => void) | null =
        null;
      public onmessageerror: ((event: unknown) => void) | null = null;
      public onerror: ((error: unknown) => void) | null = null;
      public lastMessage: FindPathRequest | null = null;
      public static instance: PathfindingWorkerMock | null = null;

      constructor() {
        PathfindingWorkerMock.instance = this;
      }

      postMessage(message: FindPathRequest) {
        this.lastMessage = message;
        try {
          const terrain = new Uint8Array(message.terrain);
          const ownerIds = new Uint16Array(message.ownerIds);
          const roadMask = new Uint8Array(message.roadMask);
          const friendlyLookup = new Uint8Array(65536);
          for (let i = 0; i < message.friendlyPlayerIds.length; i++) {
            friendlyLookup[message.friendlyPlayerIds[i]] = 1;
          }
          const isFriendly = (ownerId: number) => friendlyLookup[ownerId] === 1;
          const isLand = (id: number) =>
            Boolean(terrain[id] & (1 << TerrainFlags.IS_LAND_BIT));

          const path = findPath(
            message.width,
            message.height,
            message.startId,
            message.goalId,
            isLand,
            isFriendly,
            ownerIds,
            roadMask,
            message.maxExpand,
          );

          this.onmessage?.({
            data: {
              protocolVersion: 1,
              type: "pathResult",
              requestId: message.requestId,
              generation: message.generation,
              path,
            },
          });
        } catch (error) {
          this.onerror?.(error);
        }
      }

      terminate() {
        PathfindingWorkerMock.instance = null;
      }
    }


    let game: GameImpl;
    let playerA: Player;
    let roadManager: RoadManager;

    beforeEach(async () => {
      PathfindingWorkerMock.instance = null;
      (globalThis as any).Worker =
        PathfindingWorkerMock as unknown as typeof Worker;
      game = (await setup("ocean_and_land", {
        instantBuild: true,
      })) as GameImpl;
      const pInfo = playerInfo("Player A", PlayerType.Human);
      game.addPlayer(pInfo);
      playerA = game.player(pInfo.id);
      roadManager = (game as any).roadManager;
    });

    it("delegates pathfinding to a worker when available", async () => {
      playerA.addUpgrade(UpgradeType.Roads);
      const tile1 = game.ref(0, 10);
      const tile2 = game.ref(0, 15);
      for (let i = 10; i <= 15; i++) {
        game.conquer(playerA as PlayerImpl, game.ref(0, i));
      }

     const path = await (roadManager as any).computePath(tile1, tile2);


      expect((roadManager as any).worker).toBeInstanceOf(PathfindingWorkerMock);
      expect(PathfindingWorkerMock.instance?.lastMessage).not.toBeNull();
      expect(path).toBeInstanceOf(Int32Array);
      expect(path?.length).toBeGreaterThan(0);
    });
  });
});
