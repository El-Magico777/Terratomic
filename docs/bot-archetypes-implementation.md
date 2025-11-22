# Bot Archetypes Implementation Plan

## Overview

Implement five bot personality archetypes (Rusher, Turtle, Nuker, Naval, Economist) for FakeHuman AI opponents through parameterization of existing systems. This plan prioritizes **zero performance regression** and **100% determinism**.

---

## Prerequisites

✅ **Completed:**

- Current bot system analysis
- Performance baseline measurement
- Archetype design specification

🔲 **Required Before Start:**

1. Establish performance baseline:
   ```bash
   npm run test:performance -- --scenario=baseline-10-bots
   ```
2. Review `bot-archetypes-design.md` for technical specifications
3. Assign reviewer for code review stage gates

---

## Phase 1: Type Definitions & Infrastructure

**Goal:** Add archetype types and configuration without changing bot behavior.

**Timeline:** 2-3 hours

### Tasks

#### 1.1: Create Archetype Type System

**File:** `src/core/execution/utils/BotArchetype.ts` (NEW)

```typescript
/**
 * Bot personality archetypes for FakeHuman AI opponents.
 * Each archetype is a parameter bundle that configures existing AI systems.
 */
export enum ArchetypeType {
  Rusher = "Rusher",
  Turtle = "Turtle",
  Nuker = "Nuker",
  Naval = "Naval",
  Economist = "Economist",
}

/**
 * Configuration parameters for a bot archetype.
 * All parameters modify existing AI behavior without introducing new loops or searches.
 */
export interface BotArchetypeConfig {
  // Combat & Attack (used by BotBehavior)
  readonly attackCadence: number; // Ticks between attack evaluations
  readonly triggerRatio: number; // Troop ratio to initiate attack
  readonly reserveRatio: number; // Fraction of troops held in reserve

  // Naval Operations (used by FakeHumanExecution)
  readonly boatSpawnCadence: number; // Ticks between boat spawn attempts
  readonly boatCapMultiplier: number; // Multiplier for max boats (0.5-2.0)
  readonly boatMinSpacing: number; // Minimum tiles between boats

  // Nuclear Weapons (used by NukeExecutionHelper)
  readonly nukeCadence: number; // Ticks between nuke evaluations
  readonly nukeCandidateCap: number; // Max enemy targets to evaluate
  readonly nukeAggressiveness: number; // Threshold for nuke deployment (0-1)

  // Economic Investment (used by UnitCreationHelper)
  readonly defenseInvestment: number; // % gold for defensive structures
  readonly offenseInvestment: number; // % gold for troops/attack units
  readonly structureInvestment: number; // % gold for economic buildings

  // Diplomacy (used by FakeHumanExecution)
  readonly peacePreference: number; // Alliance acceptance probability (0-1)
  readonly embargoTolerance: number; // Hostility threshold for embargoes (0-1)
}

/**
 * Archetype configuration constants.
 * Values tuned for balanced gameplay and performance.
 */
export const ARCHETYPE_CONFIGS: Record<ArchetypeType, BotArchetypeConfig> = {
  [ArchetypeType.Rusher]: {
    // Early aggression, high attack frequency
    attackCadence: 200,
    triggerRatio: 1.5,
    reserveRatio: 0.1,
    boatSpawnCadence: 800,
    boatCapMultiplier: 0.5,
    boatMinSpacing: 50,
    nukeCadence: 1000,
    nukeCandidateCap: 3,
    nukeAggressiveness: 0.3,
    defenseInvestment: 0.15,
    offenseInvestment: 0.6,
    structureInvestment: 0.25,
    peacePreference: 0.2,
    embargoTolerance: 0.4,
  },
  [ArchetypeType.Turtle]: {
    // Defensive fortress, slow expansion
    attackCadence: 500,
    triggerRatio: 3.0,
    reserveRatio: 0.4,
    boatSpawnCadence: 400,
    boatCapMultiplier: 1.0,
    boatMinSpacing: 80,
    nukeCadence: 400,
    nukeCandidateCap: 5,
    nukeAggressiveness: 0.5,
    defenseInvestment: 0.5,
    offenseInvestment: 0.2,
    structureInvestment: 0.3,
    peacePreference: 0.6,
    embargoTolerance: 0.7,
  },
  [ArchetypeType.Nuker]: {
    // Nuclear superiority, moderate aggression
    attackCadence: 300,
    triggerRatio: 2.0,
    reserveRatio: 0.25,
    boatSpawnCadence: 600,
    boatCapMultiplier: 0.7,
    boatMinSpacing: 60,
    nukeCadence: 250,
    nukeCandidateCap: 8,
    nukeAggressiveness: 0.7,
    defenseInvestment: 0.25,
    offenseInvestment: 0.35,
    structureInvestment: 0.4,
    peacePreference: 0.4,
    embargoTolerance: 0.5,
  },
  [ArchetypeType.Naval]: {
    // Maritime dominance, boat-focused
    attackCadence: 350,
    triggerRatio: 2.2,
    reserveRatio: 0.2,
    boatSpawnCadence: 200,
    boatCapMultiplier: 2.0,
    boatMinSpacing: 40,
    nukeCadence: 600,
    nukeCandidateCap: 4,
    nukeAggressiveness: 0.4,
    defenseInvestment: 0.2,
    offenseInvestment: 0.5,
    structureInvestment: 0.3,
    peacePreference: 0.3,
    embargoTolerance: 0.3,
  },
  [ArchetypeType.Economist]: {
    // Late game power, economic focus
    attackCadence: 400,
    triggerRatio: 2.5,
    reserveRatio: 0.3,
    boatSpawnCadence: 400,
    boatCapMultiplier: 1.0,
    boatMinSpacing: 70,
    nukeCadence: 350,
    nukeCandidateCap: 6,
    nukeAggressiveness: 0.6,
    defenseInvestment: 0.3,
    offenseInvestment: 0.2,
    structureInvestment: 0.5,
    peacePreference: 0.7,
    embargoTolerance: 0.6,
  },
};

/**
 * Selects an archetype deterministically based on game and nation IDs.
 * Same inputs always produce the same archetype for replay consistency.
 *
 * @param gameID - Unique game identifier
 * @param nationID - Nation identifier
 * @returns Selected archetype type
 */
export function selectArchetype(
  gameID: string,
  nationID: number,
): ArchetypeType {
  // Create deterministic seed from game and nation IDs
  const seed = hashString(`${gameID}-archetype-${nationID}`);
  const rng = new PseudoRandom(seed);

  // Select from available archetypes
  const types = Object.values(ArchetypeType);
  const index = rng.nextInt(0, types.length);

  return types[index];
}

/**
 * Simple string hash function for seed generation.
 * Uses FNV-1a algorithm for good distribution.
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}
```

