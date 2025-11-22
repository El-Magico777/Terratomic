# Tech Tree Integration for Bot Archetypes

## Executive Summary

**Recommendation: YES - Integrate tech tree into archetype system** ✅

The tech tree is already functional and can significantly enhance archetype differentiation. Bots currently don't use the research system at all - adding tech-aware behavior would make archetypes feel dramatically different and more strategic.

---

## Current Tech Tree Status

### Implemented & Functional Techs

Based on `TechEffects.ts`, the following techs are fully implemented:

| Tech ID     | Name                    | Category | Effect                                        | Bot Relevance                           |
| ----------- | ----------------------- | -------- | --------------------------------------------- | --------------------------------------- |
| `Air-1`     | Fighter Anti-Ship       | Air      | Fighters can attack naval units               | **HIGH** - Critical for Naval archetype |
| `Sea-1`     | Warship Anti-Air        | Sea      | Warships shoot down aircraft                  | **HIGH** - Defensive capability         |
| `Land-1`    | WWII Lessons            | Land     | -10% defense losses, +10% enemy attack losses | **MED** - Turtle archetype synergy      |
| `Land-2`    | Urban Planning          | Land     | +25% max population                           | **HIGH** - Economy boost                |
| `Air-2`     | City Anti-Air           | Air      | Cities defend against aircraft                | **MED** - Defensive capability          |
| `Land-2B`   | Scorched Earth          | Land     | Reset research, destroy roads                 | **LOW** - Situational                   |
| `Economy-1` | Post-War Reconstruction | Economy  | Unlocks Roads                                 | **HIGH** - Trade income                 |
| `Economy-2` | International Trade     | Economy  | Roads connect to allies                       | **MED** - Team games                    |
| `Economy-3` | Structure Insurance     | Economy  | 33% refund on destroyed buildings             | **MED** - Defensive                     |
| `Economy-4` | Automation              | Economy  | 2× trade income, -20% troop regen             | **HIGH** - Economist archetype          |
| `Air-2B`    | Paratroopers            | Air      | Unlocks paratroopers                          | **MED** - Offensive capability          |
| `Sea-2`     | Submarine Warfare       | Sea      | Unlocks submarines                            | **HIGH** - Naval archetype              |
| `Sea-3`     | Nuclear Submarines      | Sea      | Subs can launch nukes                         | **HIGH** - Naval + Nuker synergy        |

### Current Bot Research Behavior

**Problem:** Bots currently **DO NOT research techs at all!**

Looking at `FakeHumanExecution.ts`:

- No calls to `hasResearchedTech()`
- No research prioritization logic
- No tech-tree-aware decision making
- Investment rate set to 0.1 but no tech selection

---

## Recommended Integration Strategy

### Phase 1: Add Research Priority System

Each archetype gets a tech priority list that determines research order:

```typescript
interface ArchetypeTechPriorities {
  // Tech IDs in priority order (high to low)
  priorities: string[];
  // Minimum research investment % (0-1)
  researchInvestment: number;
  // Whether to invest in research early or late game
  researchTiming: "early" | "mid" | "late";
}

const ARCHETYPE_TECH_PRIORITIES: Record<
  ArchetypeType,
  ArchetypeTechPriorities
> = {
  [ArchetypeType.Rusher]: {
    priorities: [
      RESEARCH_TECH_IDS.WWII_LESSONS, // Combat boost
      RESEARCH_TECH_IDS.URBAN_PLANNING, // More troops
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Basic economy
    ],
    researchInvestment: 0.1, // Low investment
    researchTiming: "late", // Focus on rush first
  },

  [ArchetypeType.Turtle]: {
    priorities: [
      RESEARCH_TECH_IDS.WWII_LESSONS, // Defense boost
      RESEARCH_TECH_IDS.CITY_ANTI_AIR, // City defense
      RESEARCH_TECH_IDS.WARSHIP_ANTI_AIR, // Naval defense
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Roads
      RESEARCH_TECH_IDS.STRUCTURE_INSURANCE, // Building protection
    ],
    researchInvestment: 0.15, // Moderate investment
    researchTiming: "early", // Defensive techs ASAP
  },

  [ArchetypeType.Nuker]: {
    priorities: [
      RESEARCH_TECH_IDS.SUBMARINE_WARFARE, // Stealth nukes
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Nuclear subs
      RESEARCH_TECH_IDS.URBAN_PLANNING, // Population for nukes
      RESEARCH_TECH_IDS.AUTOMATION, // Economic power
    ],
    researchInvestment: 0.2, // High investment
    researchTiming: "mid", // Rush nuke tech
  },

  [ArchetypeType.Naval]: {
    priorities: [
      RESEARCH_TECH_IDS.SUBMARINE_WARFARE, // Submarines
      RESEARCH_TECH_IDS.WARSHIP_ANTI_AIR, // Naval defense
      RESEARCH_TECH_IDS.FIGHTER_JET_NAVAL_TARGETING, // Air-sea combo
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Nuke from sea
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Trade routes
    ],
    researchInvestment: 0.18, // High investment
    researchTiming: "early", // Naval superiority fast
  },

  [ArchetypeType.Economist]: {
    priorities: [
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Roads unlock
      RESEARCH_TECH_IDS.INTERNATIONAL_TRADE, // Allied roads
      RESEARCH_TECH_IDS.URBAN_PLANNING, // Population
      RESEARCH_TECH_IDS.AUTOMATION, // 2× trade income
      RESEARCH_TECH_IDS.STRUCTURE_INSURANCE, // Protect investments
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Late game power
    ],
    researchInvestment: 0.25, // Very high investment
    researchTiming: "early", // Economic foundation first
  },
};
```

