# Bot Archetype Implementation - Refinement Checklist

## Overview

This document identifies gaps, edge cases, and refinements needed for a **flawless implementation** of the bot archetype system with tech tree integration.

---

## ✅ What's Already Perfect

1. **Core Architecture** - Parameter bundle design is solid
2. **Performance Analysis** - Thorough with concrete metrics
3. **Determinism** - Well-specified seed management
4. **Type System** - Complete TypeScript interfaces defined
5. **Tech Integration Strategy** - Clear minimal version approach

---

## 🔧 Critical Refinements Needed

### 1. **API Method Name Mismatch** ⚠️ HIGH PRIORITY

**Issue:** Documentation uses `researchInvestment()` but actual API is `researchInvestmentRate()`.

**Current Code:**

```typescript
// Actual API in Game.ts
Player.researchInvestmentRate(): number
Player.setResearchInvestmentRate(rate: number): void
```

**Documentation Says:**

```typescript
const currentInvestment = this.player.researchInvestment(); // ❌ WRONG
```

**Fix Required:**

- Update `bot-archetypes-implementation.md` Phase 2.6
- Change all instances of `researchInvestment()` to `researchInvestmentRate()`
- Change `SetResearchInvestmentExecution` to match actual API

**Files to Update:**

- `docs/bot-archetypes-implementation.md` (line ~670)
- `docs/bot-archetypes-tech-integration.md` (if it references this)

---

### 2. **Tech Prerequisite Validation** ⚠️ MEDIUM PRIORITY

**Issue:** `handleResearch()` doesn't check if tech prerequisites are met.

**Current Implementation:**

```typescript
for (const techId of this.config.techPriorities) {
  if (completedTechs.has(techId)) continue;

  // ❌ NO PREREQUISITE CHECK!
  this.mg.addExecution(new ResearchTreeSelectExecution(this.player, techId));
  return;
}
```

**Problem:** If a tech requires another tech first, this will fail or cause issues.

**Example:**

- `Nuclear Submarines (Sea-3)` requires `Submarine Warfare (Sea-2)`
- If bot tries to research Sea-3 without Sea-2, execution may fail

**Solution Needed:**

**Option A: Trust Tech Priority Order** (Simplest - RECOMMENDED)

```typescript
// In documentation, explicitly state:
// "Tech priorities MUST be ordered such that prerequisites come first"
// Add validation in unit tests to verify this
```

**Option B: Add Prerequisite Helper** (More robust)

```typescript
private isTechAvailable(techId: string): boolean {
  const tech = TECHS[techId];
  if (!tech) return false;

  // Check if all prerequisite techs are researched
  if (tech.requires) {
    for (const prereq of tech.requires) {
      if (!this.player.hasResearchedTech(prereq.id)) {
        return false;
      }
    }
  }

  return true;
}

// Then in handleResearch:
for (const techId of this.config.techPriorities) {
  if (completedTechs.has(techId)) continue;
  if (!this.isTechAvailable(techId)) continue; // ✅ ADDED

  this.mg.addExecution(new ResearchTreeSelectExecution(this.player, techId));
  return;
}
```

**Recommendation:** Use Option A for initial release (document it clearly), add Option B in future enhancement.

**Files to Update:**

- `docs/bot-archetypes-implementation.md` - Add note about prerequisite ordering
- `docs/bot-archetypes-design.md` - Document tech priority ordering rules

---

### 3. **Edge Case: All Techs Researched** ✅ LOW PRIORITY

**Issue:** What happens when bot has researched all priority techs?

**Current Code:**

```typescript
for (const techId of this.config.techPriorities) {
  if (completedTechs.has(techId)) continue;
  // ...
  return;
}
// ❌ Function ends without returning, no clear behavior
```

**Fix:**

```typescript
for (const techId of this.config.techPriorities) {
  if (completedTechs.has(techId)) continue;
  if (!this.isTechAvailable(techId)) continue;

  this.mg.addExecution(new ResearchTreeSelectExecution(this.player, techId));
  return;
}

// ✅ All priority techs done - just maintain research investment
// (No action needed, research points will accumulate for non-priority techs)
```

**Status:** Actually OK as-is. No fix needed, just document the behavior.

**Files to Update:**

- `docs/bot-archetypes-implementation.md` - Add comment explaining this case

---

