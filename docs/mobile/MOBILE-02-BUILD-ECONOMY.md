# MOBILE-02: Build & Economy System

**Part of:** Terratomic Mobile UI Redesign  
**Dependencies:** MOBILE-01 (Core Interactions)  
**Status:** Design Phase  
**Last Updated:** February 9, 2026

---

## Overview

This document defines how players **build structures, purchase units, and manage economy** on mobile. All actions trigger from the context button (see MOBILE-01).

### Scope & Boundaries

**CRITICAL: This is UI adaptation only**

✅ **What changes:**

- Touch-friendly popups replace ControlPanel/ControlPanel2
- Visual placement mode (icon follows finger)
- Larger touch targets (72px rows vs 48px desktop)

❌ **What does NOT change:**

- Build validation (same canBuild logic as desktop)
- Structure costs, requirements, placement rules
- Economy calculations (production/road/research percentages)
- Event emissions (BuildUnitIntentEvent identical to desktop)
- **Desktop UI (ControlPanel.ts/ControlPanel2.ts untouched)**

**Approach:** Reuse desktop build logic, adapt UI for touch. Same game, different interface.

---

## 1. Build Popup Menu

### Trigger: 🏗️ Context Button (Nothing Selected or Own Territory)

When tapping 🏗️, players see a scrollable menu of buildable items:

```
┌───────────────────┐
│ 🏙️ City      $50  │ ← 72px tall rows
│ 🏥 Hospital  $80  │   Touch-optimized
│ 🏭 Factory   $120 │
│ 🛡️ Defense   $200 │
│ ⚛️ Silo      $500 │
│ ✈️ Airfield  $350 │
│ 🏗️ Port      $180 │   (if shore tile selected)
│ ✈️ Fighter Jet $40│   (if airfield unlocked)
│ ────────────────  │
│ [🔬 Research] ➜   │ ← Quick link to research sidebar
└───────────────────┘
```

**Popup Properties:**

- **Position:** Above context button (or left/right if near edge)
- **Max height:** `calc(100vh - 32px - 72px - 100px)` (leaves room for map visibility)
- **Overflow:** Scroll vertically if many items
- **Background:** Semi-transparent black 90%, backdrop blur 8px
- **Tap outside:** Closes popup, cancels action

---

## 2. Buildable Items by Tile Type

### Land Tiles (Own Territory)

**Available:**

- 🏙️ City - $50
- 🏥 Hospital - $80
- 🏭 Factory - $120
- 🛡️ Defense Post - $200
- ⚛️ Missile Silo - $500
- ✈️ Airfield - $350
- 🔬 Research Lab - $300
- 🏛️ Academy - $400
- 🏥 Hospital - $80
- 🎯 SAM Launcher - $280
- 💀 Doomsday Device - $2000
- ✈️ **Fighter Jet** - $40 (if airfield exists + unlocked)

**Context:** Select own land tile → Tap ⚙️ Manage → "Build Here" → Shows land structures

---

### Shore Tiles (Own Territory, Land Adjacent to Water)

**Available:** All land structures PLUS:

- 🏗️ **Port** - $180 (ONLY buildable on shore)

**Validation:**

- Must be land tile with at least 1 adjacent water tile
- Cannot build port on pure land (no water adjacent)
- Cannot build port on pure water

**Context:** Select own shore tile → Tap ⚙️ Manage → "Build Here" → Port appears in list

---

### Water Tiles (Own or Unowned Ocean)

**Available:**

- 🚢 **Warship** - $100 (if port exists + unlocked)
- 🫧 **Submarine** - $150 (if port exists + unlocked)
- ✈️ **Fighter Jet** - $40 (if airfield exists + unlocked)

**Disabled States:**

- If no port: Warship/Submarine show "🔒 Need Port"
- If no airfield: Fighter Jet shows "🔒 Need Airfield"
- If locked: Show "🔒 Research Required: [Tech Name]"

**Context:** Select water tile → Tap 🏗️ Build → Shows water units

**Important Notes:**

- **Transport boats** (for Naval Assault) spawn automatically via attack action (not built)
- **Trade ships** spawn automatically from ports (not manually built)

---

## 3. Build Flow (Placement Mode)

### Step-by-Step Process

**Step 1: Select structure**

```
User taps 🏗️ → Popup opens → User taps "City $50"
```

**Step 2: Placement mode activates**

```
┌─────────────────────────────┐
│ ✕ Cancel      Building City │ ← 48px header (translucent)
├─────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Map dimmed to 50% opacity
│ ░░░░░ [CITY] ░░░░░░░░░░░░░░ │   Structure icon follows finger
│ ░░░░  $50    ░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░[✓]░░░░░[✗]░░░░░░░░░░░░░ │ ← Valid tiles glow green, invalid red
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────┘
```