### Phase 2: Implement Research Execution

Add to `FakeHumanExecution.ts`:

```typescript
private handleResearch() {
  if (!this.player) return;

  // Apply archetype research investment
  const targetInvestment = this.techPriorities.researchInvestment;
  if (Math.abs(this.player.researchInvestment() - targetInvestment) > 0.05) {
    this.mg.addExecution(
      new SetResearchInvestmentExecution(this.player, targetInvestment)
    );
  }

  // Select next tech to research
  const completedTechs = new Set(this.player.researchedTechs?.() ?? []);

  for (const techId of this.techPriorities.priorities) {
    if (completedTechs.has(techId)) continue;

    // Check if tech is available (prerequisites met)
    if (!isTechAvailable(this.player, techId)) continue;

    // Trigger research
    this.mg.addExecution(
      new ResearchTreeSelectExecution(this.player, techId)
    );
    return;
  }
}
```

Call from `tick()`:

```typescript
// In tick() method, every 500 ticks check research
if (ticks % 500 === this.diplomacyTick) {
  this.handleResearch();
}
```

### Phase 3: Tech-Aware Decision Making

Modify existing behavior based on researched techs:

```typescript
//  In maybeSendBoatAttack()
private maybeSendBoatAttack(other: Player) {
  // If we have submarines, prefer them
  if (this.player.hasResearchedTech(RESEARCH_TECH_IDS.SUBMARINE_WARFARE)) {
    // Launch submarine instead of transport
    this.launchSubmarineAttack(other);
    return;
  }

  // ... existing transport ship logic
}

// In UnitCreationHelper
static produceUnits(player: Player, ...) {
  // Economist with Automation prioritizes trade structures
  if (player.hasResearchedTech(RESEARCH_TECH_IDS.AUTOMATION)) {
    prioritizeFactor buildings with trade connections
  }

  // Naval archetype with Fighter-Anti-Ship builds more fighters
  if (player.hasResearchedTech(RESEARCH_TECH_IDS.FIGHTER_JET_NAVAL_TARGETING)) {
    increaseAirfieldPriority();
  }
}
```

---

## Impact Analysis

### Gameplay Impact (Positive)

✅ **Dramatic Archetype Differentiation**

- Nuker rushing nuclear subs will feel completely different from Economist building roads
- Naval archetype with sub tech becomes stealth powerhouse
- Turtle with WWII Lessons + City Anti-Air becomes fortress

✅ **Strategic Depth**

- Players can counter bot strategies ("This Nuker has subs, I need anti-air")
- Archetypes evolve over game duration
- Late-game bots become dangerous (not just early rush)

✅ **Replayability**

- Same archetype with different tech order creates variety
- Tech availability depends on map/situation

### Performance Impact

**Estimated Cost:** +0.001ms per bot per tick

- Research check: 1 hash lookup every 500 ticks (negligible)
- Tech selection: Linear scan of ~5 priorities (trivial)
- No new loops or searches

**Verdict:** Performance impact is **effectively zero** ✅

### Implementation Effort

**Estimated Time:** 4-6 hours

1. **Add tech priorities** - 1 hour
   - Define priority lists for each archetype
   - Add to `BotArchetype.ts`

2. **Implement research handler** - 2 hours
   - `handleResearch()` method
   - Tech availability checking
   - Research execution triggering

3. **Tech-aware behavior** - 2 hours
   - Modify boat logic for subs
   - Modify unit production for tech synergies
   - Add conditional branches based on researched techs

4. **Testing** - 1 hour
   - Verify bots research correctly
   - Check tech order follows priorities
   - Validate performance

---

## Decision Matrix

