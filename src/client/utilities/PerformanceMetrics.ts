import { UnitType } from "../../core/game/Game";

export class PerformanceMetrics {
  private static instance: PerformanceMetrics;

  // Metrics
  public fps: number = 0;
  public frameTime: number = 0; // ms
  public tps: number = 0;
  public latency: number = 0; // ms (Time Since Last Packet)
  public entities: number = 0;
  public memory: number = 0; // MB

  // Internal tracking
  private frames: number = 0;
  private lastFpsUpdate: number = 0;
  private ticks: number = 0;
  private lastTpsUpdate: number = 0;
  private lastPacketTime: number = Date.now();

  // Layer timings
  public layerTimings: Map<string, number> = new Map();
  private layerBuffers: Map<string, SmoothingBuffer> = new Map();

  // Smoothed Metrics
  private fpsBuffer = new SmoothingBuffer(2000); // 2s window
  private frameTimeBuffer = new SmoothingBuffer(2000);
  private tpsBuffer = new SmoothingBuffer(2000);
  private latencyBuffer = new SmoothingBuffer(2000);

  // Bandwidth
  public bandwidthUp: number = 0; // bytes/sec
  public bandwidthDown: number = 0; // bytes/sec
  private bandwidthUpBuffer = new SmoothingBuffer(2000);
  private bandwidthDownBuffer = new SmoothingBuffer(2000);
  private bytesSentThisSecond: number = 0;
  private bytesReceivedThisSecond: number = 0;
  private lastBandwidthUpdate: number = Date.now();

  // Composition & Visibility
  public unitComposition: Map<UnitType, number> = new Map();
  public visibleEntities: number = 0;

  public updateUnitComposition(composition: Map<UnitType, number>) {
    this.unitComposition = composition;
  }

  public enabled: boolean = false;

  private constructor() {}

  public static getInstance(): PerformanceMetrics {
    if (!PerformanceMetrics.instance) {
      PerformanceMetrics.instance = new PerformanceMetrics();
    }
    return PerformanceMetrics.instance;
  }

  public updateFrame(duration: number) {
    if (!this.enabled) return;

    this.frameTime = duration;
    this.frameTimeBuffer.push(duration);
    this.frames++;

    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frames;
      this.fpsBuffer.push(this.frames);
      this.frames = 0;
      this.lastFpsUpdate = now;
      this.updateMemory();
      this.updateBandwidth();
    }
  }

  public updateBandwidth() {
    // Called once per second by updateFrame loop
    this.bandwidthUp = this.bytesSentThisSecond;
    this.bandwidthDown = this.bytesReceivedThisSecond;
    this.bandwidthUpBuffer.push(this.bytesSentThisSecond);
    this.bandwidthDownBuffer.push(this.bytesReceivedThisSecond);
    this.bytesSentThisSecond = 0;
    this.bytesReceivedThisSecond = 0;
  }

  public resetVisibleCount() {
    this.visibleEntities = 0;
  }

  public incrementVisibleEntities(count: number) {
    this.visibleEntities += count;
  }

  public recordBytesSent(bytes: number) {
    if (!this.enabled) return;
    this.bytesSentThisSecond += bytes;
  }

  public recordBytesReceived(bytes: number) {
    if (!this.enabled) return;
    this.bytesReceivedThisSecond += bytes;
  }

  public updateTick() {
    if (!this.enabled) return;
    this.ticks++;
    const now = performance.now();
    if (now - this.lastTpsUpdate >= 1000) {
      this.tps = this.ticks;
      this.tpsBuffer.push(this.ticks);
      this.ticks = 0;
      this.lastTpsUpdate = now;
    }
  }

  public updatePacketReceived() {
    if (!this.enabled) return;
    this.lastPacketTime = Date.now();
  }

  public updateEntityCount(count: number) {
    if (!this.enabled) return;
    this.entities = count;
  }

  public updateLayerDuration(layerName: string, duration: number) {
    if (!this.enabled) return;
    let buffer = this.layerBuffers.get(layerName);
    if (!buffer) {
      buffer = new SmoothingBuffer(2000);
      this.layerBuffers.set(layerName, buffer);
    }
    buffer.push(duration);
    this.layerTimings.set(layerName, buffer.getAverage());
  }

  // Helper to get current TSLP
  public getLatency(): number {
    const latency = Date.now() - this.lastPacketTime;
    this.latencyBuffer.push(latency);
    return latency;
  }

  // Get smoothed values
  public getSmoothedFps(): number {
    return this.fpsBuffer.getAverage();
  }
  public getSmoothedFrameTime(): number {
    return this.frameTimeBuffer.getAverage();
  }
  public getSmoothedTps(): number {
    return this.tpsBuffer.getAverage();
  }
  public getSmoothedLatency(): number {
    return this.latencyBuffer.getAverage();
  }
  public getSmoothedBandwidthUp(): number {
    return this.bandwidthUpBuffer.getAverage();
  }
  public getSmoothedBandwidthDown(): number {
    return this.bandwidthDownBuffer.getAverage();
  }

  private updateMemory() {
    if ((performance as any).memory) {
      this.memory = Math.round(
        (performance as any).memory.usedJSHeapSize / 1024 / 1024,
      );
    }
  }
}

class SmoothingBuffer {
  private values: { val: number; time: number }[] = [];
  constructor(private windowMs: number) {}

  push(val: number) {
    const now = performance.now();
    this.values.push({ val, time: now });
    this.prune(now);
  }

  private prune(now: number) {
    while (
      this.values.length > 0 &&
      now - this.values[0].time > this.windowMs
    ) {
      this.values.shift();
    }
  }

  getAverage(): number {
    if (this.values.length === 0) return 0;
    const sum = this.values.reduce((acc, v) => acc + v.val, 0);
    return sum / this.values.length;
  }
}
