# FakeHuman Bot Archetypes: Technical Design

## Executive Summary

This document specifies a bot personality system for Terratomic's FakeHuman AI opponents. The system introduces **five distinct archetypes** (Rusher, Turtle, Nuker, Naval, Economist) that modify existing AI behavior parameters without introducing new computational complexity. All archetypes are designed to be **deterministic, performance-safe, and backward-compatible** with the current execution framework.

**Key Goals:**

- Increase gameplay variety through parameterized bot personalities
- Maintain sub-5ms per-tick AI execution budget
- Zero impact on determinism and replay functionality
- No new map-wide searches or unbounded loops

---

## Architecture Overview

### Current AI System

The FakeHuman bot implementation consists of:

| Component             | Location                                    | Responsibility                                          |
| --------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `FakeHumanExecution`  | `src/core/execution/FakeHumanExecution.ts`  | Main bot execution loop, territory expansion, diplomacy |
| `BotBehavior`         | `src/core/execution/utils/BotBehavior.ts`   | Enemy selection, attack coordination, ally assistance   |
| `UnitCreationHelper`  | `src/core/execution/UnitCreationHelper.ts`  | Unit production, build priorities                       |
| `NukeExecutionHelper` | `src/core/execution/NukeExecutionHelper.ts` | Nuclear weapon targeting and deployment                 |
| `AttackExecution`     | `src/core/execution/AttackExecution.ts`     | Troop movement and combat                               |

### Archetype System Design

Archetypes function as **parameter bundles** that configure existing AI subsystems:

```typescript
interface BotArchetype {
  // Combat parameters (BotBehavior)
  attackCadence: number;        // Ticks between attack evaluations
  triggerRatio: number;         // Troop threshold to initiate attacks
  reserveRatio: number;         // Troops held in reserve

  // Naval parameters (FakeHumanExecution)
  boatSpawnCadence: number;     /
 Ticks between boat spawns
  boatCapMultiplier:number;    // Max boats relative to territory
  boatMinSpacing: number;       // Minimum distance between boats

  // Nuclear parameters (NukeExecutionHelper)
  nukeCadence: number;          // Ticks between nuke evaluations
  nukeCandidateCap: number;     // Max targets evaluated per cycle
  nukeAggressiveness: number;   // Threshold for nuke deployment

  // Economic parameters (UnitCreationHelper)
  defenseInvestment: number;    // % gold for defensive structures
  offenseInvestment: number;    // % gold for troops/attack units
  structureInvestment: number;  // % gold for eco buildings

  // Diplomatic parameters (FakeHumanExecution)
  peacePreference: number;      // Likelihood of accepting alliances
  embargoTolerance: number;     // Hostility threshold for embargoes

  // Research parameters (NEW - Tech Tree Integration)
  researchInvestment: number;   // % of gold for research (0-1)
  techPriorities: readonly string[];  // Tech IDs in priority order (from RESEARCH_TECH_IDS)
}
```

> **Type Safety Note:** For maximum type safety, `techPriorities` can be typed as:
>
> ```typescript
> readonly techPriorities: readonly (typeof RESEARCH_TECH_IDS)[keyof typeof RESEARCH_TECH_IDS][];
> ```
>
> This provides autocomplete and compile-time validation of tech IDs.

---

## Archetype Specifications

### 1. Rusher - "Early Aggression"

**Philosophy:** Prioritize early military pressure with high attack frequency and low economic investment.

```typescript
const RUSHER_CONFIG: BotArchetype = {
  // Combat: Fast and aggressive
  attackCadence: 200, // Attack every ~3.3 seconds
  triggerRatio: 1.5, // Attack with minimal troop advantage
  reserveRatio: 0.1, // Use 90% of troops for attacks

  // Naval: Minimal investment
  boatSpawnCadence: 800, // Reduced boat production
  boatCapMultiplier: 0.5, // Half normal boat cap
  boatMinSpacing: 50, // Boats can be closer

  // Nuclear: Unavailable early
  nukeCadence: 1000, // Slow nuke evaluation
  nukeCandidateCap: 3, // Few targets considered
  nukeAggressiveness: 0.3, // Only obvious targets

  // Economic: Attack-focused
  defenseInvestment: 0.15, // 15% defense
  offenseInvestment: 0.6, // 60% offense
  structureInvestment: 0.25, // 25% economy

  // Diplomatic: Hostile
  peacePreference: 0.2, // Rarely accepts alliances
  embargoTolerance: 0.4, // Quick to embargo

  // Research: Low priority (focus on rush)
  researchInvestment: 0.1, // Minimal research investment
  techPriorities: [
    // Rush-focused tech order
    "Land-1", // WWII Lessons (combat boost)
    "Land-2", // Urban Planning (more troops)
    "Economy-1", // Post-War Reconstruction (basic  roads)
  ],
};
```

