/**
 * NOTE: This file is designed to be dependency-free for use in a Web Worker.
 * It contains a high-performance, low-allocation A* implementation.
 */

// A minimal, array-based binary heap for the A* open set.
// It is implemented as a class for encapsulation but uses flat arrays internally
// to avoid creating objects in the hot path.
class BinaryHeap {
  private nodes: number[] = []; // Stores tile IDs
  private scores: number[] = []; // Stores f-scores (priority)

  public get size(): number {
    return this.nodes.length;
  }

  public enqueue(id: number, score: number): void {
    this.nodes.push(id);
    this.scores.push(score);
    this.bubbleUp(this.nodes.length - 1);
  }

  public dequeue(): number {
    const firstId = this.nodes[0];
    const lastId = this.nodes.pop()!;
    const lastScore = this.scores.pop()!;

    if (this.nodes.length > 0) {
      this.nodes[0] = lastId;
      this.scores[0] = lastScore;
      this.bubbleDown(0);
    }
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
    [this.nodes[i], this.nodes[j]] = [this.nodes[j], this.nodes[i]];
    [this.scores[i], this.scores[j]] = [this.scores[j], this.scores[i]];
  }
}

/**
 * High-performance, low-allocation A* pathfinding function.
 * Designed for use in a Web Worker with raw, serializable data.
 * Uses a 4-way neighbor model and Manhattan distance heuristic.
 *
 * @param width The width of the map.
 * @param height The height of the map.
 * @param startId The starting tile ID.
 * @param goalId The goal tile ID.
 * @param isLand A function to check if a tile ID is land.
 * @param isFriendly A function to check if a tile's owner ID is friendly.
 * @param ownerIds A typed array mapping tile ID to owner ID.
 * @param roadMask A typed array where 1 indicates a road and 0 does not.
 * @param maxExpand The maximum number of nodes to expand before failing.
 * @returns An Int32Array representing the path, or null if no path is found.
 */
export function findPath(
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
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        if (newCost < costSoFar[neighborId]) {
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
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        if (newCost < costSoFar[neighborId]) {
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
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        if (newCost < costSoFar[neighborId]) {
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
        const cost = roadMask[neighborId] === 1 ? 1 : 2;
        const newCost = currentCost + cost;
        if (newCost < costSoFar[neighborId]) {
          costSoFar[neighborId] = newCost;
          cameFrom[neighborId] = currentId;
          openSet.enqueue(neighborId, newCost + heuristic(neighborId));
        }
      }
    }
  }

  return null; // No path found or max expansions reached
}
