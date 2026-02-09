# Mobile Project Scope & Boundaries

**Purpose:** Define exactly what mobile implementation can and cannot change  
**Last Updated:** February 9, 2026

---

## Core Principle

**Mobile is a UI adaptation, NOT a game redesign.**

We have a functioning game on PC. Mobile adds touch-friendly interactions for the same game.

---

## ✅ What Mobile CAN Change

### 1. Input Methods

**Desktop → Mobile:**

- Mouse click → Tap
- Right-click → Context button tap
- Hover → Long-press (600ms)
- Mouse drag → Finger drag
- Keyboard shortcuts → Gesture shortcuts

### 2. Visual Layout

**Desktop → Mobile:**

- Right-click radial menu → Text-based popups
- Always-visible panels → Swipe-in sidebars
- Multi-panel layout → Contextual single view
- Hover tooltips → Long-press overlays
- Small icons → Larger touch targets (48px minimum)

### 3. Screen Real Estate

**Desktop → Mobile:**

- Multiple panels visible → Map-centric (98% map, 2% UI)
- Persistent UI → Collapsible/dismissible UI
- Large screen → Small screen optimization

### 4. Touch Targets

**Size increases:**

- 32px desktop rows → 72px mobile rows
- 18px icons → 24px icons
- 48px minimum touch target (Apple HIG)
- 8px spacing → 16px spacing

### 5. Gestures

**New interactions mobile can add:**

- Swipe from edge (open sidebars)
- Long-press (show details)
- Double-tap (center camera)
- Pinch-zoom (map navigation)
- Two-finger pan (map navigation)

### 6. Visual Feedback

**Mobile can enhance:**

- Haptic feedback (vibration patterns)
- Toast notifications (3s auto-dismiss)
- Loading spinners (for async operations)
- Selected tile glow (yellow outline)

---

## ❌ What Mobile CANNOT Change

### 1. Game Mechanics (Server-Side)

**Forbidden changes:**

- ❌ Attack damage calculations
- ❌ Troop generation rates
- ❌ Build costs (City = $500, always)
- ❌ Research beaker accumulation
- ❌ Ship movement speeds
- ❌ Nuclear blast zones
- ❌ Victory conditions
- ❌ Fog of war rules
- ❌ Alliance mechanics
- ❌ Economy formulas

**Why:** Server runs game logic. Mobile just displays results.

### 2. Event System

**Must emit identical events:**

```typescript
// Desktop emits:
SendAttackIntentEvent(targetID, troops);

// Mobile MUST emit:
SendAttackIntentEvent(targetID, troops); // Same signature

// ❌ FORBIDDEN:
SendMobileAttackIntentEvent(targetID, troops, touchX, touchY); // NO
```

**Why:** Server expects specific event types. Cannot add new events or parameters.

### 3. Validation Logic

**Must use same checks:**

```typescript
// Desktop:
function canBuild(unitType, tile) {
  return tile.isLand() && !tile.hasStructure();
}

// Mobile MUST use:
function canBuild(unitType, tile) {
  return tile.isLand() && !tile.hasStructure(); // EXACT SAME
}

// ❌ FORBIDDEN:
function canBuild(unitType, tile) {
  return tile.isLand() && !tile.hasStructure() && isTouchAccurate(); // NO
}
```

**Why:** Game must behave identically for mobile and desktop players in same match.

### 4. Desktop UI Components

**Desktop files stay 100% unchanged:**

- ✅ ControlPanel.ts (unchanged)
- ✅ RadialMenu.ts (unchanged)
- ✅ ControlPanel2.ts (unchanged)
- ✅ ResearchTreeModal.ts (unchanged)
- ✅ GameLeftSidebar.ts (unchanged)

**Implementation pattern:**

```typescript
// Main.ts
if (isMobile) {
  loadMobileUI(); // NEW code
} else {
  loadDesktopUI(); // EXISTING code (unchanged)
}
```

**Why:** Desktop players must have zero impact. Mobile is additive, not replacement.

### 5. Shared Core Logic

**Files in `src/core/` are untouchable:**

- ❌ Cannot modify GameRunner.ts
- ❌ Cannot modify attack executors
- ❌ Cannot modify build executors
- ❌ Cannot modify research system
- ❌ Cannot modify pathfinding

**Why:** Core logic is isomorphic (runs client + server). Changes break server.

### 6. New Game Features

**Forbidden additions:**

- ❌ New unit types
- ❌ New technologies
- ❌ New building types
- ❌ New attack types
- ❌ New victory conditions
- ❌ New game modes

**Why:** This is UI adaptation, not game expansion.

### 7. Balance Changes

**Forbidden tweaks:**

- ❌ "Mobile gets 10% more troops"
- ❌ "Mobile build costs reduced"
- ❌ "Mobile research faster"
- ❌ "Mobile nukes cheaper"

**Why:** Mobile and desktop players play together. Must be balanced.

---

## 🔄 Mobile-Desktop Compatibility

### Cross-Platform Play

**Requirement:** Mobile player vs Desktop player in same game must work flawlessly.

**Server sees:**