**Validation:**

- [ ] TypeScript compiles without errors
- [ ] All archetype configs sum investment ratios to ~100%
- [ ] `selectArchetype()` returns same result for same inputs
- [ ] Unit test: determinism check

---

#### 1.2: Add Archetype to FakeHumanExecution

**File:** `src/core/execution/FakeHumanExecution.ts`

**Changes:**

1. Import archetype types:

   ```typescript
   import {
     ArchetypeType,
     BotArchetypeConfig,
     selectArchetype,
     ARCHETYPE_CONFIGS,
   } from "./utils/BotArchetype";
   ```

2. Add fields to class:

   ```typescript
   private archetype: ArchetypeType;
   private config: BotArchetypeConfig;
   ```

3. Update constructor:

   ```typescript
   constructor(gameID: GameID, private nation: Nation) {
     this.archetype = selectArchetype(gameID, nation.nationID);
     this.config = ARCHETYPE_CONFIGS[this.archetype];
     this.random = new PseudoRandom(hashArchetypeSeed(gameID, nation.nationID));
     // ... existing code
   }
   ```

4. Add dev logging in `init()`:
   ```typescript
   init(mg: Game) {
     this.mg = mg;
     this.player = mg.getPlayerByNation(this.nation);

     if (this.player && process.env.NODE_ENV !== 'production') {
       console.log(`[Bot] ${this.player.nation.name}: ${this.archetype}`);
     }

     // ... existing code
   }
   ```

**Validation:**

- [ ] FakeHuman bots still function normally
- [ ] Dev console shows archetype assignments
- [ ] Different nations get different archetypes

