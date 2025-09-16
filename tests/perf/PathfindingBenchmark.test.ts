import { TileRef } from "../../src/core/game/GameMap";

// Copied from AStarSearch.ts for debugging
class BinaryHeap {
  private nodes: number[] = []; // Stores tile IDs
  private scores: number[] = []; // Stores f-scores (priority)

  public get size(): number {
    return this.nodes.length;
  }

  public enqueue(id: number, score: number): void {
    console.log(`Enqueue: id=${id}, score=${score}`);
    this.nodes.push(id);
    console.log(`  nodes after push: ${this.nodes}`);
    this.scores.push(score);
    console.log(`  scores after push: ${this.scores}`);
    this.bubbleUp(this.nodes.length - 1);
  }

  public dequeue(): number {
    const firstId = this.nodes[0];
    console.log(`Dequeue: firstId=${firstId}`);

    if (this.nodes.length === 1) {
      this.nodes.pop();
      this.scores.pop();
      console.log(`  nodes after pop (single element): ${this.nodes}`);
      console.log(`  scores after pop (single element): ${this.scores}`);
      return firstId;
    }

    const lastId = this.nodes.pop()!;
    console.log(`  nodes after pop: ${this.nodes}`);
    const lastScore = this.scores.pop()!;
    console.log(`  scores after pop: ${this.scores}`);

    this.nodes[0] = lastId;
    this.scores[0] = lastScore;
    this.bubbleDown(0);

    return firstId;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.scores[parentIndex] <= this.scores[index]) {
        break;
      }
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const lastIndex = this.nodes.length - 1;
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (
        leftChild <= lastIndex &&
        this.scores[leftChild] < this.scores[smallest]
      ) {
        smallest = leftChild;
      }
      // Tie-break by lower tile ID for determinism
      else if (
        leftChild <= lastIndex &&
        this.scores[leftChild] === this.scores[smallest]
      ) {
        if (this.nodes[leftChild] < this.nodes[smallest]) {
          smallest = leftChild;
        }
      }

      if (
        rightChild <= lastIndex &&
        this.scores[rightChild] < this.scores[smallest]
      ) {
        smallest = rightChild;
      }
      // Tie-break
      else if (
        rightChild <= lastIndex &&
        this.scores[rightChild] === this.scores[smallest]
      ) {
        if (this.nodes[rightChild] < this.nodes[smallest]) {
          smallest = rightChild;
        }
      }

      if (smallest === index) {
        break;
      }

      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    console.log(
      `Swap: i=${i}, j=${j}, nodes=${this.nodes}, scores=${this.scores}`,
    );
    [this.nodes[i], this.nodes[j]] = [this.nodes[j], this.nodes[i]];
    [this.scores[i], this.scores[j]] = [this.scores[j], this.scores[i]];
  }
}