### 4. **Missing Import Statement** ⚠️ MEDIUM PRIORITY

**Issue:** Documentation shows using `RESEARCH_TECH_IDS` but doesn't show the import.

**Current Documentation:**

```typescript
export const ARCHETYPE_CONFIGS: Record<ArchetypeType, BotArchetypeConfig> = {
  [ArchetypeType.Rusher]: {
    techPriorities: [
      RESEARCH_TECH_IDS.WWII_LESSONS, // ❌ Where does this come from?
    ],
  },
};
```

**Fix Required:**

```typescript
import { RESEARCH_TECH_IDS } from "../../tech/TechEffects";

export const ARCHETYPE_CONFIGS: Record<ArchetypeType, BotArchetypeConfig> = {
  // ...
};
```

**Files to Update:**

- `docs/bot-archetypes-implementation.md` Phase 2.6 - Add import at top of code block
- `docs/bot-archetypes-design.md` - Update archetype specs with correct imports

---

### 5. **ResearchTreeSelectExecution Import** ⚠️ MEDIUM PRIORITY

**Issue:** `handleResearch()` uses `ResearchTreeSelectExecution` but doesn't show import.

**Fix Required:**

```typescript
// In FakeHumanExecution.ts imports
import { ResearchTreeSelectExecution } from "./ResearchTreeSelectExecution";
```

**Files to Update:**

- `docs/bot-archetypes-implementation.md` Phase 2.6

---

### 6. **Config Validation Test** ⚠️ MEDIUM PRIORITY

**Issue:** No validation that tech IDs in configs actually exist.

**Recommendation:** Add unit test:

```typescript
describe("BotArchetype Tech Configs", () => {
  it("all tech IDs in configs exist in RESEARCH_TECH_IDS", () => {
    const validTechIds = new Set(Object.values(RESEARCH_TECH_IDS));

    Object.entries(ARCHETYPE_CONFIGS).forEach(([archetype, config]) => {
      config.techPriorities.forEach((techId) => {
        expect(validTechIds.has(techId)).toBe(true);
      });
    });
  });

  it("tech priorities are in valid prerequisite order", () => {
    // For each archetype, verify no tech comes before its prerequisites
    Object.entries(ARCHETYPE_CONFIGS).forEach(([archetype, config]) => {
      const seenTechs = new Set<string>();

      config.techPriorities.forEach((techId) => {
        const tech = TECHS[techId];
        if (tech?.requires) {
          tech.requires.forEach((prereq) => {
            if (config.techPriorities.includes(prereq.id)) {
              expect(seenTechs.has(prereq.id)).toBe(true);
            }
          });
        }
        seenTechs.add(techId);
      });
    });
  });
});
```

**Files to Update:**

- `docs/bot-archetypes-implementation.md` Phase 1.3 - Add these tests

---

### 7. **Type Safety for Tech Priorities** ✅ NICE TO HAVE

**Issue:** `techPriorities: string[]` allows any string, not just valid tech IDs.

**Better Typing:**

```typescript
export interface BotArchetypeConfig {
  // Instead of:
  readonly techPriorities: string[];

  // Use:
  readonly techPriorities: readonly (typeof RESEARCH_TECH_IDS)[keyof typeof RESEARCH_TECH_IDS][];
}
```

This provides autocomplete and type checking!

**Files to Update:**

- `docs/bot-archetypes-design.md` - Update interface
- `docs/bot-archetypes-implementation.md` Phase 1.1 - Update code

---

### 8. **Performance: Research Check Frequency** ✅ OK AS-IS

**Current:** Research checked every 500 ticks

**Analysis:**

- 500 ticks = ~8-9 seconds at 60 TPS
- Checking more frequently provides no benefit (research takes time to accumulate)
- Could even be 1000 ticks (16s) without issue

**Recommendation:** Keep at 500, optionally increase to 1000 if profiling shows any cost.

**Status:** No change needed.

---

### 9. **Missing: Research Off-By-One in Tick Check** ⚠️ LOW PRIORITY

**Issue:** Tick modulo check might not align properly.

**Current Code:**

```typescript
if (ticks % 500 === this.diplomacyTick % 500) {
  this.handleResearch();
}
```

**Problem:** If `diplomacyTick` is outside 0-499 range, this will never trigger.

**Better:**

