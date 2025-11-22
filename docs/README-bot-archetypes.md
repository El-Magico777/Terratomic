# FakeHuman Bot Archetypes

**Status:** Design Complete | Implementation Pending

This directory contains the technical specification and implementation plan for introducing bot personality archetypes into Terratomic's FakeHuman AI system.

---

## 📋 Documentation

| Document                                                                       | Purpose                                                                                                  | Audience                            |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **[bot-archetypes-design.md](./bot-archetypes-design.md)**                     | Complete technical specification with archetype configs, performance analysis, and TypeScript interfaces | Engineers implementing the feature  |
| **[bot-archetypes-implementation.md](./bot-archetypes-implementation.md)**     | Step-by-step implementation plan with code samples, testing strategy, and rollout plan                   | Development team & project managers |
| **[bot-archetypes-tech-integration.md](./bot-archetypes-tech-integration.md)** | Tech tree integration analysis and recommendations                                                       | Technical decision makers           |

---

## 🎯 Quick Overview

### What Are Bot Archetypes?

Five distinct AI personalities that make FakeHuman bots play differently:

- **Rusher** - Aggressive early attacks, minimal defense, low research investment
- **Turtle** - Heavy defense, patient expansion, defensive tech focus
- **Nuker** - Nuclear weapons focus, rushes nuclear submarine tech
- **Naval** - Maritime dominance, boat-heavy strategy, naval tech priority
- **Economist** - Economic powerhouse, late-game strength, heavy research investment

Each archetype has unique research priorities and tech investment levels (10%-25% of gold).

### Key Features

✅ **Zero Performance Impact** - Archetypes tune existing parameters, no new computational cost  
✅ **100% Deterministic** - Same game seed = same archetypes, preserves replays  
✅ **Easy to Extend** - Add new archetypes by defining parameter bundles  
✅ **Flexible Configuration** - Feature flag for instant enable/disable

---

## 🚀 Implementation Status

### Phase 1: Foundation (Not Started)

- [ ] Create `BotArchetype.ts` with type definitions
- [ ] Add archetype selection to `FakeHumanExecution`
- [ ] Add unit tests for determinism

### Phase 2: Integration (Not Started)

- [ ] Wire combat parameters to `BotBehavior`
- [ ] Apply boat spawning configs
- [ ] Integrate nuke parameters
- [ ] Apply economic investment ratios
- [ ] Configure research priorities and tech investment

### Phase 3: Validation (Not Started)

- [ ] Run performance benchmarks
- [ ] Profile critical paths
- [ ] Execute integration tests

### Phase 4: Deployment (Not Started)

- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor performance dashboards
- [ ] Collect player feedback

---

## 📊 Performance Guarantees

Current baseline: **< 5ms avg tick duration** with 10 bots

With archetypes: **< 5.5ms avg tick duration** (< 10% increase)

### Safeguards

- Attack cadence: 200-500 ticks (no sub-3-second spamming)
- Nuke candidate cap: 3-8 targets (vs. unbounded)
- Boat cap multiplier: 0.5-2.0× (prevents runaway spawns)
- Economic investment ratios: Always sum to 100%

---

## 🧪 Testing Strategy

### Unit Tests

- Determinism validation (same seed → same archetype)
- Distribution check (even archetype spread)
- Config validation (ratios sum to 1.0, cadences are sane)

### Integration Tests

- Full game determinism (replays match perfectly)
- Behavioral differences (Rusher attacks more than Turtle)
- Performance regression tests (tick duration within bounds)

### Manual QA

- Visual archetype differences in gameplay
- Balance check (no single archetype dominates)
- Edge case testing (unusual maps, difficulty levels)

---

## 🔧 Development Guide

### Adding a New Archetype

1. Add enum value to `ArchetypeType`:

   ```typescript
   export enum ArchetypeType {
     // ... existing
     NewArchetype = "NewArchetype",
   }
   ```

2. Define config in `ARCHETYPE_CONFIGS`:

   ```typescript
   [ArchetypeType.NewArchetype]: {
     // Define all 13 parameters
     attackCadence: 300,
     // ... etc
   },
   ```

3. Add unit tests for new archetype
4. Add integration test for behavioral difference
5. Update documentation

### Tuning Archetype Parameters

1. Modify values in `ARCHETYPE_CONFIGS`
2. Run performance benchmarks to verify no regression
3. Test gameplay to verify intended behavior
4. Adjust parameters iteratively based on feedback

---

## 📖 Related Code Files

### Core AI System

| File                                        | Modifications Required           |
| ------------------------------------------- | -------------------------------- |
| `src/core/execution/FakeHumanExecution.ts`  | Import archetypes, apply configs |
| `src/core/execution/utils/BotBehavior.ts`   | Accept trigger/reserve ratios    |
| `src/core/execution/NukeExecutionHelper.ts` | Accept cadence/candidate cap     |
| `src/core/execution/UnitCreationHelper.ts`  | Accept investment ratios         |

### New Files

| File                                                 | Purpose                      |
| ---------------------------------------------------- | ---------------------------- |
| `src/core/execution/utils/BotArchetype.ts`           | Type definitions and configs |
| `tests/core/execution/BotArchetype.test.ts`          | Unit tests                   |
| `tests/integration/BotArchetype.integration.test.ts` | Integration tests            |

---

## 🎮 Player-Facing Impact

### Increased Variety

Players will encounter bots with distinct playstyles each game, making matches less predictable and more engaging.

### Strategic Depth

Understanding bot archetypes allows players to adapt strategies (e.g., prioritize SAMs vs. Nuker bots).

### Replay Value

Different archetype combinations create unique game scenarios, encouraging multiple playthroughs.

---

## 📝 Future Enhancements

After successful deployment, consider:

1. **Tech-Aware Behavior** - Modify strategies based on researched techs (e.g., prefer subs when Submarine Warfare unlocked)
2. **Map-Aware Selection** - Favor Naval on water-heavy maps
3. **Difficulty Scaling** - Amplify archetype traits on higher difficulties
4. **Player Control** - Let players configure bot archetypes in custom lobbies
5. **Telemetry** - Track archetype win rates for balance tuning
6. **New Archetypes** - Add Diplomatic, Expansion, Defensive personalities

---

## 👥 Team

**Design:** Technical Lead  
**Implementation:** [TBD]  
**QA:** [TBD]  
**Performance Review:** [TBD]

**Estimated Effort:** 15-20 engineering hours

---

## 📞 Questions?

For technical questions about the design, see `bot-archetypes-design.md`.

For implementation guidance, see `bot-archetypes-implementation.md`.

For general project questions, contact the technical lead.