**Visual Feedback:**

- Map dims to 50% opacity (semi-translucent overlay)
- Selected structure icon "floats" under finger
- Valid placement tiles: **Green glow** (pulsing animation)
- Invalid tiles: **Red overlay** (static)
- Cost displayed under icon

**Step 3: Tap tile to build**

```
User taps valid green tile → Structure placed → Exits placement mode → Map returns to normal
```

**Cancellation:**

- Tap ✕ button (top-left header)
- Tap outside map area
- Android back button

---

### 3.1 Multi-Build Mode (Rapid Placement)

**Desktop Feature:** Multi-build toggle keeps placement mode active after each build

**Mobile Equivalent: Quick Build Toast**

After placing first structure, show toast:

```
┌─────────────────────────────┐
│    City built! (-$50)       │ ← Toast at bottom
│  [Build Another] [Done]     │   48px tall, 3s auto-dismiss
└─────────────────────────────┘
```

**Behavior:**

- **Tap "Build Another"** → Stays in placement mode, build another City
- **Tap "Done"** → Exits placement mode, returns to map
- **Auto-dismiss (3s)** → Exits placement mode (same as "Done")

**Continuous Mode (for power users):**

Add toggle checkbox in build popup:

```
┌───────────────────┐
│ 🏙️ City      $50  │
│ 🏥 Hospital  $80  │
│ ────────────────  │
│ ⚡ Multi-Build ☐  │ ← Toggle checkbox at bottom
└───────────────────┘
```

**When Multi-Build enabled (☑️):**

- Each placement stays in mode (no toast prompt)
- Gold deducts per placement
- Exit by tapping ✕ Cancel or pressing back button
- Checkbox stays checked for session (sticky preference)

**Use Case:**

- Rapid city expansion (build 10 cities in newly conquered territory)
- Mass factory construction
- Defense line (build 5 bunkers along border)

---

### 3.2 Stack Mode (Add to Existing Structures)

**Desktop Feature:** Stack mode toggle allows clicking existing structures to increment stack count

**Mobile Equivalent: Stack Building Option**

When in placement mode + stack mode enabled:

```
┌───────────────────┐
│ 🏙️ City      $50  │
│ 🏥 Hospital  $80  │
│ ────────────────  │
│ ⚡ Multi-Build ☐  │
│ 📚 Stack Mode ☐   │ ← Stack toggle
└───────────────────┘
```

**When Stack Mode enabled (☑️):**

**Visual indicators on map:**

```
┌─────────────────────────────┐
│ ✕ Cancel      Building City │
│                Stack Mode ✓  │
├─────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░[🏙️×3]░░░░░░░░░░░░░░░░░ │ ← Existing city shows stack count
│ ░░░ Tap: +1 ░░░░░░░░░░░░░░░ │ ← Hint text below + larger tap zone
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Empty tiles = disabled (no action)
└─────────────────────────────┘
```

**Stack-Only Behavior:**

1. **Tap existing City (×3)** → Adds to stack → Becomes City (×4)
   - Animation: "+1" floats up from structure (1s fade)
   - Cost deducted: -$50
   - Visual: Stack count badge updates
   - **Hit zone:** 96px diameter around structure (2× normal tap target)
2. **Tap empty tile** → No action (toast: "Tap existing structure to stack")
   - Prevents accidental placements on tiny tiles
   - Tiles too small on mobile for precise tapping

**Why stack-only?**

- Mobile tiles are ~32-48px wide (too small for precision)
- Desktop stack mode also requires clicking "on top of icon" to stack
- Prevents user frustration (missing structure by 5px)
- If user wants new structures, disable Stack Mode

**Stack Count Display:**

