import { GameRunner } from "../src/core/GameRunner";
import { BomberExecution } from "../src/core/execution/BomberExecution";
import { Executor } from "../src/core/execution/ExecutionManager";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  Unit,
  UnitType,
} from "../src/core/game/Game";
import { GameUpdateType } from "../src/core/game/GameUpdates";
import { setup } from "./util/Setup";
import { executeTicks } from "./util/utils";

describe("Bomber returns to damaged airfield", () => {
  let game: Game;
  let player1: Player;
  let player2: Player;

  beforeEach(async () => {
    game = await setup(
      "BigPlains",
      {
        infiniteGold: true,
        instantBuild: true,
      },
      [
        new PlayerInfo("us", "p1", PlayerType.Human, "c1", "p1"),
        new PlayerInfo("cn", "p2", PlayerType.Human, "c2", "p2"),
      ],
    );

    while (game.inSpawnPhase()) {
      game.executeNextTick();
    }

    player1 = game.player("p1");
    player2 = game.player("p2");

    player1.setWarWith(player2);
    player2.setWarWith(player1);
  });

  function mkRunner(clientID: string): GameRunner {
    const exec = new Executor(game, "test_game", clientID);
    return new GameRunner(game, exec, () => {}, clientID);
  }

  function damageButDoNotDestroy(unit: Unit, amount: number): void {
    const max = unit.effectiveMaxHealth();
    const safeDamage = Math.min(amount, Math.max(1, unit.health() - 1));
    if (safeDamage > 0 && unit.health() >= max) {
      unit.modifyHealth(-safeDamage);
    } else if (safeDamage > 0) {
      unit.modifyHealth(-safeDamage);
    }
  }

  test("arrival update into damaged airfield is delivered to other clients", () => {
    const airfield = player1.buildUnit(UnitType.Airfield, game.ref(10, 10), {});
    const airfieldMaxHealth = airfield.effectiveMaxHealth();

    // Ensure the airfield is damaged (not full health) before the bomber returns.
    damageButDoNotDestroy(airfield, 10);
    expect(airfield.health()).toBeLessThan(airfieldMaxHealth);

    const enemyCity = player2.buildUnit(UnitType.City, game.ref(15, 15), {});

    player1.setBomberIntent({
      targetPlayerID: player2.id(),
      structures: [UnitType.City],
      preferClosest: true,
    });

    game.addExecution(new BomberExecution(player1, airfield));

    // Spawn bomber + let it launch.
    game.executeNextTick();
    executeTicks(game, 110);

    const bomber = player1.units(UnitType.Bomber)[0];
    expect(bomber).toBeDefined();
    expect(bomber.targetTile()).toBe(enemyCity.tile());

    // Wait until the bomber has actually left the airfield tile.
    for (let i = 0; i < 200; i++) {
      if (bomber.tile() !== airfield.tile()) {
        break;
      }
      game.executeNextTick();
    }
    expect(bomber.tile()).not.toBe(airfield.tile());

    const runner = mkRunner("c2");

    // Now tick until the bomber returns to the airfield; on the arrival tick,
    // verify the arrival movement update is NOT filtered out.
    let sawArrival = false;
    let sawIdleFiltered = false;

    for (let i = 0; i < 600; i++) {
      // Keep the airfield damaged so it remains in the "damaged airfield" scenario.
      if (airfield.health() >= airfieldMaxHealth) {
        damageButDoNotDestroy(airfield, 1);
      }

      const prevTile = bomber.tile();
      const updates = game.executeNextTick();
      const filtered = runner.filterUpdatesForClient(updates);

      const isArrivalTick =
        prevTile !== airfield.tile() && bomber.tile() === airfield.tile();

      if (isArrivalTick) {
        sawArrival = true;
        expect(airfield.health()).toBeLessThan(airfieldMaxHealth);

        const bomberUpdates = filtered[GameUpdateType.Unit].filter(
          (u) =>
            (u as any).unitType === UnitType.Bomber &&
            (u as any).id === bomber.id(),
        );
        // Find the specific landing update (bombers may emit multiple updates per tick).
        const landingUpdate = bomberUpdates.find(
          (u) => (u as any).pos === airfield.tile(),
        );
        expect(landingUpdate).toBeDefined();
        // The arrival update must be a movement update (pos != lastPos), otherwise it would be filtered.
        expect((landingUpdate as any).lastPos).not.toBe(airfield.tile());
      }

      // After it has arrived, ensure the next idle tick is filtered out for other clients.
      if (sawArrival && bomber.tile() === airfield.tile()) {
        const hasBomberUpdate = filtered[GameUpdateType.Unit].some(
          (u) => (u as any).unitType === UnitType.Bomber,
        );
        if (!hasBomberUpdate) {
          sawIdleFiltered = true;
          break;
        }
      }
    }

    expect(sawArrival).toBe(true);
    expect(sawIdleFiltered).toBe(true);
  });
});