---

#### 1.3: Add Unit Tests

**File:** `tests/core/execution/BotArchetype.test.ts` (NEW)

```typescript
import { describe, it, expect } from "@jest/globals";
import {
  ArchetypeType,
  selectArchetype,
  ARCHETYPE_CONFIGS,
} from "../../../src/core/execution/utils/BotArchetype";

describe("BotArchetype", () => {
  describe("selectArchetype", () => {
    it("returns same archetype for same gameID and nationID", () => {
      const gameID = "test-game-123";
      const nationID = 5;

      const archetype1 = selectArchetype(gameID, nationID);
      const archetype2 = selectArchetype(gameID, nationID);

      expect(archetype1).toBe(archetype2);
    });

    it("returns different archetypes for different nationIDs", () => {
      const gameID = "test-game-456";
      const archetypes = new Set<ArchetypeType>();

      // Sample 20 nations, should get variety
      for (let i = 0; i < 20; i++) {
        archetypes.add(selectArchetype(gameID, i));
      }

      // Should have at least 3 different archetypes out of 5
      expect(archetypes.size).toBeGreaterThanOrEqual(3);
    });

    it("distributes archetypes relatively evenly", () => {
      const gameID = "distribution-test";
      const counts: Record<ArchetypeType, number> = {
        [ArchetypeType.Rusher]: 0,
        [ArchetypeType.Turtle]: 0,
        [ArchetypeType.Nuker]: 0,
        [ArchetypeType.Naval]: 0,
        [ArchetypeType.Economist]: 0,
      };

      // Sample 100 nations
      for (let i = 0; i < 100; i++) {
        const archetype = selectArchetype(gameID, i);
        counts[archetype]++;
      }

      // Each archetype should appear at least 10 times (10%)
      Object.values(counts).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe("ARCHETYPE_CONFIGS", () => {
    it("has valid investment ratios for all archetypes", () => {
      Object.entries(ARCHETYPE_CONFIGS).forEach(([type, config]) => {
        const sum =
          config.defenseInvestment +
          config.offenseInvestment +
          config.structureInvestment;

        expect(sum).toBeCloseTo(1.0, 2);
      });
    });

    it("has performance-safe cadences", () => {
      Object.entries(ARCHETYPE_CONFIGS).forEach(([type, config]) => {
        // All cadences should be >= 200 ticks (no sub-3-second spamming)
        expect(config.attackCadence).toBeGreaterThanOrEqual(200);
        expect(config.boatSpawnCadence).toBeGreaterThanOrEqual(200);
        expect(config.nukeCadence).toBeGreaterThanOrEqual(200);

        // Nuke candidate cap should be reasonable
        expect(config.nukeCandidateCap).toBeLessThanOrEqual(10);

        // Boat cap multiplier should be sane
        expect(config.boatCapMultiplier).toBeGreaterThanOrEqual(0.3);
        expect(config.boatCapMultiplier).toBeLessThanOrEqual(3.0);
      });
    });

    it("all tech IDs in configs exist in RESEARCH_TECH_IDS", () => {
      const validTechIds = new Set(Object.values(RESEARCH_TECH_IDS));

      Object.entries(ARCHETYPE_CONFIGS).forEach(([archetype, config]) => {
        config.techPriorities.forEach((techId) => {
          expect(validTechIds.has(techId)).toBe(true);
        });
      });
    });

    it("research investment is within valid range", () => {
      Object.entries(ARCHETYPE_CONFIGS).forEach(([archetype, config]) => {
        expect(config.researchInvestment).toBeGreaterThanOrEqual(0);
        expect(config.researchInvestment).toBeLessThanOrEqual(1.0);
      });
    });
  });
});
```

**Run Tests:**

```bash
npm test -- BotArchetype.test.ts
```

**Validation:**

- [ ] All tests pass
- [ ] Determinism verified
- [ ] Distribution looks reasonable

---

## Phase 2: Parameter Integration

**Goal:** Wire archetype configs into existing AI systems.

**Timeline:** 4-6 hours

### Tasks

#### 2.1: Combat Parameters (BotBehavior)

**File:** `src/core/execution/FakeHumanExecution.ts`

**Change `init()` method:**

