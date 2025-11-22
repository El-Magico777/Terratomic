import {
  ARCHETYPE_CONFIGS,
  ArchetypeType,
  selectArchetype,
} from "../src/core/execution/utils/BotArchetype";

describe("BotArchetype", () => {
  describe("selectArchetype", () => {
    test("should return deterministic archetype for same gameID and nationID", () => {
      const gameID = "test-game-123";
      const nationID = "player-1";

      const archetype1 = selectArchetype(gameID, nationID);
      const archetype2 = selectArchetype(gameID, nationID);

      expect(archetype1).toBe(archetype2);
    });

    test("should return different archetypes for different nationIDs", () => {
      const gameID = "test-game-123";
      const archetypes = new Set<ArchetypeType>();

      // Test with multiple nation IDs
      for (let i = 0; i < 20; i++) {
        const archetype = selectArchetype(gameID, `player-${i}`);
        archetypes.add(archetype);
      }

      // Should have at least 2 different archetypes in 20 attempts
      expect(archetypes.size).toBeGreaterThanOrEqual(2);
    });

    test("should return valid archetype type", () => {
      const gameID = "test-game-123";
      const nationID = "player-1";

      const archetype = selectArchetype(gameID, nationID);
      const validArchetypes = Object.values(ArchetypeType);

      expect(validArchetypes).toContain(archetype);
    });

    test("should distribute archetypes across all types", () => {
      const gameID = "test-game-123";
      const archetypeCounts = new Map<ArchetypeType, number>();

      // Initialize counts
      Object.values(ArchetypeType).forEach((type) => {
        archetypeCounts.set(type, 0);
      });

      // Test with 100 nation IDs
      for (let i = 0; i < 100; i++) {
        const archetype = selectArchetype(gameID, `player-${i}`);
        archetypeCounts.set(
          archetype,
          (archetypeCounts.get(archetype) || 0) + 1,
        );
      }

      // All archetype types should be used at least once
      Object.values(ArchetypeType).forEach((type) => {
        expect(archetypeCounts.get(type)).toBeGreaterThan(0);
      });
    });
  });

  describe("ARCHETYPE_CONFIGS", () => {
    test("all archetypes should have valid configurations", () => {
      Object.entries(ARCHETYPE_CONFIGS).forEach(([archetype, config]) => {
        // Combat parameters
        expect(config.attackCadence).toBeGreaterThan(0);
        expect(config.triggerRatio).toBeGreaterThanOrEqual(0);
        expect(config.triggerRatio).toBeLessThanOrEqual(1);
        expect(config.reserveRatio).toBeGreaterThanOrEqual(0);
        expect(config.reserveRatio).toBeLessThanOrEqual(1);

        // Naval parameters
        expect(config.boatSpawnCadence).toBeGreaterThan(0);
        expect(config.boatCapMultiplier).toBeGreaterThan(0);

        // Nuclear parameters
        expect(config.nukeCadence).toBeGreaterThan(0);
        expect(config.nukeCandidateCap).toBeGreaterThan(0);
        expect(config.nukeAggressiveness).toBeGreaterThanOrEqual(0);
        expect(config.nukeAggressiveness).toBeLessThanOrEqual(1);

        // Economic parameters
        expect(config.defenseInvestment).toBeGreaterThanOrEqual(0);
        expect(config.defenseInvestment).toBeLessThanOrEqual(1);
        expect(config.offenseInvestment).toBeGreaterThanOrEqual(0);
        expect(config.offenseInvestment).toBeLessThanOrEqual(1);
        expect(config.structureInvestment).toBeGreaterThanOrEqual(0);
        expect(config.structureInvestment).toBeLessThanOrEqual(1);

        // Research parameters
        expect(config.researchInvestment).toBeGreaterThanOrEqual(0);
        expect(config.researchInvestment).toBeLessThanOrEqual(1);
        expect(config.techPriorities).toBeDefined();
        expect(Array.isArray(config.techPriorities)).toBe(true);
      });
    });

    test("Rusher archetype should be aggressive", () => {
      const rusher = ARCHETYPE_CONFIGS[ArchetypeType.Rusher];

      expect(rusher.attackCadence).toBeLessThan(300); // Attacks frequently
      expect(rusher.triggerRatio).toBeLessThan(0.5); // Low trigger threshold
      expect(rusher.reserveRatio).toBeLessThan(0.2); // Minimal reserves
      expect(rusher.offenseInvestment).toBeGreaterThan(0.5); // Heavy offense
    });

    test("Turtle archetype should be defensive", () => {
      const turtle = ARCHETYPE_CONFIGS[ArchetypeType.Turtle];

      expect(turtle.attackCadence).toBeGreaterThan(400); // Attacks rarely
      expect(turtle.triggerRatio).toBeGreaterThan(0.7); // High trigger threshold
      expect(turtle.reserveRatio).toBeGreaterThan(0.3); // High reserves
      expect(turtle.defenseInvestment).toBeGreaterThan(0.4); // Heavy defense
    });

    test("Nuker archetype should prioritize nuclear weapons", () => {
      const nuker = ARCHETYPE_CONFIGS[ArchetypeType.Nuker];

      expect(nuker.nukeCadence).toBeLessThan(300); // Checks nukes frequently
      expect(nuker.nukeCandidateCap).toBeGreaterThanOrEqual(8); // Evaluates many targets
      expect(nuker.nukeAggressiveness).toBeLessThan(0.5); // Aggressive nuking
    });

    test("Naval archetype should prioritize boats", () => {
      const naval = ARCHETYPE_CONFIGS[ArchetypeType.Naval];

      expect(naval.boatSpawnCadence).toBeLessThan(300); // Spawns boats frequently
      expect(naval.boatCapMultiplier).toBeGreaterThan(1.5); // High boat capacity
    });

    test("Economist archetype should prioritize research and economy", () => {
      const economist = ARCHETYPE_CONFIGS[ArchetypeType.Economist];

      expect(economist.researchInvestment).toBeGreaterThanOrEqual(0.2); // High research
      expect(economist.structureInvestment).toBeGreaterThan(0.3); // Heavy structures
      expect(economist.attackCadence).toBeGreaterThan(400); // Attacks rarely
    });

    test("all archetypes should have different attack cadences", () => {
      const cadences = new Set<number>();

      Object.values(ARCHETYPE_CONFIGS).forEach((config) => {
        cadences.add(config.attackCadence);
      });

      // All 5 archetypes should have unique attack cadences
      expect(cadences.size).toBe(5);
    });

    test("spawn rate should not be affected by archetype configs", () => {
      // This test verifies the fix for the spawn bug
      // All archetype attack cadences should be >= 200 (not the original 40)
      Object.values(ARCHETYPE_CONFIGS).forEach((config) => {
        expect(config.attackCadence).toBeGreaterThanOrEqual(200);
      });

      // This ensures the spawn rate (40) is separate from attack cadence
      // The actual spawn rate is hardcoded in FakeHumanExecution as 40
    });
  });
});