```typescript
const researchTick = this.diplomacyTick % 500;
if (ticks % 500 === researchTick) {
  this.handleResearch();
}
```

**Or even simpler:**

```typescript
// Use same tick offset as diplomacy
if (ticks % 500 === this.diplomacyTick) {
  this.handleResearch();
}
```

**Files to Update:**

- `docs/bot-archetypes-implementation.md` Phase 2.6

---

### 10. **Documentation: Example Tech Prerequisites** 📝 ENHANCEMENT

**Add to design doc:** Visual diagram showing tech tree dependencies for each archetype.

**Example for Nuker:**

```
Priority 1: Submarine Warfare (Sea-2)
                ↓
Priority 2: Nuclear Submarines (Sea-3) ← requires Sea-2
                ↓
Priority 3: Urban Planning (Land-2)  ← independent
                ↓
Priority 4: Automation (Economy-4) ← requires Economy-1, Economy-2, Economy-3
```

This shows potential prerequisite issue with Economy-4!

**Files to Update:**

- `docs/bot-archetypes-design.md` - Add dependency diagrams
- `docs/bot-archetypes-tech-integration.md` - Add prerequisite analysis

---

## 📋 Action Item Summary

### High Priority (Must Fix)

- [ ] Fix `researchInvestment()` → `researchInvestmentRate()` method names
- [ ] Add missing import statements for `RESEARCH_TECH_IDS`
- [ ] Add missing import for `ResearchTreeSelectExecution`
- [ ] Verify tech priority order respects prerequisites

### Medium Priority (Should Fix)

- [ ] Add prerequisite ordering validation tests
- [ ] Add config validation unit tests
- [ ] Document prerequisite ordering rules clearly
- [ ] Fix tick modulo check for research

### Low Priority (Nice to Have)

- [ ] Improve type safety for `techPriorities` field
- [ ] Add tech dependency diagrams to design doc
- [ ] Add integration test for research behavior
- [ ] Profile research check frequency

---

## 🧪 Additional Test Cases Needed

Add to implementation plan:

```typescript
describe("Bot Research Integration", () => {
  it("bots set research investment matching archetype", () => {
    const rusher = createBotWithArchetype(ArchetypeType.Rusher);
    runTicks(1000);
    expect(rusher.player.researchInvestmentRate()).toBeCloseTo(0.1, 2);
  });

  it("economist researches Post-War Reconstruction first", () => {
    const economist = createBotWithArchetype(ArchetypeType.Economist);
    runTicks(10000); // Give time to research

    // Should have researched economy techs
    expect(
      economist.player.hasResearchedTech(
        RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION,
      ),
    ).toBe(true);
  });

  it("nuker prioritizes submarine warfare", () => {
    const nuker = createBotWithArchetype(ArchetypeType.Nuker);
    runUntilFirstTechResearched(nuker);

    // First tech should be submarine warfare
    const researched = nuker.player.researchedTechs();
    expect(researched[0]).toBe(RESEARCH_TECH_IDS.SUBMARINE_WARFARE);
  });
});
```

---

## 🎯 Critical Path for Flawless Implementation

1. **Fix API method name** (`researchInvestmentRate`)
2. **Add all imports** to code examples
3. **Verify tech prerequisite ordering** in all archetype configs
4. **Add validation tests** for config correctness
5. **Document edge cases** clearly
6. **Test research behavior** in integration tests

**Estimated Additional Work:** 2-3 hours to refine documentation and add missing pieces.

---

## ✅ Ready to Implement Checklist

Before starting implementation:

- [ ] Review TechEffects.ts to understand prerequisite structure
- [ ] Validate all tech IDs in configs exist
- [ ] Verify prerequisite ordering in techPriorities arrays
- [ ] Update all method names to match actual API
- [ ] Add all required imports to code examples
- [ ] Add validation unit tests
- [ ] Add integration tests for research behavior
- [ ] Review BotArchetype.ts contract with all team members

**Total Refinement Effort:** 2-3 hours
**Risk After Refinements:** Very Low

---

## 📞 Questions for Implementation Team

1. Should we add prerequisite checking in initial release or defer to Phase 2?
2. Is 500-tick research check frequency acceptable, or should it be less frequent?
3. Should tech priority arrays be validated at compile-time or runtime?
4. Do we want research investment to be adjustable mid-game or set once?
