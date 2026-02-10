/**
 * Long-press gesture detector
 * Detects when user holds finger on screen for extended period
 */

import { HapticFeedback } from "../utils/HapticFeedback";

export interface LongPressOptions {
  duration?: number; // milliseconds to hold before triggering (default: 600)
  movementThreshold?: number; // max pixels of movement allowed (default: 10)
}

export type LongPressCallback = (position: { x: number; y: number }) => void;

export class LongPressDetector {
  private readonly duration: number;
  private readonly movementThreshold: number;
  private timer: NodeJS.Timeout | null = null;
  private startPosition: { x: number; y: number } | null = null;
  private callback: LongPressCallback | null = null;

  constructor(options: LongPressOptions = {}) {
    this.duration = options.duration ?? 600;
    this.movementThreshold = options.movementThreshold ?? 10;
  }

  /**
   * Start detecting a potential long-press
   */
  start(position: { x: number; y: number }, callback: LongPressCallback): void {
    this.cancel(); // Cancel any existing detection

    this.startPosition = position;
    this.callback = callback;

    this.timer = setTimeout(() => {
      if (this.callback && this.startPosition) {
        // Trigger haptic feedback for long-press
        HapticFeedback.longPress();
        this.callback(this.startPosition);
      }
      this.cleanup();
    }, this.duration);
  }

  /**
   * Check if movement should cancel the long-press
   */
  checkMovement(currentPosition: { x: number; y: number }): boolean {
    if (!this.startPosition) return false;

    const dx = currentPosition.x - this.startPosition.x;
    const dy = currentPosition.y - this.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.movementThreshold) {
      this.cancel();
      return true; // Movement exceeded threshold
    }

    return false; // Still within threshold
  }

  /**
   * Cancel the long-press detection
   */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.cleanup();
  }

  /**
   * Check if currently detecting a long-press
   */
  isActive(): boolean {
    return this.timer !== null;
  }

  private cleanup(): void {
    this.startPosition = null;
    this.callback = null;
  }
}