**Performance Impact:** Increased attack evaluations (every 200 ticks vs baseline 300) offset by reduced boat/nuke processing.

---

### 2. Turtle - "Defensive Fortress"

**Philosophy:** Build strong defenses, expand slowly, counterattack when overwhelmed.

```typescript
const TURTLE_CONFIG: BotArchetype = {
  // Combat: Defensive and patient
  attackCadence: 500, // Attack every ~8 seconds
  triggerRatio: 3.0, // Only attack with large advantage
  reserveRatio: 0.4, // Keep 40% troops in reserve

  // Naval: Standard coverage
  boatSpawnCadence: 400, // Normal boat production
  boatCapMultiplier: 1.0, // Standard boat cap
  boatMinSpacing: 80, // Well-spaced boats

  // Nuclear: Defensive deterrent
  nukeCadence: 400, // Moderate nuke evaluation
  nukeCandidateCap: 5, // Standard target pool
  nukeAggressiveness: 0.5, // Balanced targeting

  // Economic: Defense-heavy
  defenseInvestment: 0.5, // 50% defense (SAMs, bunkers)
  offenseInvestment: 0.2, // 20% offense
  structureInvestment: 0.3, // 30% economy

  // Diplomatic: Moderate
  peacePreference: 0.6, // Often accepts alliances
  embargoTolerance: 0.7, // Slow to embargo

  // Research: Defensive focus
  researchInvestment: 0.15, // Moderate research investment
  techPriorities: [
    // Defense-first tech order
    "Land-1", // WWII Lessons (defense boost)
    "Air-2", // City Anti-Air (city defense)
    "Sea-1", // Warship Anti-Air (naval defense)
    "Economy-1", // Post-War Reconstruction (roads)
    "Economy-3", // Structure Insurance (building protection)
  ],
};
```

**Performance Impact:** Reduced attack cadence saves AI budget; defensive structures don't add execution cost.

---

### 3. Nuker - "Nuclear Superiority"

**Philosophy:** Rush nuclear capabilities and use nukes liberally for territory control.

```typescript
const NUKER_CONFIG: BotArchetype = {
  // Combat: Moderate aggression
  attackCadence: 300, // Baseline attack rate
  triggerRatio: 2.0, // Moderate troop threshold
  reserveRatio: 0.25, // Balanced reserve

  // Naval: Below average
  boatSpawnCadence: 600, // Slow boat production
  boatCapMultiplier: 0.7, // Reduced boat cap
  boatMinSpacing: 60, // Standard spacing

  // Nuclear: Highly active
  nukeCadence: 250, // Frequent nuke evaluation
  nukeCandidateCap: 8, // Many targets considered
  nukeAggressiveness: 0.7, // Aggressive targeting

  // Economic: Nuke-focused
  defenseInvestment: 0.25, // 25% defense
  offenseInvestment: 0.35, // 35% offense
  structureInvestment: 0.4, // 40% economy (for nuclear tech)

  // Diplomatic: Opportunistic
  peacePreference: 0.4, // Sometimes accepts alliances
  embargoTolerance: 0.5, // Average hostility

  // Research: Nuclear tech rush
  researchInvestment: 0.2, // High research investment
  techPriorities: [
    // Nuclear-focused tech order
    "Sea-2", // Submarine Warfare (stealth nukes)
    "Sea-3", // Nuclear Submarines (sub-launched nukes)
    "Land-2", // Urban Planning (population for nukes)
    "Economy-4", // Automation (economic power)
  ],
};
```

**Performance Guard:** `nukeCandidateCap: 8` limits target evaluation. Combined with existing tile sampling cap (10 random tiles), worst-case is 10 tile searches × 8 candidates = 80 distance calculations per nuke cycle.

---

### 4. Naval Raider - "Maritime Dominance"

**Philosophy:** Control seas with boats, strike from water, dominate coastal territory.

