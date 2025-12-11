# Control Panel 2 - Tab and Function Overview

**Purpose**: Review all tabs and functions to identify what's essential for an IO game vs. what's excessive complexity.

---

## REVISED Tab Structure (Based on Decisions)

The Control Panel will have **4 tabs**:

1. **Build** - Structure construction and upgrades ✅ **KEEP AS IS**
2. **Attack** - Military unit production ✅ **KEEP AS IS**
3. **Economy** - Investment management ⚠️ **SIMPLIFY SIGNIFICANTLY**
4. **R&D** - Research tree and tech progression ✨ **NEW TAB**

**REMOVED TABS**:

- ❌ **Trade** - Removed (Trade demand moves to Build tab as indicator)
- ❌ **Diplomacy** - Removed (Alliance status shown as map icons instead)
- ❌ **Bombers** - Removed (Auto-bombing always on, manual targeting via radial menu)

---

## Design Decisions Summary

### ✅ Keep As Is

- **Build Tab** - All features staying (multi-build, level setter, upgrade mode, 11 structures)

### ⚠️ Simplified (Attack Tab)

- **Attack Tab** - Remove level setter and upgrade modal (unit levels from tech tree only)

### ⚠️ Simplify

- **Attack Tab** → Remove level setter, remove upgrade modal (unit levels from tech tree)
- **Economy Tab** → Remove roads slider (auto-built when tech unlocked), remove military spending, change sliders to 3-button choices (10%, 25%, 50%)

### ✨ New

- **R&D Tab** → Minified research tree view + "Open Full Tree" button + category prioritization

### ❌ Remove

- **Trade Tab** → Delete (move trade demand indicator to Build tab)
- **Diplomacy Tab** → Delete (show alliance status as map icons)
- **Bombers Tab** → Delete (auto-bombing always on, manual targeting via radial menu)

---

## Original Tab Structure (For Reference)

The Control Panel originally had **6 tabs**:

1. **Build** - Structure construction and upgrades
2. **Attack** - Military unit production
3. **Economy** - Investment sliders for resource allocation
4. **Bombers** - Strategic bomber targeting system _(removed)_
5. **Trade** - Cargo ship management and embargo controls _(removed)_
6. **Diplomacy** - War, peace, and alliance management _(removed)_

---

## 1. BUILD TAB ✅ KEEPING AS IS

### Primary Functions

- **Structure Selection Grid** - Choose from 11 structure types to build
  - City, Hospital, Research Lab, Academy, Factory
  - Port, Missile Silo, SAM Launcher, Air Field, Defense Post, Doomsday Device

### Build Controls

- **Multi-Build Mode** - Place multiple structures without re-selecting (toggle button)
- **Level Setter** - Set the level (1-max) for newly placed structures with +/- buttons
- **Upgrade Structures Mode** - Click existing structures to upgrade them (toggle button)
- **Build Settings Modal** - Detailed configuration for default build levels (gear icon)

### New Addition

- **Trade Demand Indicator** - Shows if more ports are needed
  - Display: "Trade Demand: ⚠️ High" or "Trade Demand: ✓ Low"
  - Color-coded badge (red/yellow/green)
  - Tooltip: "Build more Ports to satisfy trade routes"

### Decision

**KEEP ALL FEATURES** - No changes to Build tab functionality

---

## 2. ATTACK TAB ⚠️ SIMPLIFIED

### Primary Functions

- **Unit Selection Grid** - Choose military units to build
  - Atom Bomb, MIRV, Hydrogen Bomb (nukes)
  - Fighter Jet, Warship, Submarine (combat units)

### Attack Controls

- **Multi-Build Mode** - Build multiple units without re-selecting

### REMOVED

- ❌ **Level Setter** - Unit levels now controlled by tech unlocks (all units automatically get upgrades when tech researched)
- ❌ **Upgrade Units Button** - No longer needed (tech-based upgrades)
- ❌ **Unit Upgrade Settings Modal** - No longer needed (tech-based upgrades)

### Decision

**SIMPLIFIED**: Unit levels automatically determined by researched technologies