function findPath(
  width: number,
  height: number,
  startId: number,
  goalId: number,
  isLand: (id: number) => boolean,
  isFriendly: (ownerId: number) => boolean,
  ownerIds: Uint16Array,
  roadMask: Uint8Array,
  maxExpand: number,
): Int32Array | null {
  if (startId === goalId) {
    const path = new Int32Array(1);
    path[0] = startId;
    return path;
  }

  const numTiles = width * height;
  const cameFrom = new Int32Array(numTiles).fill(-1);
  const costSoFar = new Int32Array(numTiles).fill(2147483647);
  const openSet = new BinaryHeap();

  const goalX = goalId % width;
  const goalY = Math.floor(goalId / width);

  const heuristic = (id: number): number => {
    const x = id % width;
    const y = Math.floor(id / width);
    return Math.abs(x - goalX) + Math.abs(y - goalY); // Manhattan distance
  };

  costSoFar[startId] = 0;
  openSet.enqueue(startId, heuristic(startId));

  let expansions = 0;
  while (openSet.size > 0 && expansions < maxExpand) {
    const currentId = openSet.dequeue();
    console.log(
      `Looping: openSet.size=${openSet.size}, expansions=${expansions}, currentId=${currentId}`,
    );

    if (currentId === goalId) {
      // Path found, reconstruct it into a flat Int32Array
      let length = 0;
      for (let at = goalId; at !== -1; at = cameFrom[at]) {
        length++;
      }
      const result = new Int32Array(length);
      let at = goalId;
      for (let i = length - 1; i >= 0; i--) {
        result[i] = at;
        at = cameFrom[at];
      }
      return result;
    }

    expansions++;

    const currentCost = costSoFar[currentId];
    const currentX = currentId % width;
    const currentY = Math.floor(currentId / width);

    // --- 4-way neighbors (inline bounds checks, no allocations) ---

    // North
    if (currentY > 0) {
      const neighborId = currentId - width;
      if (isLand(neighborId) && isFriendly(ownerIds[neighborId])) {
        console.log(
          `  Neighbor ${neighborId}: isLand=${isLand(neighborId)}, isFriendly=${isFriendly(ownerIds[neighborId])}`,
        );
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        console.log(
          `  Neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
        );
        if (newCost < costSoFar[neighborId]) {
          console.log(
            `  Updating neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
          );
          costSoFar[neighborId] = newCost;
          cameFrom[neighborId] = currentId;
          openSet.enqueue(neighborId, newCost + heuristic(neighborId));
        }
      }
    }
    // South
    if (currentY < height - 1) {
      const neighborId = currentId + width;
      if (isLand(neighborId) && isFriendly(ownerIds[neighborId])) {
        console.log(
          `  Neighbor ${neighborId}: isLand=${isLand(neighborId)}, isFriendly=${isFriendly(ownerIds[neighborId])}`,
        );
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        console.log(
          `  Neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
        );
        if (newCost < costSoFar[neighborId]) {
          console.log(
            `  Updating neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
          );
          costSoFar[neighborId] = newCost;
          cameFrom[neighborId] = currentId;
          openSet.enqueue(neighborId, newCost + heuristic(neighborId));
        }
      }
    }
    // West
    if (currentX > 0) {
      const neighborId = currentId - 1;
      if (isLand(neighborId) && isFriendly(ownerIds[neighborId])) {
        console.log(
          `  Neighbor ${neighborId}: isLand=${isLand(neighborId)}, isFriendly=${isFriendly(ownerIds[neighborId])}`,
        );
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        console.log(
          `  Neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
        );
        if (newCost < costSoFar[neighborId]) {
          console.log(
            `  Updating neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
          );
          costSoFar[neighborId] = newCost;
          cameFrom[neighborId] = currentId;
          openSet.enqueue(neighborId, newCost + heuristic(neighborId));
        }
      }
    }
    // East
    if (currentX < width - 1) {
      const neighborId = currentId + 1;
      if (isLand(neighborId) && isFriendly(ownerIds[neighborId])) {
        console.log(
          `  Neighbor ${neighborId}: isLand=${isLand(neighborId)}, isFriendly=${isFriendly(ownerIds[neighborId])}`,
        );
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        console.log(
          `  Neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
        );
        if (newCost < costSoFar[neighborId]) {
          console.log(
            `  Updating neighbor ${neighborId}: newCost=${newCost}, oldCost=${costSoFar[neighborId]}`,
          );
          costSoFar[neighborId] = newCost;
          cameFrom[neighborId] = currentId;
          openSet.enqueue(neighborId, newCost + heuristic(neighborId));
        }
      }
    }
  }
  console.log(cameFrom);
  return null; // No path found or max expansions reached
}

describe("Pathfinding Benchmark", () => {
  it("should run pathfinding on a worst-case map within the budget", () => {
    const width = 3;
    const height = 3;

    const terrain = new Uint8Array(width * height).fill(128);
    const ownerIds = new Uint16Array(width * height);

    const startNode = 0 as TileRef;
    const endNode = 8 as TileRef;

    const startTime = performance.now();
    const path = findPath(
      width,
      height,
      startNode,
      endNode,
      (tile: TileRef) => (terrain[tile] & 128) !== 0,
      (ownerId: number) => true, // Assuming all tiles are friendly for the benchmark
      ownerIds,
      new Uint8Array(width * height), // Assuming no roads for the benchmark
      20000,
    );
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    console.log(`Pathfinding execution time: ${executionTime}ms`);

    expect(path).not.toBeNull();
    expect(executionTime).toBeLessThan(4);
  });
});
