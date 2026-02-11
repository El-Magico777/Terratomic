/**
 * Edge swipe detector for triggering sidebars
 * Detects swipes from left/right screen edges
 */

export class EdgeSwipeDetector {
  private static readonly EDGE_THRESHOLD = 20; // pixels from edge
  private static readonly MIN_SWIPE_DISTANCE = 50; // minimum swipe distance
  private static readonly MIN_VELOCITY = 150; // pixels per second

  /**
   * Checks if a swipe started from the left edge
   */
  static isLeftEdgeSwipe(
    startX: number,
    startY: number,
    deltaX: number,
    duration: number,
  ): boolean {
    const velocity = Math.abs(deltaX) / (duration / 1000);

    return (
      startX < this.EDGE_THRESHOLD &&
      deltaX > this.MIN_SWIPE_DISTANCE &&
      velocity >= this.MIN_VELOCITY
    );
  }

  /**
   * Checks if a swipe started from the right edge
   */
  static isRightEdgeSwipe(
    startX: number,
    screenWidth: number,
    deltaX: number,
    duration: number,
  ): boolean {
    const velocity = Math.abs(deltaX) / (duration / 1000);

    return (
      startX > screenWidth - this.EDGE_THRESHOLD &&
      deltaX < -this.MIN_SWIPE_DISTANCE &&
      velocity >= this.MIN_VELOCITY
    );
  }

  /**
   * Checks if a touch started in an edge zone
   */
  static isTouchInEdgeZone(x: number, screenWidth: number): boolean {
    return x < this.EDGE_THRESHOLD || x > screenWidth - this.EDGE_THRESHOLD;
  }
}