- All units of a type use the same level (highest unlocked via tech tree)
- No manual level selection needed
- Cleaner UI with just unit selection grid + multi-build toggle

---

## 3. ECONOMY TAB ⚠️ MAJOR SIMPLIFICATION

### Investment Choices (Previously 4 sliders)

#### **REMOVED**

- ❌ **Road Investment Slider** - Roads now auto-build at fixed rate when tech unlocked
- ❌ **Military Expenditure Slider** - Was disabled placeholder, now deleted
- ❌ **Lock mechanisms** - All double-click lock features removed
- ❌ **Break-even indicators** - Removed calculation complexity

#### **NEW DESIGN: 3-Button Choice System**

**Production Investment** (Default: 10%)

```
Production Investment:
[●] 10%   [ ] 25%   [ ] 50%
└─ Productivity: 85% (+2.1%/min)
```

**Research Investment** (Default: 10%)

```
Research Investment:
[ ] 10%   [●] 25%   [ ] 50%
└─ Current: Advanced Metallurgy (45%)
```

### Implementation Details

- **3 buttons per investment type**: 10%, 25%, 50%
- **Default: 10%** for both Production and Research
- **No sliders** - Discrete choices only
- **No auto-balancing** - Independent choices (can set both to 50% = 100% total)
- **Total cap: 100%** - If selecting would exceed 100%, show warning
- **Visual feedback**: Selected button highlighted, others dimmed
- **Show current research** - What player is funding with research investment

### Road Network (Passive Display)

```
Road Network: Quality 92% · Completion 67%
└─ Building at 5.2 px/s (unlocked via National Reconstruction Program)
```

- **No slider** - Automatically builds when tech unlocked
- **Fixed build speed** - Determined by game config
- **Shows status only** - Quality and completion for information

### Decision

**MASSIVE SIMPLIFICATION**:

- 4 sliders → 2 button groups (6 buttons total)
- Removed roads investment (passive auto-build)
- Removed military spending (was placeholder)
- Removed all lock mechanisms
- Clear, fast decision-making (click one of 3 buttons)

---

## 4. R&D TAB ✨ NEW ADDITION

### Purpose

Dedicated research/technology interface for managing tech progression

### Features

#### **Minified Research Tree View**

- **Compact tree display** - Shows current tier and adjacent techs
- **Visual design** - Based on previous research tree mockup design
- **Current research highlighted** - What's actively being researched
- **Available techs shown** - What can be researched next
- **Completed techs dimmed** - Gray out finished research

#### **Category Prioritization**

```
Research Priority:
[ ] Military   [●] Economy   [ ] Infrastructure   [ ] Special
```

- **4 categories**: Military, Economy, Infrastructure, Special
- **Radio buttons** - Select one priority category
- **Affects auto-research** - When no manual selection, picks from priority category
- **Visual feedback** - Highlighted category shows preferred path

#### **Full Tree Button**

```
[OPEN FULL RESEARCH TREE]
```

- Opens full-screen research tree modal
- Shows all techs, connections, requirements
- Click to select research target
- Close button returns to minified view

### Layout Mockup

```
┌─────────────────────────────────────┐
│ Current Research:                   │
│ Advanced Metallurgy ████░░ 45%     │
│                                     │
│ Minified Tree View:                 │
│   ┌───┐   ┌───┐   ┌───┐           │
│   │ ✓ │──▶│ ● │──▶│   │           │
│   └───┘   └───┘   └───┘           │
│  Basic   Advanced  Expert          │
│                                     │
│ Priority: [●] Economy [ ] Military  │
│                                     │
│ [OPEN FULL RESEARCH TREE]          │
└─────────────────────────────────────┘
```

### Decision

**NEW TAB** replaces removed Diplomacy and Trade tabs:

- Consolidates research interface
- Minified view for quick checks
- Full tree for strategic planning
- Category priority for automation

## BOMBERS - NO DEDICATED TAB ❌ REMOVED

### Decision: Tab Completely Removed

**Auto-bombing is always active** - No toggle needed, bombers automatically target nearby enemies

**Manual targeting via radial menu only**:

- Right-click enemy territory to open radial menu
- Select bomber targeting options from context menu
- Choose structure priority (Cities, Military, Economy, All)
- Set or clear manual targets

**Upgrade bombers**:

- **Option 1**: Add to Build tab's "Upgrade Structures" mode (works for airfields)
- **Option 2**: Add dedicated "Upgrade Bombers" button in Build tab
- **Option 3**: Right-click airfield → "Upgrade Bombers" in radial menu

### Why Remove This Tab?

- Auto-bombing doesn't need UI (just always on)
- Manual targeting better in radial menu (contextual to map)
- Upgrade mode can live elsewhere (Build tab or radial menu)
- Saves an entire tab for minimal functionality

### Original Complex Design (Reference)

The original Bombers tab had:

- Player dropdown selection
- Priority toggle (Closest/Furthest)
- 11-structure checkbox grid
- Set Target / Clear buttons
- Auto-bombing on/off toggle
- Upgrade Bombers mode toggle
- Current target display

**All of this removed** - Auto-bombing always on, manual control via radial menu

---

## REMOVED TABS

### ❌ Trade Tab - DELETED

**Reason for Removal**: Too much micro-management detail for IO game pacing

**What was in it**:

- Cargo Ship Monitoring (individual ship tracking)
- Ship status ("in port", "at sea", coordinates)
- Construction progress bars per ship
- Trade Demand calculation
- Embargo All / Remove All buttons

**What's being kept**:

- **Trade Demand Indicator** → Moved to Build tab
  - Simple badge: "Trade Demand: High"
  - Shows if more ports needed
  - Color-coded (red/yellow/green)

**What's being removed entirely**:

- Per-ship tracking and coordinates
- Individual ship status descriptions
- Construction progress per ship
- Embargo management (may add to radial menu if needed later)

---

### ❌ Diplomacy Tab - DELETED

**Reason for Removal**: Takes up full tab for what can be map icons

**What was in it**:

- 3-column layout (At War / Allied / Neutral)
- Per-player action buttons (Declare War, Request Alliance, Request Peace, Betray)
- Bulk action buttons (War All, Ally All, Peace All)
- Player relationship grid

**What's being kept**:

- **Alliance/War status** → Shown as map icons near player names/territories
  - ⚔️ At war icon
  - 🤝 Allied icon
  - No icon = neutral

**What's being removed entirely**:

- Dedicated diplomacy tab
- Bulk action buttons

**Where diplomacy actions go**:

- **Radial menu** on right-click enemy/ally territory
  - Declare War
  - Request Peace
  - Request Alliance
  - Break Alliance
- Faster access than tab switching

---

### ❌ Bombers Tab - DELETED

**Reason for Removal**: Minimal functionality, better handled elsewhere

**What was in it**:

- Auto-bombing on/off toggle
- Manual targeting configuration (player dropdown, structure grid)
- Upgrade Bombers mode toggle
- Status indicators and explanatory text

**What's being kept**:

- **Auto-bombing** → Always active (no toggle needed)
- **Manual targeting** → Via radial menu (right-click enemy territory)
- **Upgrade bombers** → Added to Build tab or radial menu

**Result**: Entire tab removed, all functionality preserved in better locations

### Cargo Ship Monitoring

- **List of Active Ships** - Shows ship ID, status, and coordinates
  - Status descriptions: "in port", "returning to port", "trading between X and Y", "at sea"
  - Coordinates displayed in (x, y) format
- **Under Construction Section** - Shows pending ships being built at ports
  - Progress bars for each ship
  - Port ID and ship number displayed

### Trade Demand Indicator

- **Global demand gauge** - "Very High", "High", "Medium", "Low", "Very Low"
- Color-coded badge
- Calculated from: queued routes vs total ships vs available ships
- Tooltip explains calculation

### Embargo Management

- **Embargo All Button** - Block trade with all players
- **Remove All Embargos Button** - Unblock trade with all players

### Ship Status Computation

- Complex logic to determine ship state from multiple properties
- Tracks: docked status, returning status, trade phase, target unit, route start/end owners

### Assessment