```typescript
const NAVAL_CONFIG: BotArchetype = {
  // Combat: Opportunistic
  attackCadence: 350, // Slightly slower attacks
  triggerRatio: 2.2, // Wait for advantageous position
  reserveRatio: 0.2, // Low reserve, active offense

  // Naval: Maximum investment
  boatSpawnCadence: 200, // Rapid boat production
  boatCapMultiplier: 2.0, // Double boat cap
  boatMinSpacing: 40, // Boats can be dense

  // Nuclear: Below average
  nukeCadence: 600, // Slow nuke evaluation
  nukeCandidateCap: 4, // Few targets
  nukeAggressiveness: 0.4, // Conservative targeting

  // Economic: Naval-focused
  defenseInvestment: 0.2, // 20% defense
  offenseInvestment: 0.5, // 50% offense (boats, coastal units)
  structureInvestment: 0.3, // 30% economy

  // Diplomatic: Isolated
  peacePreference: 0.3, // Rarely allies
  embargoTolerance: 0.3, // Quick to embargo

  // Research: Naval dominance
  researchInvestment: 0.18, // High research investment
  techPriorities: [
    // Maritime superiority tech order
    "Sea-2", // Submarine Warfare (submarines)
    "Sea-1", // Warship Anti-Air (naval defense)
    "Air-1", // Fighter Anti-Ship (air-sea combo)
    "Sea-3", // Nuclear Submarines (nuke from sea)
    "Economy-1", // Post-War Reconstruction (trade routes)
  ],
};
```

**Performance Guard:** Boat spawning checks `isTooCloseToExistingBoat()` which samples 8 shore tiles. With doubled boat cap, max search is `2× baseline boats × 8 tiles = 16× checks`. This is bounded and acceptable given reduced attack/nuke cadences.

---

### 5. Economist - "Late Game Power"

**Philosophy:** Build strong economy, invest in advanced tech, become unstoppable late-game.

