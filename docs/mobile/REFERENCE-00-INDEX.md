# Mobile UI Reference Guide - START HERE

**Purpose:** Master index and quick-start guide for mobile UI implementation  
**Audience:** AI assistants, developers starting fresh on mobile adaptation  
**Last Updated:** February 9, 2026

---

## 📖 Quick Start (Fresh Chat)

**If you're being asked to work on Terratomic mobile UI, read these 4 reference docs first:**

### 1. **REFERENCE-01-DESKTOP-COMPONENTS.md** (Read First)

- Inventory of existing desktop UI components
- RadialMenu slot mapping (7 actions)
- ControlPanel build system
- ResearchTreeModal actual implementation (CSS Grid, NOT D3)
- GameLeftSidebar structure
- Component file paths

**Why:** Prevents wrong assumptions about what exists on desktop.

---

### 2. **REFERENCE-02-GAME-MECHANICS.md** (Read Second)

- Research system (multi-priority, NOT single-research)
- Bomber targeting (manual vs auto)
- Naval assault (no route preview)
- Nuclear weapons (purchase units, NOT targeting mode)
- Build validation rules
- Economy triple constraint

**Why:** Prevents over-designing features that don't exist.

---

### 3. **REFERENCE-03-PROJECT-SCOPE.md** (Read Third)

- What mobile CAN change (UI only)
- What mobile CANNOT change (mechanics, server, desktop code)
- Mobile-desktop compatibility requirements
- Pre-implementation checklist
- Common pitfalls to avoid

**Why:** Sets clear boundaries to prevent scope creep.

---

### 4. **REFERENCE-04-EVENT-SYSTEM.md** (Read Fourth)

- Complete event catalog (SendAttackIntentEvent, etc.)
- Event signatures mobile must match
- Emission patterns
- Validation before emitting

**Why:** Ensures mobile emits identical events to server.

---

## 🎯 Core Principles (Memorize These)

### The Golden Rules

1. **"Mobile is UI adaptation only"**
   - Changes: Touch interactions, visual layout, gestures
   - Unchanged: Game mechanics, server logic, desktop code

2. **"Desktop stays 100% untouched"**
   - Desktop players unaffected
   - Mobile loads separate components: `if (isMobile) { loadMobileUI() }`

3. **"Same events to server"**
   - `SendAttackIntentEvent` desktop = `SendAttackIntentEvent` mobile
   - No new events, no modified signatures

4. **"If desktop doesn't have it, don't add it"**
   - Don't reinvent the wheel
   - Reuse existing validation, calculations, logic

5. **"Mobile and desktop play together"**
   - Cross-platform compatibility required
   - Same game balance, same rules

---

## 📂 Document Structure

### Reference Documents (Background Knowledge)

| Document                               | Purpose                      | When to Read                            |
| -------------------------------------- | ---------------------------- | --------------------------------------- |
| **REFERENCE-00-INDEX.md**              | This file - master index     | Always start here                       |
| **REFERENCE-01-DESKTOP-COMPONENTS.md** | What exists on desktop       | Before designing any feature            |
| **REFERENCE-02-GAME-MECHANICS.md**     | Game rules that can't change | When unsure if something is UI or logic |
| **REFERENCE-03-PROJECT-SCOPE.md**      | Boundaries and constraints   | When proposing any change               |
| **REFERENCE-04-EVENT-SYSTEM.md**       | Events mobile must emit      | When implementing actions               |

### Mobile UI Specifications (Implementation Guides)

| Document                              | Purpose                                                | Phase         |
| ------------------------------------- | ------------------------------------------------------ | ------------- |
| **MOBILE-01-CORE-INTERACTIONS.md**    | Foundation: gestures, context button, device detection | Week 1-2      |
| **MOBILE-02-BUILD-ECONOMY.md**        | Build popup, placement mode, economy overlay           | Week 3-4      |
| **MOBILE-03-COMBAT-WARFARE.md**       | Attack popup, nuclear weapons, RadialMenu migration    | Week 5-6      |
| **MOBILE-04-DIPLOMACY-INTEL.md**      | Diplomacy popup, Intel sidebar, events integration     | Week 7-8      |
| **MOBILE-05-RESEARCH-PROGRESSION.md** | Research sidebar, tech tree adaptation                 | Week 8-9      |
| **MOBILE-06-IMPLEMENTATION.md**       | Technical roadmap, component architecture, phases      | Before coding |
| **MOBILE-07-TESTING-QA.md**           | Test cases, device matrix, QA checklist                | Week 10+      |

---

## 🔍 Common Questions (FAQ)

### "How do I know if I should change X?"

**Decision tree:**

```
Is X a UI element?
├─ Yes → Can change (make touch-friendly)
└─ No → Cannot change
    ├─ Game mechanic? → Cannot change
    ├─ Event signature? → Cannot change
    └─ Desktop code? → Cannot change
```

**Examples:**