```
Player1 (Desktop): SendAttackIntentEvent(playerID, 450)
Player2 (Mobile):  SendAttackIntentEvent(playerID, 450)

→ Server cannot tell difference
→ Both events processed identically
```

### Event Parity Checklist

| Action        | Desktop Event                          | Mobile Event                           | Match? |
| ------------- | -------------------------------------- | -------------------------------------- | ------ |
| Ground Attack | `SendAttackIntentEvent(id, tr)`        | `SendAttackIntentEvent(id, tr)`        | ✅     |
| Naval Assault | `SendBoatAttackIntentEvent(...)`       | `SendBoatAttackIntentEvent(...)`       | ✅     |
| Build City    | `BuildUnitIntentEvent(City, t)`        | `BuildUnitIntentEvent(City, t)`        | ✅     |
| Propose Ally  | `SendAllianceRequestIntentEvent(r, p)` | `SendAllianceRequestIntentEvent(r, p)` | ✅     |

**All events must match exactly.**

---

## 🎯 What "UI Only" Means

### Allowed Changes

✅ **Visual presentation:**

- Popup vs panel
- Button vs menu slot
- Sidebar vs always-visible
- Toast vs inline notification

✅ **Interaction patterns:**

- Tap vs click
- Long-press vs hover
- Swipe vs scroll
- Gesture vs keyboard shortcut

✅ **Layout optimization:**

- Vertical vs horizontal
- Stacked vs side-by-side
- Full-screen vs windowed
- Collapsible vs persistent

### Forbidden Changes

❌ **Behavioral logic:**

- What happens when you attack
- How much gold a City costs
- How beakers accumulate
- Which tiles you can build on

❌ **Data validation:**

- Can you afford this structure?
- Is this tile valid for placement?
- Are you at war with this player?
- Do you have required research?

❌ **Server communication:**

- Event types
- Event parameters
- WebSocket protocol
- Game state synchronization

---

## 📋 Pre-Implementation Checklist

Before designing any mobile feature, verify:

- [ ] Does desktop have this feature? (If no → don't add it)
- [ ] What exact events does desktop emit? (Match them)
- [ ] What validation does desktop use? (Reuse it)
- [ ] Which desktop component handles this? (Map it)
- [ ] Does this change game mechanics? (If yes → forbidden)
- [ ] Does this modify desktop code? (If yes → forbidden)
- [ ] Can mobile/desktop players play together? (Must be yes)

---

## 🚫 Common Pitfalls to Avoid

### 1. Feature Creep

**Wrong:** "Mobile should have quick-build mode where 5 cities cost $2000"

- This is a new feature (forbidden)
- Changes game balance (forbidden)

**Right:** "Mobile shows same build menu as desktop, just in a popup instead of panel"

### 2. Over-Optimization

**Wrong:** "Mobile bomber targeting should let you select individual structures"

- Desktop doesn't have this (forbidden)
- Adds complexity (scope creep)

**Right:** "Mobile bomber targeting works like desktop (all structures, closest first)"

### 3. UI "Improvements" That Change Behavior

**Wrong:** "Add confirmation dialog for all attacks on mobile"

- Desktop only confirms Declare War
- Changes user flow (forbidden)

**Right:** "Match desktop: only Declare War gets confirmation"

### 4. Mobile-Specific Mechanics

**Wrong:** "Mobile gets auto-attack when low on troops"

- Desktop doesn't have this (forbidden)
- Changes gameplay (forbidden)

**Right:** "Mobile uses same manual attack as desktop, just tap button instead of right-click"

---

## 🎓 Design Philosophy

### The Golden Rule

**"Would a desktop player feel disadvantaged if this was on desktop?"**

- If yes → Don't add it to mobile
- If no → Safe to implement

### Example Decisions

**Haptic feedback on mobile?**

- Desktop doesn't have haptic (can't)
- But doesn't give mobile advantage
- ✅ Allowed (pure UX enhancement)

**Faster research on mobile?**

- Desktop doesn't have this
- Gives mobile advantage
- ❌ Forbidden (game balance)

**Confirmation dialog for attacks?**

- Desktop doesn't have this (except Declare War)
- Doesn't give advantage, but changes flow
- ❌ Forbidden (behavior must match)

**Long-press for tile info?**

- Desktop uses hover
- Same information, different trigger
- ✅ Allowed (input adaptation)

---

## 📊 Success Criteria

Mobile implementation is successful if:

1. ✅ Mobile player can perform **all** desktop actions
2. ✅ Mobile player emits **identical** events to server
3. ✅ Desktop codebase is **unchanged** (no regressions)
4. ✅ Mobile vs Desktop multiplayer works **flawlessly**
5. ✅ Game mechanics are **identical** (balance preserved)
6. ✅ No new features added (pure UI adaptation)

---

## 🔗 Related Documents

- `REFERENCE-01-DESKTOP-COMPONENTS.md` - What exists on desktop
- `REFERENCE-02-GAME-MECHANICS.md` - Rules that cannot change
- `REFERENCE-04-EVENT-SYSTEM.md` - Events mobile must emit
- `MOBILE-01` through `MOBILE-07` - Mobile UI specifications