```typescript
init(mg: Game) {
  this.mg = mg;
  this.player = mg.getPlayerByNation(this.nation);

  if (!this.player) return;

  // Apply archetype config to BotBehavior
  this.behavior = new BotBehavior(
    this.random,
    mg,
    this.player,
    this.config.triggerRatio,    // Was: hardcoded 2.0
    this.config.reserveRatio     // Was: hardcoded 0.25
  );

  // ... existing code
}
```

**Validation:**

- [ ] Rusher attacks with lower troop threshold
- [ ] Turtle waits for larger troop advantage

---

#### 2.2: Attack Cadence

**File:** `src/core/execution/FakeHumanExecution.ts`

**Change `tick()` method:**

```typescript
tick(ticks: number) {
  // ... existing early-game handling ...

  // Replace: if (ticks % 300 === 0)
  // With archetype-specific cadence:
  if (ticks % this.config.attackCadence === 0) {
    this.handleEnemies();
  }

  // ...rest of tick logic
}
```

**Validation:**

- [ ] Rusher attacks more frequently (every 200 ticks)
- [ ] Turtle attacks less frequently (every 500 ticks)

---

#### 2.3: Boat Parameters

**File:** `src/core/execution/FakeHumanExecution.ts`

**Change `handleTN()` method:**

```typescript
handleTN(): boolean {
  if (!this.player) return false;

  // Apply archetype boat cap
  const baseBoatCap = Math.floor(this.player.tiles / 100);
  const boatCap = Math.floor(baseBoatCap * this.config.boatCapMultiplier);

  const currentBoats = this.mg.units.filter(
    u => u.type === UnitType.TransportShip && u.owner === this.player
  ).length;

  if (currentBoats >= boatCap) {
    return false;
  }

  // Apply archetype spawn cadence
  const ticks = this.mg.ticks;
  if ticks % this.config.boatSpawnCadence !== 0) {
    return false;
  }

  // ... existing boat spawn logic ...
  // Use this.config.boatMinSpacing in distance checks
}
```

**Validation:**

- [ ] Naval archetype spawns more boats
- [ ] Rusher spawns fewer boats
- [ ] Boats respect spacing rules

---

#### 2.4: Nuke Parameters

**File:** `src/core/execution/NukeExecutionHelper.ts`

**Update `tick()` method signature:**

```typescript
export class NukeExecutionHelper {
  static tick(
    mg: Game,
    player: Player,
    random: PseudoRandom,
    ticks: number,
    nukeCadence: number, // NEW: from archetype
    nukeCandidateCap: number, // NEW: from archetype
    nukeAggressiveness: number, // NEW: from archetype
  ) {
    // Apply cadence
    if (ticks % nukeCadence !== 0) {
      return;
    }

    // ... existing checks ...

    // Limit candidate evaluation
    const enemies = mg.players
      .filter(/* ... existing filter logic ... */)
      .slice(0, nukeCandidateCap); // CAP CANDIDATES

    // Apply aggressiveness to targeting threshold
    const threshold = baseThreshold * nukeAggressiveness;

    // ... existing targeting logic ...
  }
}
```

**File:** `src/core/execution/FakeHumanExecution.ts`

**Call with archetype params:**

```typescript
tick(ticks: number) {
  // ... existing code ...

  NukeExecutionHelper.tick(
    this.mg,
    this.player!,
    this.random,
    ticks,
    this.config.nukeCadence,
    this.config.nukeCandidateCap,
    this.config.nukeAggressiveness
  );
}
```

**Validation:**

- [ ] Nuker evaluates nukes more frequently
- [ ] Nuker considers more targets
- [ ] Other archetypes are less aggressive

---

#### 2.5: Economic Investment

**File:** `src/core/execution/UnitCreationHelper.ts`

**Update `produceUnits()` signature:**

```typescript
static produceUnits(
  mg: Game,
  player: Player,
  random: PseudoRandom,
  defenseInvestment: number,     // NEW
  offenseInvestment: number,     // NEW
  structureInvestment: number    // NEW
) {
  const goldBudget = player.gold;

  // Allocate budget by archetype ratios
  const defenseBudget = goldBudget * defenseInvestment;
  const offenseBudget = goldBudget * offenseInvestment;
  const structureBudget = goldBudget * structureInvestment;

  // ... existing production logic using budgets ...
}
```