- ✅ Change radial menu to popup (UI element)
- ❌ Change attack damage (game mechanic)
- ❌ Add new event parameter (event signature)
- ❌ Modify ControlPanel.ts (desktop code)

---

### "Desktop doesn't have [feature], should mobile add it?"

**Answer: No.**

Mobile only adapts existing features. If desktop lacks it, it's out of scope.

**Example:**

- Desktop doesn't have per-building bomber selection
- Mobile shouldn't add it (even if it seems useful)

---

### "What if mobile UI pattern doesn't match desktop?"

**OK if:**

- ✅ Different input (tap vs click)
- ✅ Different layout (popup vs panel)
- ✅ Different trigger (swipe vs menu)

**NOT OK if:**

- ❌ Different validation (stricter/looser rules)
- ❌ Different events (new event types)
- ✅ Different behavior (attack works differently)

---

### "Can mobile have stack mode / multi-build?"

**Answer: No (precision constraint).**

Mobile tiles are ~40px on phones. Too small for precise structure tapping.

**Desktop may have these**, but mobile cannot implement due to touch limitations.

**Alternative:** Bulk build stepper (select quantity, place multiple).

---

### "Where do I find existing validation logic?"

**See REFERENCE-01-DESKTOP-COMPONENTS.md, section "Validation Logic Locations":**

- `canBuild(unitType, tile)` → ControlPanel.ts
- `canGroundAttack(target)` → RadialMenu.ts
- `canNavalAssault(target)` → RadialMenu.ts
- `canAirStrike(target)` → RadialMenu.ts
- `canBomberRun(target)` → RadialMenu.ts

**Mobile must reuse these functions** (import from desktop components or extract to shared utils).

---

### "What events should mobile popup emit?"

**See REFERENCE-04-EVENT-SYSTEM.md for complete catalog.**

**Quick reference:**

- Ground Attack → `SendAttackIntentEvent(targetID, troops)`
- Naval Assault → `SendBoatAttackIntentEvent(targetID, dst, troops, src)`
- Air Strike → `SendParatrooperAttackIntentEvent(targetID, dst, troops)`
- Bomber Run → `SendBomberIntentEvent(targetID, structures, preferClosest)`
- Build City → `BuildUnitIntentEvent(UnitType.City, tile)`
- Propose Ally → `SendAllianceRequestIntentEvent(requestor, recipient)`
- Nukes → `BuildUnitIntentEvent(UnitType.AtomBomb, tile)` (same as build!)
- Mark Target → `SendTargetPlayerIntentEvent(targetID)`

**Rule:** Events must match desktop exactly (same class, same params, same order).

---

### "How does desktop handle [specific feature]?"

**Three places to check:**

1. **REFERENCE-01-DESKTOP-COMPONENTS.md** → Component mapping table
2. **REFERENCE-02-GAME-MECHANICS.md** → Behavioral rules
3. **Desktop source code** → Search `src/client/` for component

