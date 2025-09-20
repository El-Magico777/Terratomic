type CanvasLike = { width: number; height: number };

const mockContextSymbol = Symbol("mockCanvasContext");

function createMockCanvasContext(canvas: CanvasLike): CanvasRenderingContext2D {
  let fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  let strokeStyle: string | CanvasGradient | CanvasPattern = "#000000";
  let lineWidth = 1;
  let lineJoin: CanvasLineJoin = "miter";
  let lineCap: CanvasLineCap = "butt";

  const context: Record<string, unknown> = {
    canvas,
    clearRect: (..._args: unknown[]) => {},
    fillRect: (..._args: unknown[]) => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: (..._args: unknown[]) => {},
    lineTo: (..._args: unknown[]) => {},
    stroke: (..._args: unknown[]) => {},
    save: () => {},
    restore: () => {},
    translate: (..._args: unknown[]) => {},
    drawImage: (..._args: unknown[]) => {},
    getImageData: (..._args: unknown[]) =>
      ({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      }) as unknown as ImageData,
  };

  Object.defineProperty(context, "fillStyle", {
    configurable: true,
    enumerable: true,
    get: () => fillStyle,
    set: (value: unknown) => {
      fillStyle = value as typeof fillStyle;
    },
  });

  Object.defineProperty(context, "strokeStyle", {
    configurable: true,
    enumerable: true,
    get: () => strokeStyle,
    set: (value: unknown) => {
      strokeStyle = value as typeof strokeStyle;
    },
  });

  Object.defineProperty(context, "lineWidth", {
    configurable: true,
    enumerable: true,
    get: () => lineWidth,
    set: (value: unknown) => {
      lineWidth = value as number;
    },
  });

  Object.defineProperty(context, "lineJoin", {
    configurable: true,
    enumerable: true,
    get: () => lineJoin,
    set: (value: unknown) => {
      lineJoin = value as CanvasLineJoin;
    },
  });

  Object.defineProperty(context, "lineCap", {
    configurable: true,
    enumerable: true,
    get: () => lineCap,
    set: (value: unknown) => {
      lineCap = value as CanvasLineCap;
    },
  });

  return context as unknown as CanvasRenderingContext2D;
}

if (typeof HTMLCanvasElement !== "undefined") {
  const prototype = HTMLCanvasElement.prototype as unknown as {
    [mockContextSymbol]?: CanvasRenderingContext2D;
    getContext(
      contextId: string,
      options?: unknown,
    ): CanvasRenderingContext2D | null;
  };

  prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    contextId: string,
  ): CanvasRenderingContext2D | null {
    if (contextId !== "2d") {
      return null;
    }

    const canvas = this as unknown as typeof prototype;
    canvas[mockContextSymbol] ??= createMockCanvasContext(this);

    return canvas[mockContextSymbol] ?? null;
  };
}

class OffscreenCanvasMock {
  width: number;
  height: number;
  private context: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.context = createMockCanvasContext(this as unknown as CanvasLike);
  }

  getContext(
    contextId: string,
    _options?: unknown,
  ): CanvasRenderingContext2D | null {
    if (contextId !== "2d") {
      return null;
    }

    return this.context;
  }
}

const globalAny = global as any;
globalAny.createMockCanvasContext = createMockCanvasContext;
globalAny.OffscreenCanvas = OffscreenCanvasMock;