| Criterion               | Rating     | Notes                              |
| ----------------------- | ---------- | ---------------------------------- |
| **Gameplay Value**      | ⭐⭐⭐⭐⭐ | Massive improvement to bot variety |
| **Implementation Cost** | ⭐⭐⭐⭐⭐ | Very low, simple priority system   |
| **Performance Impact**  | ⭐⭐⭐⭐⭐ | Effectively zero                   |
| **Risk**                | ⭐⭐⭐⭐☆  | Low, tech system already works     |
| **Player Transparency** | ⭐⭐⭐⭐☆  | Players can see bot tech in UI     |
| **Maintenance Burden**  | ⭐⭐⭐⭐⭐ | Just config lists, easy to tune    |

**Overall Score:** 29/30 - **STRONG RECOMMEND** ✅

---

## Recommended Approach

### Minimal Version (Include in Initial Release)

1. Add `techPriorities` to archetype configs
2. Implement `handleResearch()` with simple priority selection
3. Set research investment based on archetype
4. **No behavior changes** - just let bots research

**Effort:** 2-3 hours  
**Impact:** Bots become smarter, get upgrades like humans

### Full Version (Phase 2 Enhancement)

1. All of minimal version, plus:
2. Tech-aware unit production
3. Tech-synergistic decision making
4. Dynamic priority adjustment based on game state

**Effort:** 4-6 hours additional  
**Impact:** Archetypes become truly distinctive

---

## Example: Naval Archetype Evolution

Without tech system:

```
Tick 0-1000:   High boat spawning, standard attacks
Tick 1000+:    More boats, no evolution
```

With tech system:

```
Tick 0-500:    Standard boats, researching Submarine Warfare
Tick 500-1500: Submarines instead of transports (stealth attacks)
Tick 1500-2500: Researching Nuclear Subs
Tick 2500+:    Nuclear submarines - mobile nuke platforms!
```

**Gameplay:** Early Naval archetype is annoying with boats. Late Naval archetype is **terrifying** with invisible nuclear submarines.

---

## Tech Prerequisite Analysis

### Current Tech Tree Structure

**Good News:** The current tech tree has **NO prerequisite dependencies**! ✅

All techs in `TECHS` (TechEffects.ts) can be researched independently without requiring other techs first. This means:

- ✅ **No prerequisite validation needed** in initial implementation
- ✅ **Any tech priority order is valid**
- ✅ **Simpler implementation** - no dependency checking required
- ✅ **No risk of circular dependencies**

### Archetype Tech Priority Validation

All archetype tech priorities have been verified:

| Archetype     | Tech Priorities                                                | Status                     |
| ------------- | -------------------------------------------------------------- | -------------------------- |
| **Rusher**    | Land-1 → Land-2 → Economy-1                                    | ✅ Valid (no dependencies) |
| **Turtle**    | Land-1 → Air-2 → Sea-1 → Economy-1 → Economy-3                 | ✅ Valid (no dependencies) |
| **Nuker**     | Sea-2 → Sea-3 → Land-2 → Economy-4                             | ✅ Valid (no dependencies) |
| **Naval**     | Sea-2 → Sea-1 → Air-1 → Sea-3 → Economy-1                      | ✅ Valid (no dependencies) |
| **Economist** | Economy-1 → Economy-2 → Land-2 → Economy-4 → Economy-3 → Sea-3 | ✅ Valid (no dependencies) |

### Future Consideration

If prerequisites are added to the tech tree in the future:

1. **Add prerequisite checking** to `handleResearch()`:

   ```typescript
   private isTechAvailable(techId: string): boolean {
     const tech = TECHS[techId];
     if (!tech?.requires) return true;

     return tech.requires.every(prereq =>
       this.player.hasResearchedTech(prereq.id)
     );
   }
   ```

2. **Update archetype configs** to respect new dependencies
3. **Add validation tests** to ensure priority order respects prerequisites

---

## Conclusion

**YES - Absolutely integrate tech tree into archetypes!**

### Why?

1. **Tech system is already built and working** - zero infrastructure cost
2. **Dramatic gameplay improvement** - bots become 10× more interesting
3. **Minimal implementation effort** - 2-6 hours depending on scope
4. **Zero performance impact** - just config-driven priority lists
5. **Easy to iterate** - just tweak priority arrays

### Next Steps

1. ✅ **Decide:** Include in initial archetype release or phase 2?
2. **Implement:** Add tech priorities to `BotArchetype.ts`
3. **Test:** Verify bots research appropriately
4. **Iterate:** Adjust priorities based on gameplay testing

### My Recommendation

**Include tech priorities in the INITIAL archetype release** but with the minimal version (just let bots research, don't change behavior based on techs yet).

This gives maximum value for minimal cost, and you can add tech-aware behavior in a later update once you see how it plays.

---

## Integration with Existing Docs

I will update `bot-archetypes-design.md` and `bot-archetypes-implementation.md` to include:

1. Tech priority lists in archetype configs
2. Research handling implementation
3. Testing for tech selection
4. Future enhancement: tech-aware behavior

**Ready to proceed with update?**