**If still unclear:** Ask user for clarification (don't guess).

---

## 🚀 Implementation Workflow

### Phase-by-Phase Approach

```
Week 1-2: Foundation (MOBILE-01)
├─ Device detection
├─ Gesture system (tap, swipe, long-press)
├─ Context button (6 states)
└─ Selection system

Week 3-4: Build & Economy (MOBILE-02)
├─ Build popup
├─ Placement mode
├─ Economy overlay
└─ Structure upgrades

Week 5-6: Combat (MOBILE-03)
├─ Attack popup
├─ Attack ratio slider
├─ Unit combat
└─ Nuclear weapons

Week 7-8: Diplomacy & Intel (MOBILE-04)
├─ Diplomacy popup
├─ Intel sidebar (swipe from left)
├─ Player info toasts
└─ Events integration

Week 8-9: Research (MOBILE-05)
├─ Research sidebar (swipe from right)
├─ Grid layout adaptation
├─ Multi-priority display
└─ Investment slider

Week 9: Polish & Optimization (MOBILE-06)
├─ Performance tuning
├─ Accessibility (ARIA labels)
├─ Haptic feedback
└─ Animation polish

Week 10+: Testing (MOBILE-07)
├─ Device testing (iPhone, Android, tablets)
├─ Cross-browser (Safari iOS, Chrome Android)
├─ RadialMenu parity verification
└─ Mobile vs Desktop multiplayer testing
```

**See MOBILE-06-IMPLEMENTATION.md for detailed roadmap.**

---

## ⚠️ Red Flags (Stop and Ask)

If you're about to:

- ❌ Modify a file in `src/core/`
- ❌ Change a desktop component (ControlPanel, RadialMenu, etc.)
- ❌ Add a new event type
- ❌ Change event parameters
- ❌ Modify game balance (costs, damage, rates)
- ❌ Add a feature desktop doesn't have
- ❌ Change validation logic behavior

**STOP → Ask user for clarification → Reference docs may have missed something**

---

## 📊 Success Criteria

Mobile implementation succeeds if:

1. ✅ All desktop actions work on mobile (100% feature parity)
2. ✅ Events emitted are identical (server can't tell difference)
3. ✅ Desktop codebase unchanged (zero regressions for PC players)
4. ✅ Mobile vs Desktop multiplayer works (cross-platform compatibility)
5. ✅ No new game features added (pure UI adaptation)
6. ✅ Touch-friendly (48px+ touch targets, gestures work reliably)
7. ✅ Performance acceptable (60 FPS, <150MB memory, <100ms touch response)

---

## 🛠️ Tools & Patterns

### Device Detection

```typescript
import { MobileDetector } from "./mobile/MobileDetector";

if (MobileDetector.isMobile()) {
  // Load mobile UI
} else {
  // Load desktop UI
}
```

### Event Emission

```typescript
import { EventBus } from "../core/EventBus";

// Emit intent (targetID is PlayerID | null, NOT PlayerView):
eventBus.emit(new SendAttackIntentEvent(targetID, troops));

// Listen for updates:
eventBus.on(GameUpdateEvent, (event) => {
  // Update game state
});
```

### Validation Reuse

```typescript
// Import from desktop component:
import { canBuild } from "../ControlPanel";

// Use in mobile:
if (!canBuild(UnitType.City, tile)) {
  showToast("Cannot build here", 3000);
  return;
}
```

---

## 📞 When You Need More Info

### Information Sources (Priority Order)

1. **Reference docs** (this folder) - Quick lookup
2. **MOBILE-XX docs** - Detailed specifications
3. **Desktop source code** (`src/client/`) - Actual implementation
4. **User clarification** - Ask when uncertain

### Questions to Ask User

**When unclear:**

- "Does desktop have [feature X]? Can you point me to the component?"
- "What event does desktop emit for [action Y]?"
- "How does desktop validate [condition Z]?"

**Don't assume:**

- Don't guess about desktop behavior
- Don't add features without confirmation
- Don't modify mechanics without explicit approval

---

## 🎓 Learning Path (For AI Assistants)

### Recommended Reading Order (Fresh Chat)

1. **REFERENCE-00-INDEX.md** (this file) ← 5 min read
2. **REFERENCE-03-PROJECT-SCOPE.md** ← Understand boundaries
3. **REFERENCE-01-DESKTOP-COMPONENTS.md** ← See what exists
4. **REFERENCE-02-GAME-MECHANICS.md** ← Learn rules
5. **REFERENCE-04-EVENT-SYSTEM.md** ← Event catalog
6. **MOBILE-01 through MOBILE-07** ← Detailed specs

**Total reading time: ~30 minutes**

After reading, you should be able to:

- ✅ Identify what can/cannot change
- ✅ Map desktop actions to mobile UI
- ✅ Know which events to emit
- ✅ Avoid common pitfalls
- ✅ Design mobile UI that matches desktop behavior

---

## 🔗 Quick Links

### Reference Documents

- [REFERENCE-01: Desktop Components](./REFERENCE-01-DESKTOP-COMPONENTS.md)
- [REFERENCE-02: Game Mechanics](./REFERENCE-02-GAME-MECHANICS.md)
- [REFERENCE-03: Project Scope](./REFERENCE-03-PROJECT-SCOPE.md)
- [REFERENCE-04: Event System](./REFERENCE-04-EVENT-SYSTEM.md)

### Mobile Specifications

- [MOBILE-01: Core Interactions](./MOBILE-01-CORE-INTERACTIONS.md)
- [MOBILE-02: Build & Economy](./MOBILE-02-BUILD-ECONOMY.md)
- [MOBILE-03: Combat & Warfare](./MOBILE-03-COMBAT-WARFARE.md)
- [MOBILE-04: Diplomacy & Intel](./MOBILE-04-DIPLOMACY-INTEL.md)
- [MOBILE-05: Research & Progression](./MOBILE-05-RESEARCH-PROGRESSION.md)
- [MOBILE-06: Implementation Guide](./MOBILE-06-IMPLEMENTATION.md)
- [MOBILE-07: Testing & QA](./MOBILE-07-TESTING-QA.md)

---

## ✅ Pre-Work Checklist (Before Starting Any Task)

Before implementing any mobile feature:

- [ ] Read this index (REFERENCE-00)
- [ ] Read scope boundaries (REFERENCE-03)
- [ ] Check if desktop has this feature (REFERENCE-01)
- [ ] Verify game mechanics rules (REFERENCE-02)
- [ ] Identify events to emit (REFERENCE-04)
- [ ] Review relevant MOBILE-XX spec
- [ ] Confirm desktop code stays unchanged
- [ ] Plan cross-platform compatibility testing

**If any checkbox fails → Ask user for clarification**

---

**Welcome to Terratomic mobile UI adaptation! Start with the 4 reference docs above, then dive into MOBILE-01 through MOBILE-07. Good luck! 🚀**