**File:** `src/core/execution/FakeHumanExecution.ts`

**Call with archetype params:**

```typescript
tick(ticks: number) {
  // ... existing code ...

  UnitCreationHelper.produceUnits(
    this.mg,
    this.player!,
    this.random,
    this.config.defenseInvestment,
    this.config.offenseInvestment,
    this.config.structureInvestment
  );
}
```

**Validation:**

- [ ] Turtle builds more defenses
- [ ] Economist builds more economic structures
- [ ] Rusher focuses on offense

---

#### 2.6: Research Priorities (Tech Tree Integration)

**File:** `src/core/execution/utils/BotArchetype.ts`

**Add to `BotArchetypeConfig` interface:**

```typescript
export interface BotArchetypeConfig {
  // ... existing fields ...

  // Research (Tech Tree)
  readonly researchInvestment: number; // % of gold for research (0-1)
  readonly techPriorities: readonly string[]; // Tech IDs in priority order
}
```

> **IMPORTANT:** Tech priorities MUST be ordered such that prerequisite techs come before dependent techs.
> For example, `Nuclear Submarines (Sea-3)` requires `Submarine Warfare (Sea-2)`, so Sea-2 must appear first in the array.

**Add tech priorities to ARCHETYPE_CONFIGS:**

**First, add import at top of file:**

```typescript
import { RESEARCH_TECH_IDS } from "../../tech/TechEffects";
```

**Then update ARCHETYPE_CONFIGS:**

```typescript
export const ARCHETYPE_CONFIGS: Record<ArchetypeType, BotArchetypeConfig> = {
  [ArchetypeType.Rusher]: {
    // ... existing config ...
    researchInvestment: 0.1,
    techPriorities: [
      RESEARCH_TECH_IDS.WWII_LESSONS, // Combat boost
      RESEARCH_TECH_IDS.URBAN_PLANNING, // More troops
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Basic economy
    ],
  },
  [ArchetypeType.Turtle]: {
    // ... existing config ...
    researchInvestment: 0.15,
    techPriorities: [
      RESEARCH_TECH_IDS.WWII_LESSONS, // Defense boost
      RESEARCH_TECH_IDS.CITY_ANTI_AIR, // City defense
      RESEARCH_TECH_IDS.WARSHIP_ANTI_AIR, // Naval defense
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Roads
      RESEARCH_TECH_IDS.STRUCTURE_INSURANCE, // Building protection
    ],
  },
  [ArchetypeType.Nuker]: {
    // ... existing config ...
    researchInvestment: 0.2,
    techPriorities: [
      RESEARCH_TECH_IDS.SUBMARINE_WARFARE, // Stealth nukes
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Sub-launched nukes
      RESEARCH_TECH_IDS.URBAN_PLANNING, // Population for nukes
      RESEARCH_TECH_IDS.AUTOMATION, // Economic power
    ],
  },
  [ArchetypeType.Naval]: {
    // ... existing config ...
    researchInvestment: 0.18,
    techPriorities: [
      RESEARCH_TECH_IDS.SUBMARINE_WARFARE, // Submarines
      RESEARCH_TECH_IDS.WARSHIP_ANTI_AIR, // Naval defense
      RESEARCH_TECH_IDS.FIGHTER_JET_NAVAL_TARGETING, // Air-sea combo
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Nuke from sea
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Trade routes
    ],
  },
  [ArchetypeType.Economist]: {
    // ... existing config ...
    researchInvestment: 0.25,
    techPriorities: [
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Roads unlock
      RESEARCH_TECH_IDS.INTERNATIONAL_TRADE, // Allied roads
      RESEARCH_TECH_IDS.URBAN_PLANNING, // Population
      RESEARCH_TECH_IDS.AUTOMATION, // 2× trade income
      RESEARCH_TECH_IDS.STRUCTURE_INSURANCE, // Protect investments
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Late game power
    ],
  },
};
```

**File:** `src/core/execution/FakeHumanExecution.ts`

**First, add import at top of file:**

```typescript
import { ResearchTreeSelectExecution } from "./ResearchTreeSelectExecution";
```