````typescript
const ECONOMIST_CONFIG: BotArchetype = {
  // Combat: Cautious
  attackCadence: 400,           // Slow to attack
  triggerRatio: 2.5,            // High troop requirement
  reserveRatio: 0.3,            // Moderate reserve

  // Naval: Standard
  boatSpawnCadence: 400,        // Normal boat production
  boatCapMultiplier: 1.0,       // Standard boat cap
  boatMinSpacing: 70,           // Normal spacing

  // Nuclear: Tech-enabled
  nukeCadence: 350,             // Moderate nuke evaluation
  nukeCandidateCap: 6,          // Good target pool
  nukeAggressiveness: 0.6,      // Calculated targeting

  // Economic: Maximum investment
---

## Implementation Strategy

### Phase 1: Foundation (No Behavior Change)

**Goal:** Add archetype infrastructure without modifying bot behavior.

**Changes:**
1. Create `src/core/execution/utils/BotArchetype.ts`:
   ```typescript
   export enum ArchetypeType {
     Rusher = "Rusher",
     Turtle = "Turtle",
     Nuker = "Nuker",
     Naval = "Naval",
     Economist = "Economist",
   }

   export interface BotArchetypeConfig { /* ... */ }

   export const ARCHETYPE_CONFIGS: Record<ArchetypeType, BotArchetypeConfig> = {
     /* ... */
   };

   export function selectArchetype(gameID: string, nationID: number): ArchetypeType {
     const seed = hashString(`${gameID}-${nationID}`);
     const rng = new PseudoRandom(seed);
     const types = Object.values(ArchetypeType);
     return types[rng.nextInt(0, types.length)];
   }
````

2. Update `FakeHumanExecution.constructor()`:

   ```typescript
   this.archetype = selectArchetype(gameID, nation.nationID);
   this.config = ARCHETYPE_CONFIGS[this.archetype];
   ```

3. Add logging (dev only):
   ```typescript
   if (process.env.NODE_ENV === "development") {
     console.log(`Nation ${nation.name}: ${this.archetype}`);
   }
   ```

**Validation:** Confirm determinism - same gameID + same nation → same archetype.

---

### Phase 2: Parameter Integration

**Goal:** Apply archetype configs to existing systems.

**Changes:**

1. **BotBehavior** - Combat parameters:

   ```typescript
   // In FakeHumanExecution.init()
   this.behavior = new BotBehavior(
     this.random,
     mg,
     this.player!,
     this.config.triggerRatio, // From archetype
     this.config.reserveRatio, // From archetype
   );
   ```

2. **Attack Cadence** - Modify `FakeHumanExecution.tick()`:

   ```typescript
   // Replace hardcoded tick checks with archetype config
   if (ticks % this.config.attackCadence === 0) {
     this.handleEnemies();
   }
   ```

3. **Boat Logic** - Update boat spawning:

   ```typescript
   // In handleTN()
   const boatCap = Math.floor(
     (this.player!.tiles * this.config.boatCapMultiplier) / 100,
   );
   const shouldSpawnBoat = ticks % this.config.boatSpawnCadence === 0;
   ```

4. **Nuke Logic** - Pass to `NukeExecutionHelper`:

   ```typescript
   NukeExecutionHelper.tick(
     this.mg,
     this.player!,
     this.random,
     ticks,
     this.config.nukeCadence,
     this.config.nukeCandidateCap,
     this.config.nukeAggressiveness,
   );
   ```

5. **Economic Ratios** - Apply in `UnitCreationHelper`:
   ```typescript
   UnitCreationHelper.distributeGold(
     this.player!,
     this.config.defenseInvestment,
     this.config.offenseInvestment,
     this.config.structureInvestment,
   );
   ```

**Validation:** Run test games with each archetype, verify different behaviors.

---

### Phase 3: Performance Verification

**Goal:** Ensure no performance regression.

**Metrics to Track:**

- Average tick duration (target: < 5ms)
- P95 tick duration (target: < 15ms)
- Per-bot execution time (target: < 1ms per bot)
- Memory usage (target: no increase)

**Test Scenarios:**

1. Baseline: 10 bots, World map, 1000 ticks → record metrics
2. Archetypes: 10 bots (2 of each type), World map, 1000 ticks → compare
3. Stress: 20 bots, Giant World Map, 2000 ticks → verify no degradation

**Performance Guards Already in Code:**

- Enemy selection: Max 10 border tiles sampled (`BotBehavior.selectEnemy()`)
- Boat spawning: Max 8 shore tiles checked (`randOceanShoreTile()`)
- Nuke targeting: Max 10 random land tiles (`NukeExecutionHelper`)

**New Caps to Enforce:**

- Nuke candidate cap: 3-8 depending on archetype (vs unbounded)
- Boat cap multiplier: 0.5-2.0× (prevents runaway boat spawns)

---

## Determinism Guarantees

### Seed Management

Archetype selection must be deterministic for replays:

```typescript
// Deterministic archetype selection
function selectArchetype(gameID: string, nationID: number): ArchetypeType {
  // Same gameID + nationID always produces same archetype
  const seed = hashString(`${gameID}-${nationID}`);
  const rng = new PseudoRandom(seed);
  return rng.choice(Object.values(ArchetypeType));
}
```

### Execution Order

No changes to execution order:

1. All bots tick in deterministic order (by nationID)
2. RNG calls remain in same sequence
3. Attack tick offsets preserved

### State Serialization

Archetype type stored in game state for save/load:

```typescript
interface NationSaveState {
  // Existing fields...
  archetype: ArchetypeType; // New field
}
```

---

## Testing & Validation

### Unit Tests

```typescript
describe("BotArchetype", () => {
  it("selects same archetype for same seed", () => {
    const a1 = selectArchetype("game-123", 5);
    const a2 = selectArchetype("game-123", 5);
    expect(a1).toBe(a2);
  });

  it("distributes archetypes evenlyacross nations", () => {
    const counts = countArchetypes("game-456", 50);
    expect(counts.Rusher).toBeGreaterThan(5);
    expect(counts.Turtle).toBeGreaterThan(5);
    // ... etc
  });
});
```

### Integration Tests

```typescript
describe("FakeHumanExecution with Archetypes", () => {
  it("Rusher attacks more frequently than Turtle", () => {
    const rusher = createBot("game-1", ArchetypeType.Rusher);
    const turtle = createBot("game-1", ArchetypeType.Turtle);

    runTicks(1000);

    expect(rusher.attackCount).toBeGreaterThan(turtle.attackCount);
  });

  it("Naval spawns more boats than Economist", () => {
    const naval = createBot("game-2", ArchetypeType.Naval);
    const economist = createBot("game-2", ArchetypeType.Economist);

    runTicks(2000);

    expect(naval.boatCount).toBeGreaterThan(economist.boatCount * 1.5);
  });
});
```

### Performance Tests

```typescript
describe("Performance Impact", () => {
  it("maintains sub-5ms average tick duration", () => {
    const game = createGame({ bots: 10, archetypes: true });
    const timings = [];

    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      game.tick();
      timings.push(performance.now() - start);
    }

    const avg = mean(timings);
    const p95 = percentile(timings, 95);

    expect(avg).toBeLessThan(5);
    expect(p95).toBeLessThan(15);
  });
});
```

---

## Migration & Rollout

### Backward Compatibility

Existing games without archetypes will default to "Balanced" config:

```typescript
const BALANCED_CONFIG: BotArchetypeConfig = {
  attack Cadence: 300,
  triggerRatio: 2.0,
  reserveRatio: 0.25,
  // ... baseline values from current implementation
};