**KEEP CONCEPT, SIMPLIFY DISPLAY**:

**Good for 40min games:**

- Trade creates economic interaction between players
- Embargo system adds diplomatic options
- Construction investment shows growth

**Excessive micro-management:**

- Per-ship tracking (Ship #1, Ship #2, Ship #3...)
- Individual coordinates (45, 67)
- Detailed status text ("traveling to port owned by PlayerX")
- Per-ship progress bars

**RECOMMENDED SIMPLIFICATION**:

```
Active Ships: 5  |  Building: 2 (45%)  |  Demand: High

Ship Activities:
• 3 ships en route
• 2 ships docked

[EMBARGO ALL]  [REMOVE ALL EMBARGOS]
```

**KEEP**:

- Ship counts (active, building)
- Aggregated construction progress
- Demand indicator (helps strategic decisions)
- Embargo buttons

**REMOVE**:

- Individual ship IDs and coordinates
- Per-ship status descriptions
- Phase tracking text
- Per-ship progress bars

**RESULT**: Still shows trade system health, but at strategic level not logistics level

- Before: 10+ lines of individual ship data
- After: 3 lines of summary + 2 action buttons

---

---

## Implementation Checklist

### Phase 1: Remove Features (Week 1)

- [ ] Delete Trade tab component entirely
- [ ] Delete Diplomacy tab component entirely
- [ ] Delete Bombers tab component entirely
- [ ] Remove unit level setter from Attack tab (+/- buttons)
- [ ] Remove "Upgrade Units" button from Attack tab
- [ ] Remove Unit Upgrade Settings Modal
- [ ] Remove road investment slider from Economy tab
- [ ] Remove military expenditure slider from Economy tab
- [ ] Remove lock mechanisms from all sliders
- [ ] Remove break-even indicator from road display
- [ ] Set auto-bombing to always active (remove toggle)

### Phase 2: Add New Features (Week 2)

- [ ] Add Trade Demand indicator to Build tab header
- [ ] Create 3-button choice UI for Production Investment (10%, 25%, 50%)
- [ ] Create 3-button choice UI for Research Investment (10%, 25%, 50%)
- [ ] Add passive road network status display (quality %, completion %, build speed)
- [ ] Create new R&D tab component
- [ ] Implement minified research tree view
- [ ] Add category prioritization buttons
- [ ] Add "Open Full Research Tree" button

### Phase 3: Radial Menu Integration (Week 2-3)

- [ ] Add bomber manual targeting to radial menu
  - [ ] Player selection
  - [ ] Structure priority (4 categories: Cities, Military, Economy, All)
  - [ ] Set/clear target options
- [ ] Add bomber upgrade to radial menu or Build tab
  - [ ] "Upgrade Bombers" option when right-clicking airfield, OR
  - [ ] Include airfields in "Upgrade Structures" mode in Build tab
- [ ] Add diplomacy actions to radial menu
  - [ ] Declare War
  - [ ] Request Peace
  - [ ] Request Alliance
  - [ ] Break Alliance
- [ ] Add alliance/war status icons to map

### Phase 4: Backend Logic Updates (Week 3)

- [ ] Set auto-bombing to always active (no on/off state needed)
- [ ] Auto-build roads at fixed rate when National Reconstruction Program unlocked
- [ ] Remove road investment rate handling
- [ ] Update investment constraint system (now just 100% cap, no auto-balancing)
- [ ] Hook up category prioritization to research system
- [ ] Remove embargo system (or move to radial menu if keeping)
- [ ] Unit levels automatically determined by researched techs (remove manual level selection)
- [ ] When tech unlocked, all existing units of that type upgrade automatically

### Phase 5: Testing & Polish (Week 4)

- [ ] Test 3-button investment choices (can exceed 100%? show warning?)
- [ ] Test auto-bombing (always on) with manual targeting via radial menu
- [ ] Test bomber upgrade via radial menu or Build tab upgrade mode
- [ ] Verify trade demand indicator updates correctly
- [ ] Test minified research tree view interaction
- [ ] Full research tree modal opens/closes correctly
- [ ] Verify alliance/war icons display on map
- [ ] Test category prioritization affects research
- [ ] Polish animations and transitions

---

## Tab Count Comparison

**Before**: 6 tabs (Build, Attack, Economy, Bombers, Trade, Diplomacy)
**After**: 4 tabs (Build, Attack, Economy, R&D)

**Net change**: -2 tabs (33% reduction)

- Removed 3 tabs entirely (Bombers, Trade, Diplomacy)
- Added 1 focused tab (R&D)
- Simplified 1 tab (Economy)
- Kept 2 tabs unchanged (Build, Attack)

---

## UI Complexity Reduction

### Before (Original Design)

- **Economy Tab**: 4 sliders (3 with locks, 1 disabled) + auto-balancing + break-even indicators
- **Bombers Tab**: Player dropdown + priority toggle + 11 checkboxes + confirm button + auto mode
- **Trade Tab**: Per-ship tracking + coordinates + status + progress bars + embargo buttons
- **Diplomacy Tab**: 3-column grid + 4 actions per player + 3 bulk actions
- **Total interactions**: ~50+ clickable elements across 6 tabs

### After (New Design)

- **Economy Tab**: 2 sets of 3 buttons (6 buttons total) + passive road display
- **Build Tab**: +1 trade demand indicator (unchanged otherwise)
- **Attack Tab**: Unit grid + multi-build toggle only (level setter removed, upgrades via tech tree)
- **R&D Tab**: Minified tree + 4 category buttons + 1 full tree button
- **Radial Menu**: Bomber targeting + bomber upgrade + diplomacy actions (context-sensitive)
- **Auto-bombing**: Always on (no UI needed)
- **Unit upgrades**: Automatic via tech tree (no UI needed)
- **Total interactions**: ~18 elements across 4 tabs + radial menu

**Result**: 65% reduction in UI elements, eliminated 3 entire tabs + multiple modals

---

## Global Controls & Features

### Control Panel Header (All Tabs)

- **Statistics Button** - Opens comprehensive game statistics modal
- **Tab Navigation** - 4 tabs with icons and labels (Build, Attack, Economy, R&D)
- **Collapse/Expand** - Panel visibility toggle

### Modals (Overlays)

1. **Build Settings Modal** - Configure default structure levels (kept from Build tab)
2. **Statistics Modal** - View game statistics and metrics
3. **Full Research Tree Modal** - Opened from R&D tab (new)

**Removed Modals**:

- ❌ **Unit Upgrade Settings Modal** - No longer needed (unit levels from tech tree)

### Radial Menu (Right-Click Context Menu)

**New centralized interaction point**:

- **Bomber Targeting** (right-click enemy territory)
  - Select player
  - Choose structure priority (Cities, Military, Economy, All)
  - Set or clear target
- **Bomber Upgrade** (right-click airfield)
  - Upgrade bombers at this airfield
  - OR include airfields in Build tab "Upgrade Structures" mode
- **Diplomacy Actions** (right-click any territory)
  - Declare War
  - Request Peace
  - Request Alliance
  - Break Alliance
- **Standard Actions** (right-click own territory)
  - Build structure
  - Upgrade structure
  - Other context actions

### Map Overlays

- **Alliance/War Status Icons** - Shows relationship near player names
  - ⚔️ Red crossed swords = At War
  - 🤝 Green handshake = Allied
  - No icon = Neutral
- **Trade Demand** - May show on ports if high demand

---

## OVERALL ASSESSMENT (For In-Depth IO Game)

### Biggest Problems for 40-Minute Games

#### 1. **TOO MANY MODALS** (Still a Problem)

- Build Settings Modal
- Unit Upgrade Settings Modal
- Statistics Modal
- **Why it's bad**: Breaks flow, hides critical info during fast-paced 40min session
- **Fix**: Make settings inline OR one unified "Advanced Settings" modal, not 3 separate ones

#### 2. **MICRO-MANAGEMENT FRICTION** (Pacing Problem)

- Setting individual unit levels with +/- buttons
- Per-ship trade monitoring with coordinates
- 11-checkbox bomber targeting grid
- **Why it's bad**: These slow down decision-making; 40min games need faster choices
- **Fix**: Defaults should be smart, overrides should be quick (dropdown not checkboxes)

#### 3. **UNCLEAR INFORMATION HIERARCHY** (Learning Curve Problem)

- Road quality vs completion vs break-even
- Trade demand calculation (queued routes vs available ships)
- Which slider matters most?
- **Why it's bad**: New players need to understand basics in 2-3 minutes, not 10
- **Fix**: Show most important metric prominently, hide calculations/details

#### 4. **PLACEHOLDER FEATURES** (UI Clutter)

- Military Expenditure slider (disabled)
- **Why it's bad**: Takes up space, confuses new players ("why can't I use this?")
- **Fix**: Remove entirely until implemented

### What Fits In-Depth IO (40min sessions)

**CORE MECHANICS (Keep, Refine)**
✅ **Build Tab** - Structure placement is essential

- Keep 11 structure types (varied strategy is good)
- Keep multi-build and upgrade mode
- **Simplify**: Remove Build Settings modal, make level-setter more prominent

✅ **Attack Tab** - Military production is essential

- Keep 6 unit types (nuclear + conventional warfare)
- Keep multi-build
- **Simplify**: Remove Unit Upgrade modal, use inline defaults

✅ **Economy Tab** - Investment creates strategic depth

- Keep Production, Road, Research sliders (3 is fine for depth)
- **Remove**: Military Expenditure placeholder
- **Simplify**: Remove lock mechanisms (too fiddly), keep auto-balancing
- **Simplify**: Remove break-even indicator (too detailed), keep quality/completion %

✅ **Diplomacy Tab** - War/peace/alliance is core

- Keep 3-state system
- Keep bulk actions (useful in 40min games for quick shifts)
- **Maybe add**: Treaty details/benefits shown inline

**STRATEGIC FEATURES (Simplify, Keep)**
⚠️ **Bombers Tab** - Strategic bombing adds depth

- **Keep**: Auto-bombing mode
- **Simplify manual mode**:
  - Keep player dropdown
  - Replace 11 checkboxes with simple priority dropdown: "Cities", "Military", "Economy", "All"
  - Remove closest/furthest toggle (just use closest)
- **Keep**: Upgrade Bombers mode

⚠️ **Trade Tab** - Economic interaction adds depth

- **Keep**: Cargo ship concept
- **Simplify display**: "Active Ships: 5 | Building: 2 | Demand: High"
- **Remove**: Individual ship tracking, coordinates, status text
- **Keep**: Construction progress (combined into one bar: "2 ships building: 45% avg")
- **Keep**: Embargo All / Remove All buttons

**INFORMATION FEATURES (Consolidate)**
⚠️ **Statistics Modal**

- Keep ONE modal for detailed info/stats
- **Consider**: Make it always-visible side panel option instead of modal?

---

## Recommendations Priority (For 40min In-Depth IO)

### CRITICAL (Do Immediately)

1. **Remove Military Expenditure slider** - disabled placeholder clutters UI
2. **Consolidate modals** - 3 settings modals → 1 unified settings panel
3. **Simplify bomber targeting** - replace 11 checkboxes with 4-option dropdown ("Cities", "Military", "Economy", "All")
4. **Remove slider lock mechanisms** - adds complexity without clear benefit in 40min games
5. **Simplify trade display** - "Ships: 5 active, 2 building (45%)" instead of per-ship tracking

### HIGH PRIORITY (Do Soon)

6. **Remove break-even indicator on road slider** - keep quality %, remove calculation line
7. **Remove closest/furthest toggle on bombers** - just use closest (simpler)
8. **Make level setters more prominent** - +/- buttons are small and fiddly
9. **Remove individual ship status tracking** - coordinates, "at sea", phase descriptions
10. **Add tooltips** - Quick help on hover for all sliders/buttons (critical for new players)

### MEDIUM PRIORITY (Quality of Life)

11. **Consolidate construction progress** - Show combined progress bar for all pending ships
12. **Smart defaults** - New structures/units should default to max available level
13. **Visual feedback** - Better highlighting when modes are active (upgrade mode, multi-build)
14. **Bulk actions confirmation** - "Declare war on all" should confirm ("This will declare war on 8 players. Continue?")

### LOW PRIORITY (Nice to Have)

15. **Statistics modal as side panel** - Make it dockable rather than popup
16. **Hotkeys** - Tab switching (1-6), quick actions (M for multi-build, U for upgrade)
17. **Preset strategies** - "Economic Focus" button that sets sliders to 0/25/25 (prod/road/research)
18. **Color-code tabs** - Build=green, Attack=red, Economy=gold, helps visual scanning

---

## Complexity Budget Analysis

**For 40-minute games, you have budget for:**

- ✅ 6 tabs (navigation is fine)
- ✅ 11 structures + 6 units (variety creates replayability)
- ✅ 3 investment sliders (strategic choices)
- ✅ Diplomacy with 3 states (war/ally/neutral)
- ⚠️ Bomber system (but needs simplification)
- ⚠️ Trade system (but needs simplification)
- ❌ 3 separate settings modals (too much friction)
- ❌ Per-entity micromanagement (ships, individual coordinates)
- ❌ Lock mechanisms and break-even calculations (too detailed)

**Time Budget Breakdown (estimated player attention):**

- Minutes 0-5: Learning controls, building first structures → **UI must be instantly clear**
- Minutes 5-15: Early expansion, first conflicts → **Quick decisions matter**
- Minutes 15-30: Mid-game strategy, diplomacy shifts → **Investment pays off**
- Minutes 30-40: End-game, victory push → **No time for micro-management**

**Your current UI works for minutes 15-30, but creates friction at 0-5 and 30-40.**

---

## Specific Feature Recommendations

### Economy Tab - KEEP BUT STREAMLINE

**Current:** 4 sliders, locks, break-even, quality %, completion %
**Recommended:**

```
Production Investment: [====----] 40%
  └─ Productivity: 85% (+2.1%/min)

Road Investment: [==------] 20%  🔓 Unlocked at Research Lvl 3
  └─ Network: Quality 92% · Complete 67%

Research Investment: [===-----] 30%
  └─ Current: Advanced Metallurgy (45%)
```

- Remove Military Expenditure entirely
- Remove lock mechanisms (auto-balancing is enough)
- Remove break-even indicator
- Keep quality/completion (meaningful metrics)
- Add current research name (helps players see what they're investing in)

### Bombers Tab - KEEP BUT SIMPLIFY

**Current:** Player dropdown + closest/furthest + 11 checkboxes + confirm
**Recommended:**

```
Target Player: [Dropdown v]
Target Priority: [Cities v]  ← dropdown with 4 options
  Options: Cities | Military | Economy | All Structures

[SET TARGET]  [CLEAR]
```

- Remove closest/furthest (always use closest)
- Replace 11 checkboxes with 4-option dropdown
- Keep manual + auto modes (strategic choice is good)
- Keep upgrade bombers toggle

**Priority Mapping:**

- "Cities" → City, Hospital, Academy
- "Military" → Defense Post, SAM Launcher, Missile Silo, Airfield
- "Economy" → Factory, Research Lab, Port, Doomsday Device
- "All Structures" → Everything

### Trade Tab - KEEP BUT AGGREGATE

**Current:** Per-ship tracking, coordinates, status, individual progress bars
**Recommended:**

```
CARGO SHIPS
Active: 5  |  Building: 2 (45% complete)  |  Demand: ⚠️ High

[Ship Status Overview]
• 3 ships en route
• 2 ships in port
• 2 ships under construction (avg 45%)

Trade Demand: High
  └─ More ships needed to satisfy trade routes

[EMBARGO ALL]  [REMOVE ALL EMBARGOS]
```

- Remove individual ship IDs, coordinates, detailed status
- Show aggregated counts and simple categories
- Keep construction progress (combined/averaged)
- Keep demand indicator (useful strategic info)
- Keep embargo buttons

### Build/Attack Tabs - KEEP BUT REFINE

**Current:** Multi-build + level setter + upgrade mode + settings modal
**Recommended:**

- Keep multi-build toggle
- Make level setter default to MAX (let players decrement if needed)
- Remove settings modals, put defaults in main tab:
  ```
  Default Levels: [Max v]  ← dropdown: Max | Level 3 | Level 1
  ```
- Keep upgrade mode toggle
- Add visual indicator when modes are active (border glow?)

---

## Testing Questions for Each Feature

Before implementing changes, ask:

1. **Can a new player understand this in 10 seconds?**
   - Economy sliders: Probably yes
   - 11-checkbox bomber grid: NO
   - 3 separate modals: NO

2. **Does this decision matter in a 40-minute game?**
   - Production investment: YES (growth compounds)
   - Setting individual ship coordinates: NO (too granular)
   - Bomber target priority: YES (strategic choice)

3. **Can this be decided in under 5 seconds during gameplay?**
   - Clicking one embargo button: YES
   - Configuring 11 checkboxes: NO
   - Choosing from 4-option dropdown: YES

4. **Does removing this hurt strategic depth?**
   - Remove lock mechanisms: NO (auto-balance does same job)
   - Remove bomber targeting: YES (would hurt strategy)
   - Simplify bomber to 4 priorities: NO (still strategic)

5. **Is this information or noise?**
   - Road quality %: INFORMATION (affects gameplay)
   - Break-even line: NOISE (calculation detail)
   - Ship #3 is at coordinates (45, 67): NOISE (micro detail)

---

## Summary: Keep the Depth, Cut the Friction

**Your goal of "in-depth IO game with 40min sessions" is achievable**, but you need to distinguish between:

### Strategic Depth (KEEP) ✅

- Multiple paths to victory (military, economic, diplomatic)
- Investment decisions with compounding returns
- Varied unit/structure types (11 structures, 6 units is fine)
- Bomber targeting strategy
- Trade and embargo mechanics
- Tech progression (road unlock, research)

### Micro-Management Friction (CUT) ❌

- 3 separate settings modals
- Lock mechanisms on sliders
- 11-checkbox targeting grids
- Per-entity tracking (individual ships)
- Break-even calculation indicators
- Disabled placeholder features

### The Golden Rule

**"Can this decision be made in under 5 seconds during a tense mid-game moment?"**

- ✅ "Set bombers to target Military structures" → YES (with dropdown)
- ❌ "Configure 11 checkboxes for bomber targeting" → NO (too slow)
- ✅ "Increase research investment to 30%" → YES (slider)
- ❌ "Lock research slider, unlock production slider" → NO (too fiddly)
- ✅ "Embargo all players" → YES (one button)
- ❌ "Check coordinates of Ship #3" → NO (irrelevant detail)

---

## Implementation Priority

**Week 1: Remove Friction (Quick Wins)**

- Delete Military Expenditure slider
- Delete lock mechanisms from sliders
- Delete break-even indicator
- Consolidate 3 modals into 1 or inline settings

**Week 2: Simplify Interactions**

- Replace 11-checkbox bomber grid with 4-option dropdown
- Aggregate trade ship display
- Default structure/unit levels to MAX
- Remove closest/furthest bomber toggle

**Week 3: Polish & Feedback**

- Add tooltips everywhere
- Add confirmation dialogs for bulk actions
- Improve visual feedback (active mode highlighting)
- Add hotkeys for common actions

**Result:** Same strategic depth, 50% less clicking, 3x faster onboarding

**Target**: More strategic depth than typical IO games, but games should complete in ~40 minutes

This changes the recommendations - you can keep MORE complexity than basic IO, but still need to cut significantly for pacing.

**"In-Depth IO" Reference Points:**

- Territorial.io - has diplomacy, territory control
- Starve.io - has crafting, base building, survival
- Zombs.io - has base building, wave defense, upgrades
- These games: 20-40 min sessions, moderate complexity, still accessible

**Your game can support:**

- Multiple strategic paths (economic, military, diplomatic)
- Investment/growth mechanics
- Tech tree / upgrades
- Trade and alliances
- BUT: Must be learnable in first 5 minutes, decisions must matter quickly