- Badge: White circle with black text "×N" at top-right of structure sprite
- Maximum stack: 999 (or desktop's max)
- Stack benefits: ×N production, ×N health, ×N defense (desktop parity)

**Exit Stack Mode:**

- Tap ✕ Cancel
- Uncheck "Stack Mode" toggle
- Press back button

**Use Cases:**

- Defensive stacking (×10 bunkers on strategic tile by tapping icon 10 times)
- Economic powerhouse (×20 factories in capital)
- Hospital stack for massive health regeneration

**To place NEW structures:** Disable Stack Mode, use normal placement mode

**Stack vs Multi-Build Combinations:**

| Multi-Build | Stack Mode | Behavior                                                 |
| ----------- | ---------- | -------------------------------------------------------- |
| ☐ Off       | ☐ Off      | Single placement → Exit mode (default)                   |
| ☑️ On       | ☐ Off      | Rapid new placements on empty tiles                      |
| ☐ Off       | ☑️ On      | Single stack addition → Exit mode (tap existing only)    |
| ☑️ On       | ☑️ On      | Continuous stacking (tap existing structures repeatedly) |

**Desktop Parity:**

- Same stack count badge (×N)
- Same stack benefits (multiplicative)
- Same gold cost (linear: ×5 stack = 5× cost)
- Same visual feedback (badge updates)

---

## 4. Placement Validation Rules

### Land Structures

```typescript
function canPlaceLandStructure(tile: TileRef, structure: UnitType): boolean {
  // Must be land
  if (!game.isLand(tile)) return false;

  // Must be owned by player
  if (game.owner(tile) !== game.myPlayer()) return false;

  // Cannot overlap existing structure
  if (game.hasStructure(tile)) return false;

  // Port special case: Must have adjacent water
  if (structure === UnitType.Port) {
    return hasAdjacentWater(tile);
  }

  return true;
}
```

### Water Units

```typescript
function canPlaceWaterUnit(tile: TileRef, unit: UnitType): boolean {
  // Must be water
  if (game.isLand(tile)) return false;

  // Warship/Submarine: Need port
  if (unit === UnitType.Warship || unit === UnitType.Submarine) {
    if (game.myPlayer().units(UnitType.Port).length === 0) {
      return false; // No ports exist
    }
    // Must have researched tech
    if (!hasUnlockedUnit(unit)) return false;
  }

  // Fighter Jet: Need airfield
  if (unit === UnitType.FighterJet) {
    if (game.myPlayer().units(UnitType.Airfield).length === 0) {
      return false;
    }
    if (!hasUnlockedTech("JetEngines")) return false;
  }

  return true;
}
```

---

## 5. Economy Overlay (Long-Press 🏗️)

### Trigger: Long-press context button (0.6s hold)

Instead of full-screen mode, shows **inline overlay** with sliders:

```
┌─────────────────────────────┐
│ ⌄ Economy Sliders      [✕]  │ ← Draggable header
├─────────────────────────────┤
│ Troops / Workers: 45%       │
│ ┌─────────────────────────┐ │
│ │░░░░░░░░░░░░        🔘  │ │ ← 48px tall slider
│ └─────────────────────────┘ │
│ 450 troops / 550 workers    │
│                             │
│ Attack Ratio: 30%           │
│ ┌─────────────────────────┐ │
│ │░░░░░░░░          🔘    │ │
│ └─────────────────────────┘ │
│ 450 troops attacking        │
│                             │
│ 💰 Investments:             │
│ • Productivity:   25%       │
│ • Roads:          10%       │
│ • Research:       5%        │
│ Total: 40% allocated        │
└─────────────────────────────┘
```

**Overlay Properties:**

- **Position:** Slides up from bottom, covers 40% of screen
- **Background:** Dark semi-transparent (90% opacity)
- **Interaction:** Drag sliders to adjust values
- **Dismissal:**
  - Swipe down to close
  - Tap ✕ button
  - Tap outside overlay
- **Persistence:** Changes apply immediately (real-time)

**Desktop Source:** ControlPanel.ts + ControlPanel2.ts Economy tab

---

### Triple Constraint System (Investment Validation)

Desktop enforces **total investment ≤ 100%**:

```typescript
// From ControlPanel2.ts
const totalInvestment = productivityPercent + roadsPercent + researchPercent;

if (totalInvestment > 100) {
  // Auto-reduce unlocked sliders proportionally
  const locked = [prodLocked, roadLocked, researchLocked];
  const unlocked = sliders.filter((s, i) => !locked[i]);

  const overage = totalInvestment - 100;
  unlocked.forEach((slider) => {
    slider.value -= overage / unlocked.length;
  });
}
```

### Trigger: Select own structure → Tap ⚙️ → "Upgrade [Structure]"

When selecting an existing structure, the Manage popup shows upgrade option:

```
┌───────────────────┐
│ ⬆️ Upgrade City   │ ← Top option (if upgradeable)
│    Level 2 → 3    │
│    Cost: $120     │
│ ────────────────  │
│ 🏗️ Build Nearby  │
│ 📊 View Stats     │
│ 🛡️ Set Defense    │
│ ────────────────  │
│ 📍 Structure Info │
└───────────────────┘
```

**Behavior:**

- Tap "Upgrade" → Confirm dialog (toast): "Upgrade City for $120?"
- Confirm → Instant upgrade, gold deducted
- If insufficient funds: Shows "Not enough gold ($50 / $120)"

**Long-press ⚙️ on structure:** Shows detailed stats (health, level, production bonuses)

**Note:** Only units with tech levels upgrade (cities, factories, defenses). Most structures are single-level.

---

## 8arch: 30% (unlocked)

Total: 100%

User drags Research to 50%:
→ Total would be 120% (overage: 20%)
→ Road auto-reduces to 10% (absorbed 20% overage)
→ Prod stays 40% (locked)
Final: 40% + 10% + 50% = 100%

```

---

### Slider Lock Toggle

**Double-tap slider label** to lock/unlock:

```

┌─────────────────────────────┐
│ Productivity: 40% 🔒 │ ← Double-tap "Productivity" to toggle
│ Roads: 10% │ ← Unlocked (no icon)
│ Research: 50% 🔒 │ ← Locked
└─────────────────────────────┘

```

**Lock behavior:**
- Locked sliders **cannot be auto-reduced** by constraint system
- User can still manually drag locked sliders
- Lock state persists across sessions (saved to player prefs)

---

## 6. Stack Building (Bulk Purchases)

**NOTE:** Stack building and multi-build toggles are **desktop-only features** for MVP. Mobile screens are too small for precise tapping of existing structures. May be added in future tablet-optimized version.

**Desktop Feature (for reference):**
- Stack mode: Tap existing structure to add to stack (×3 → ×4)
- Multi-build: Stay in placement mode after each build
- Both require precise clicking (hard on small mobile screens)

**Mobile Alternative (Simple):**

### Tap-and-Hold Item Row → Build Multiple

**Trigger:** Long-press any buildable item (0.6s hold)

```

┌───────────────────┐
│ 🏙️ City $50 │ ← Long-press here
│ ──────────────── │
│ Build how many? │ ← Stepper appears
│ ┌───┬───┬────────│
│ │ − │ 3 │ + ││ ← +/- buttons, editable number
│ └───┴───┴────────│
│ Total: $150 │ ← Updates in real-time
│ [Cancel] [Build 3]│
└───────────────────┘

```

**Stepper Properties:**
- **Default:** 1 (normal tap builds 1)
- **Max:** Constrained by gold (can't exceed affordable amount)
- **Buttons:**
  - **+** → Increment by 1
  - **−** → Decrement by 1 (min: 1)
  - **Number field** → Tap to edit directly (opens keyboard)
- **Real-time total:** Shows `Total: $X` updating as count changes

**Placement:**
- Tap "Build 3" → Enters placement mode
- Tap tile → Places 1 structure, **stepper decrements** (3 → 2)
- Tap another tile → Places 2nd structure (2 → 1)
- Tap final tile → Places 3rd, exits placement mode
- Can tap ✕ to cancel remaining placements

**Use Cases:**
- Rapid city expansion (build 5 cities in newly conquered territory)
- Mass troop deployment (build 10 infantry on front line)
- Economy boost (build 3 factories at once)

---

## 7. Structure Upgrades

### Trigger: Select own structure → Tap ⚙️ → "Upgrade [Structure]"

When selecting an existing structure, the Manage popup shows upgrade option:

```

┌───────────────────┐
│ ⬆️ Upgrade City │ ← Top option (if upgradeable)
│ Level 2 → 3 │
│ Cost: $120 │
│ ──────────────── │
│ 🏗️ Build Nearby │
│ 📊 View Stats │
│ 🛡️ Set Defense │
│ ──────────────── │
│ 📍 Structure Info │
└───────────────────┘

```

**Behavior:**
- Tap "Upgrade" → Confirm dialog (toast): "Upgrade City for $120?"
- Confirm → Instant upgrade, gold deducted
- If insufficient funds: Shows "Not enough gold ($50 / $120)"

**Long-press ⚙️ on structure:** Shows detailed stats (health, level, production bonuses)

---

## 8. Cost Display & Affordability

### Visual Indicators

**Affordable (gold ≥ cost):**
```

│ 🏙️ City $50 │ → White text, normal state

```

**Unaffordable (gold < cost):**
```

│ 🏙️ City $50 │ → Red text, 70% opacity, disabled
│ Need $20 more │ (if tapped, shows toast)

```

**Locked (research required):**
```

│ 🔒 SAM Launcher │ → Gray text, locked icon
│ Need: Radar │ Long-press shows research path

```

---

## 9. Quick Links

### Research Quick Link (Bottom of Build Popup)

```

┌───────────────────┐
│ ... structures... │
│ ──────────────── │
│ [🔬 Research] ➜ │ ← Tap to open research sidebar
└───────────────────┘

```

**Behavior:**
- Tap → Build popup closes
- Research sidebar slides in from right (same as swipe-from-right)
- Useful for checking tech requirements

---

## 10. Desktop Component Migration

| Desktop Component | Mobile Equivalent | Changes |
|------------------|-------------------|---------|
| **ControlPanel.ts** (sliders) | Economy Overlay (long-press 🏗️) | Inline overlay, not full-screen |
| **ControlPanel2.ts Build tab** | Build Popup (tap 🏗️) | Vertical list, not grid tabs |
| **ControlPanel2.ts Economy tab** | Economy Overlay (merged with ControlPanel) | Combined sliders + investments |
| **Multi-build toggle** | *Desktop-only (PC)* | Too complex for mobile (precision issues) |
| **Stack mode toggle** | *Desktop-only (PC)* | Requires precise tapping (~48px targets too small) |
| **Stack count badge** | *Desktop-only (PC)* | May add in tablet version later |
| **Bulk build (stepper)** | Long-press item → Quantity selector | Mobile-friendly alternative to multi-build |
| **Structure upgrade UI** | Manage Popup → Upgrade option | First row in popup menu |

---

## 11. Implementation Checklist

### Phase 2A: Build Popup (Week 3)
- [ ] Create `MobileBuildPopup.ts` component
- [ ] Fetch buildable structures from game state
- [ ] Add cost display + affordability check (red text if can't afford)
- [ ] Add locked state display (research requirements)
- [ ] Implement scrollable list (if >8 items)
- [ ] Add "Research" quick link at bottom
- [ ] Test popup positioning (avoid screen edges)

### Phase 2B: Placement Mode (Week 3)
- [ ] Create placement mode overlay (50% dim map)
- [ ] Implement structure icon following finger
- [ ] Add tile validation (green glow valid, red overlay invalid)
- [ ] Implement land structure placement rules
- [ ] Implement shore tile port validation (adjacent water check)
- [ ] Implement water unit placement rules (port/airfield check)
- [ ] Add cancel button (✕ header)
- [ ] Implement bulk build stepper (long-press → quantity selector → multiple placements)
- [ ] Test placement flow end-to-end

### Phase 2C: Economy Overlay (Week 4)
- [ ] Create `MobileEconomyOverlay.ts` component
- [ ] Extract slider logic from ControlPanel.ts
- [ ] Extract investment logic from ControlPanel2.ts Economy tab
- [ ] Add 48px tall sliders (touch-friendly)
- [ ] Implement real-time stat updates (troops count, etc.)
- [ ] Add swipe-down-to-dismiss gesture
- [ ] Test on real device (slider dragging accuracy)

### Phase 2D: Structure Upgrades (Week 4)
- [ ] Add "Upgrade" option to Manage popup (when structure selected)
- [ ] Show upgrade cost + level progression (2→3)
- [ ] Implement confirmation toast
- [ ] Handle insufficient funds (red text + toast)
- [ ] Add long-press stats overlay for structures

---

## 12. Design Decisions

**D1: Fighter Jets in both land and water menus**
- **Decision:** Match desktop behavior (check where Fighter Jets appear in buildableUnits)
- **Current assumption:** Likely land-only (Airfield required), not water
- **Implementation:** Use exact same buildableUnits validation as desktop
- **Note:** If desktop shows in both, mobile shows in both (placement mode handles validation)

**D2: Port placement validation**
- **Decision:** Same as desktop (must have 1+ adjacent water tiles)
- **Reasoning:** Game mechanics unchanged - mobile only changes UI interaction
- **Validation:** Reuse desktop `canBuildPort(tile)` logic

**D3: Economy overlay state persistence**
- **Decision:** Real-time updates (no "Apply" button)
- **Reasoning:** Matches desktop ControlPanel2 slider behavior (changes apply immediately)
- **Implementation:** Each slider drag emits DOM `CustomEvent(INVESTMENT_REQUEST_EVENT)` (not EventBus)

**D4: Build popup scrolling vs pagination**
- **Decision:** Vertical scroll (show all items)
- **Reasoning:** Simpler than categorization, users can scan quickly
- **Implementation:** Standard overflow-y scroll within popup container

**D5: Structure upgrade confirmation**
- **Decision:** Instant (no placement highlight mode)
- **Reasoning:** Structure already placed - just tap "Upgrade" → Confirm dialog → Done
- **Implementation:** Same as desktop (no extra map interaction needed)

---

## Next Steps

✅ **MOBILE-01:** Core interactions (foundation)
✅ **This doc:** Build & Economy popups
⏭️ **MOBILE-03:** Combat & Attack system (depends on context button + build system)
```
