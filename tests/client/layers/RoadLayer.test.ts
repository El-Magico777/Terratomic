/**
 * @jest-environment jsdom
 */
import { colord } from "colord";
import { RoadLayer } from "../../../src/client/graphics/layers/RoadLayer";
import { TransformHandler } from "../../../src/client/graphics/TransformHandler";
import {
  GameUpdateType,
  RoadsUpdate,
} from "../../../src/core/game/GameUpdates";
import { GameView } from "../../../src/core/game/GameView";

describe("RoadLayer", () => {
  let gameView: jest.Mocked<GameView>;
  let transformHandler: jest.Mocked<TransformHandler>;
  let roadLayer: RoadLayer;

  beforeEach(() => {
    gameView = {
      updatesSinceLastTick: jest.fn(),
      width: jest.fn().mockReturnValue(100),
      height: jest.fn().mockReturnValue(100),
      owner: jest.fn().mockReturnValue({ isPlayer: () => true }),
      x: jest.fn(),
      y: jest.fn(),
      config: jest.fn().mockReturnValue({
        theme: jest.fn().mockReturnValue({
          territoryColor: jest.fn().mockReturnValue(colord("#ff0000")),
        }),
      }),
      roads: jest.fn().mockReturnValue([]),
    } as any;

    transformHandler = {
      scale: 1,
      screenBoundingRect: jest.fn().mockReturnValue([
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ]),
    } as any;

    roadLayer = new RoadLayer(gameView, transformHandler);
    roadLayer.init();
  });

  it("should redraw when there are road updates", () => {
    const redrawSpy = jest.spyOn(roadLayer as any, "redrawDirtyChunks");
    const roadUpdate: RoadsUpdate = {
      type: GameUpdateType.Roads,
      added: ["1-2"],
      removed: [],
    };
    const updates: any = {
      [GameUpdateType.Roads]: [roadUpdate],
    };
    gameView.updatesSinceLastTick.mockReturnValue(updates);
    gameView.isValidCoord = jest.fn().mockReturnValue(true);
    gameView.ref = jest.fn().mockReturnValue(1);

    roadLayer.tick();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    expect(context).not.toBeNull();

    roadLayer.renderLayer(context!);

    expect(redrawSpy).toHaveBeenCalled();
  });
});