// In FakeHumanExecution
this.archetype = savedArchetype ?? ArchetypeType.Balanced;
```

### Feature Flag

Control archetype system with config flag:

```typescript
// In DefaultConfig.ts
botArchetypesEnabled: boolean = true;

// In FakeHumanExecution
if (!config.botArchetypesEnabled) {
  this.config = BALANCED_CONFIG;
}
```

### Gradual Rollout

1. **Week 1:** Deploy with archetypes disabled, monitor baseline metrics
2. **Week 2:** Enable for 10% of games, compare metrics
3. **Week 3:** Enable for 50% of games, gather player feedback
4. **Week 4:** Full rollout if no regressions

---

## Future Enhancements

### Difficulty Integration

Scale archetype parameters by difficulty:

```typescript
function getArchetypeConfig(
  type: ArchetypeType,
  difficulty: Difficulty,
): BotArchetypeConfig {
  const base = ARCHETYPE_CONFIGS[type];

  switch (difficulty) {
    case Difficulty.Easy:
      return scaleConfig(base, 0.7); // 70% effectiveness
    case Difficulty.Hard:
      return scaleConfig(base, 1.3); // 130% effectiveness
    case Difficulty.Impossible:
      return scaleConfig(base, 1.5); // 150% effectiveness
    default:
      return base;
  }
}
```

### Map-Aware Selection

Bias archetypes based on map characteristics:

```typescript
function selectArchetype(
  gameID: string,
  nationID: number,
  map: GameMap,
): ArchetypeType {
  const seed = hashString(`${gameID}-${nationID}`);
  const rng = new PseudoRandom(seed);

  // Increase Naval archetype prob on water-heavy maps
  const waterRatio =
    map.tiles.filter((t) => t.type === TerrainType.Water).length /
    map.tiles.length;

  if (waterRatio > 0.6) {
    // 40% chance for Naval archetype
    return rng.next() < 0.4 ? ArchetypeType.Naval : rng.choice(OTHER_TYPES);
  }

  return rng.choice(ALL_TYPES);
}
```

### Player-Visible Indicators

Show archetype in UI for transparency:

```typescript
// In nation tooltip
<div class="archetype-badge archetype-${nation.archetype.toLowerCase()}">
  ${nation.archetype}
</div>
```

---

## Appendix A: Performance Budget Breakdown

Current AI budget (baseline, 10 bots):

| Operation        | Frequency        | Cost  | Total            |
| ---------------- | ---------------- | ----- | ---------------- |
| Enemy selection  | Every 300 ticks  | 0.5ms | 0.017ms/tick     |
| Attack execution | Every ~500 ticks | 0.2ms | 0.004ms/tick     |
| Boat spawning    | Every 400 ticks  | 0.3ms | 0.008ms/tick     |
| Nuke evaluation  | Every 400 ticks  | 0.4ms | 0.010ms/tick     |
| Unit creation    | Every tick       | 0.1ms | 0.100ms/tick     |
| Diplomacy        | Every 100 ticks  | 0.1ms | 0.010ms/tick     |
| **Total**        |                  |       | **0.149ms/tick** |

With archetypes (10 bots, mixed types):

| Operation       | Change                     | New Cost         | Difference   |
| --------------- | -------------------------- | ---------------- | ------------ |
| Enemy selection | Rusher: +50%, Turtle: -50% | ~0.017ms         | 0ms          |
| Boat spawning   | Naval: +100%, Others: ±0%  | ~0.012ms         | +0.004ms     |
| Nuke evaluation | Nuker: +60%, Naval: -50%   | ~0.012ms         | +0.002ms     |
| **Total**       |                            | **0.155ms/tick** | **+0.006ms** |

**Result:** +4% total AI time, well within acceptable range.

---

## Appendix B: Configuration Reference

Complete archetype configs:

```typescript
export const ARCHETYPE_CONFIGS: Record<ArchetypeType, BotArchetypeConfig> = {
  [ArchetypeType.Rusher]: {
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
  // ... (other archetypes as specified above)
};
```

---

## Document Metadata

- **Version:** 1.0
- **Author:** Technical Design
- **Last Updated:** 2025-01-22
- **Status:** Design Phase
- **Related Files:**
  - `src/core/execution/FakeHumanExecution.ts`
  - `src/core/execution/utils/BotBehavior.ts`
  - `src/core/execution/NukeExecutionHelper.ts`
  - `src/core/execution/UnitCreationHelper.ts`