**Add research handler method:**

```typescript
private handleResearch() {
  if (!this.player) return;

  // Set research investment based on archetype
  const targetInvestment = this.config.researchInvestment;
  const currentInvestment = this.player.researchInvestmentRate(); // ✅ FIXED: was researchInvestment()

  if (Math.abs(currentInvestment - targetInvestment) > 0.05) {
    this.mg.addExecution(
      new SetResearchInvestmentExecution(this.player, targetInvestment)
    );
  }

  // Select next priority tech to research
  if (!this.player.hasResearchedTech) return; // No tech system

  const completedTechs = new Set(this.player.researchedTechs?.() ?? []);

  for (const techId of this.config.techPriorities) {
    // Skip if already researched
    if (completedTechs.has(techId)) continue;

    // NOTE: We trust that techPriorities are ordered correctly with prerequisites first.
    // Future enhancement: Add isTechAvailable() helper to check prerequisites dynamically.

    // Trigger research
    this.mg.addExecution(
      new ResearchTreeSelectExecution(this.player, techId)
    );
    return; // Only research one tech at a time
  }

  // If we reach here, all priority techs are researched.
  // Research investment continues, points accumulate for non-priority techs.
}
}
```

**Update `tick()` method:**

```typescript
tick(ticks: number) {
  // ... existing code ...

  // Check research priorities every 500 ticks (offset by diplomacyTick for distribution)
  if (ticks % 500 === (this.diplomacyTick % 500)) {
    this.handleResearch();
  }

  // ... rest of tick logic ...
}
```

> **Note:** Using `diplomacyTick % 500` ensures the check happens at a consistent offset even if diplomacyTick is large.

**Validation:**

- [ ] Bots set research investment based on archetype
- [ ] Economist invests most in research (25%)
- [ ] Rusher invests least (10%)
- [ ] Naval archetype researches submarine techs first
- [ ] Nuker prioritizes nuclear submarine research

---

## Phase 3: Performance Validation

**Goal:** Verify no performance regression from baseline.

**Timeline:** 2-3 hours

### Tasks

#### 3.1: Run Performance Benchmarks

```bash
# Baseline (no archetypes - requires feature flag off)
npm run test:performance -- --scenario=baseline --iterations=5

# With archetypes
npm run test:performance -- --scenario=archetypes --iterations=5

# Stress test
npm run test:performance -- --scenario=stress --bots=20 --ticks=3000
```

**Success Criteria:**

- Average tick duration: < 5ms (no worse than baseline)
- P95 tick duration: < 15ms
- Memory usage: No increase > 5%

#### 3.2: Profile Critical Paths

```bash
npm run profile -- --scenario=archetypes --focus=ai-execution
```

**Check:**

- [ ] No new hotspots introduced
- [ ] Enemy selection still O(n) where n = nearby players
- [ ] Boat spawning still bounded by caps
- [ ] Nuke evaluation respects candidate cap

#### 3.3: Integration Test Suite

**File:** `tests/integration/BotArchetype.integration.test.ts` (NEW)

```typescript
describe("BotArchetype Integration", () => {
  it("maintains determinism across full game", () => {
    const seed = "determinism-test-123";

    const game1 = runFullGame(seed, 1000);
    const game2 = runFullGame(seed, 1000);

    // Compare final game states
    expect(game1.hash(1000)).toBe(game2.hash(1000));
  });

  it("produces different outcomes for different archetypes", () => {
    const rusherGame = runGameWithArchetypes([ArchetypeType.Rusher]);
    const turtleGame = runGameWithArchetypes([ArchetypeType.Turtle]);

    // Rusher should have more attacks
    expect(rusherGame.totalAttacks).toBeGreaterThan(
      turtleGame.totalAttacks * 1.5,
    );
  });

  it("Naval archetype spawns significantly more boats", () => {
    const { boats: navalBoats } = runGame(ArchetypeType.Naval, 2000);
    const { boats: economistBoats } = runGame(ArchetypeType.Economist, 2000);

    expect(navalBoats).toBeGreaterThan(economistBoats * 1.5);
  });

  it("bots set research investment matching archetype", () => {
    const rusher = createBotWithArchetype(ArchetypeType.Rusher);
    const economist = createBotWithArchetype(ArchetypeType.Economist);

    runTicks(1000);

    expect(rusher.player.researchInvestmentRate()).toBeCloseTo(0.1, 2);
    expect(economist.player.researchInvestmentRate()).toBeCloseTo(0.25, 2);
  });

  it("nuker prioritizes submarine warfare tech", () => {
    const nuker = createBotWithArchetype(ArchetypeType.Nuker);
    runUntilFirstTechResearched(nuker, 20000);

    // First researched tech should be from priority list
    const researched = nuker.player.researchedTechs();
    expect(researched.length).toBeGreaterThan(0);
    expect([
      RESEARCH_TECH_IDS.SUBMARINE_WARFARE,
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES,
      RESEARCH_TECH_IDS.URBAN_PLANNING,
    ]).toContain(researched[0]);
  });
});
```

