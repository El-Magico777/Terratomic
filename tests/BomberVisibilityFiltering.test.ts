import { GameRunner } from "../src/core/GameRunner";
import { Executor } from "../src/core/execution/ExecutionManager";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../src/core/game/Game";
import { GameUpdateType } from "../src/core/game/GameUpdates";
import { setup } from "./util/Setup";

describe("Bomber visibility filtering", () => {
  let game: Game;
  let p1: Player;

  beforeEach(async () => {
    game = await setup(
      "half_land_half_ocean",
      {
        infiniteGold: true,
        instantBuild: true,
      },
      [
        new PlayerInfo("us", "p1", PlayerType.Human, "c1", "player_1_id"),
        new PlayerInfo("us", "p2", PlayerType.Human, "c2", "player_2_id"),
      ],
    );

    while (game.inSpawnPhase()) {
      game.executeNextTick();
    }

    p1 = game.player("player_1_id");
  });

  // half_land_half_ocean has land on the left side (x < 7)
  const landX = 5;
  const airfieldY = 5;

  function ensureP1OwnsTestTiles(): void {
    // Ensure the tiles we use are owned + land so canBuild succeeds.
    for (const y of [airfieldY - 1, airfieldY, airfieldY + 1]) {
      const tile = game.ref(landX, y);
      if (game.isValidRef(tile) && game.isLand(tile)) {
        p1.conquer(tile);
      }
    }
  }

  function requireBuildable(spawn: number | false, what: string): number {
    if (spawn === false) {
      throw new Error(`${what} is not buildable in test setup`);
    }
    return spawn;
  }

  function mkRunner(clientID: string): GameRunner {
    const exec = new Executor(game, "test_game", clientID);
    return new GameRunner(game, exec, () => {}, clientID);
  }

  test("Arrival into owned airfield is not filtered (pos != lastPos)", () => {
    ensureP1OwnsTestTiles();

    const airfieldTile = game.ref(landX, airfieldY);
    const airfieldSpawn = requireBuildable(
      p1.canBuild(UnitType.Airfield, airfieldTile),
      "Airfield",
    );
    const airfield = p1.buildUnit(UnitType.Airfield, airfieldSpawn, {});

    // Damage the airfield so it emits updates (regen path), matching the reported scenario.
    airfield.modifyHealth(-10);

    const bomberStartTile = game.ref(landX, airfieldY - 1);
    const bomberSpawn = requireBuildable(
      p1.canBuild(UnitType.Bomber, bomberStartTile),
      "Bomber",
    );
    const bomber = p1.buildUnit(UnitType.Bomber, bomberSpawn, {
      targetTile: airfield.tile(),
      sourceAirfield: airfield,
    });

    // Create an arrival update where bomber moves onto the airfield tile this tick.
    bomber.move(airfield.tile());

    const updates = game.executeNextTick();
    (updates as any)[GameUpdateType.Unit] = [
      airfield.toUpdate(),
      bomber.toUpdate(),
    ];

    const runner = mkRunner("c2");
    const filtered = runner.filterUpdatesForClient(updates);

    const unitTypes = filtered[GameUpdateType.Unit].map(
      (u) => (u as any).unitType,
    );
    expect(unitTypes).toContain(UnitType.Airfield);
    expect(unitTypes).toContain(UnitType.Bomber);
  });

  test("Idle bomber sitting on owned airfield is filtered (pos == lastPos)", () => {
    ensureP1OwnsTestTiles();

    const airfieldTile = game.ref(landX, airfieldY);
    const airfieldSpawn = requireBuildable(
      p1.canBuild(UnitType.Airfield, airfieldTile),
      "Airfield",
    );
    const airfield = p1.buildUnit(UnitType.Airfield, airfieldSpawn, {});

    const bomberSpawn = requireBuildable(
      p1.canBuild(UnitType.Bomber, airfield.tile()),
      "Bomber",
    );
    const bomber = p1.buildUnit(UnitType.Bomber, bomberSpawn, {
      targetTile: airfield.tile(),
      sourceAirfield: airfield,
    });

    const updates = game.executeNextTick();
    (updates as any)[GameUpdateType.Unit] = [
      airfield.toUpdate(),
      bomber.toUpdate(),
    ];

    const runner = mkRunner("c2");
    const filtered = runner.filterUpdatesForClient(updates);

    const unitTypes = filtered[GameUpdateType.Unit].map(
      (u) => (u as any).unitType,
    );
    expect(unitTypes).toContain(UnitType.Airfield);
    expect(unitTypes).not.toContain(UnitType.Bomber);
  });
});