---

## Phase 4: Polish & Documentation

**Timeline:** 2-3 hours

### Tasks

#### 4.1: Add UI Indicators (Optional)

Show archetype in nation tooltip:

**File:** `src/client/components/NationTooltip.ts`

```typescript
renderArchetype(nation: Nation) {
  const archetype = nation.bot?.archetype;
  if (!archetype) return '';

  return html`
    <div class="archetype-indicator">
      <span class="archetype-icon">${getArchetypeIcon(archetype)}</span>
      <span class="archetype-name">${archetype}</span>
    </div>
  `;
}
```

#### 4.2: Update Configuration Docs

**File:** `docs/bot-configuration.md` (NEW or UPDATE)

Document:

- Available archetypes and their playstyles
- How archetype selection works (deterministic)
- Performance guarantees
- How to disable archetypes (feature flag)

#### 4.3: Code Review Checklist

Before marking complete, verify:

- [ ] All TypeScript types are explicit (no `any`)
- [ ] All magic numbers are in archetype configs
- [ ] No unbounded loops added
- [ ] Determinism preserved (tests pass)
- [ ] Performance metrics within baseline
- [ ] Code follows project style guide
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Documentation complete

---

## Rollout Plan

### Week 1: Internal Testing

- Deploy to dev environment with feature flag OFF
- Establish baseline metrics
- Enable for single test game

### Week 2: Gradual Activation

- Enable for 10% of games
- Monitor performance dashboards
- Collect gameplay feedback

### Week 3: Validation

- Enable for 50% of games
- Compare metrics vs. baseline
- Fix any issues discovered

### Week 4: Full Deployment

- Enable for 100% of games
- Announce feature to players
- Monitor for edge cases

---

## Rollback Plan

If performance regression or bugs discovered:

1. **Immediate:** Set feature flag `botArchetypesEnabled = false`
2. **Short-term:** All bots revert to balanced config
3. **Investigation:** Profile and identify issue
4. **Fix:** Apply fixes in development
5. **Re-test:** Repeat validation phase
6. **Re-deploy:** Gradual rollout again

---

## Success Metrics

### Technical Metrics

- ✅ Zero performance regression (< 5ms avg tick)
- ✅ 100% determinism (replays match perfectly)
- ✅ Zero new bugs in AI execution
- ✅ All tests passing

### Gameplay Metrics

- ✅ Increased game variety (player feedback)
- ✅ Balanced win rates across archetypes
- ✅ No single archetype dominates
- ✅ Player retention unchanged or improved

---

## Future Enhancements

After successful deployment:

1. **Tech-Aware Behavior:** Modify decision logic based on researched techs (e.g., prefer submarines if Submarine Warfare researched)
2. **Map-Aware Selection:** Bias Naval on water-heavy maps
3. **Difficulty Scaling:** Scale archetype parameters by difficulty
4. **Player Configuration:** Allow players to force specific archetypes
5. **Telemetry:** Track archetype win rates and balance
6. **New Archetypes:** Add Diplomatic, Defensive, Expansion archetypes

---

## Owner & Reviewers

**Implementation Owner:** [Assignee]
**Code Reviewers:** [Senior Dev 1], [Senior Dev 2]
**Performance Review:** [Performance Engineer]
**QA Testing:** [QA Lead]

**Estimated Total Time:** 15-20 hours
