# Desktop Component Inventory

**Purpose:** Quick reference for existing desktop UI components that mobile needs to replace/adapt  
**Last Updated:** February 9, 2026

---

## Core UI Components

| Component                | Path                                            | Purpose                   | Key Features                                            | Mobile Equivalent          |
| ------------------------ | ----------------------------------------------- | ------------------------- | ------------------------------------------------------- | -------------------------- |
| **RadialMenu.ts**        | `src/client/graphics/layers/RadialMenu.ts`      | Right-click context menu  | 6 slots + center button (D3 pie), uses PlayerActions    | Attack/Diplomacy popups    |
| **ControlPanel.ts**      | `src/client/graphics/layers/ControlPanel.ts`    | Status bar + attack ratio | Attack ratio slider, troop ratio, build panel toggle    | Build popup                |
| **ControlPanel2.ts**     | `src/client/graphics/layers/ControlPanel2.ts`   | Build/Attack/Economy tabs | Build menu, multi-build, stack mode, investment sliders | Economy overlay            |
| **ResearchTreeModal.ts** | `src/client/ResearchTreeModal.ts`               | Technology tree           | CSS Grid (4 categories), multi-priority toggles         | Research sidebar           |
| **GameLeftSidebar.ts**   | `src/client/graphics/layers/GameLeftSidebar.ts` | Players panel             | Embeds Leaderboard + TeamStats toggle                   | Intel sidebar              |
| **TopBar.ts**            | `src/client/graphics/layers/TopBar.ts`          | Compact mobile info bar   | Population + gold (visible < lg breakpoint)             | Mobile top bar             |
| **Leaderboard.ts**       | `src/client/graphics/layers/Leaderboard.ts`     | Player rankings           | Sortable columns, click to focus                        | Reused in Intel sidebar    |
| **EventsDisplay.ts**     | `src/client/graphics/layers/EventsDisplay.ts`   | Event feed                | War/peace/alliance notifications                        | Reused in Intel sidebar    |
| **OptionsMenu.ts**       | `src/client/OptionsMenu.ts`                     | Game settings             | Volume, quit, etc.                                      | Reused (triggered from ⚙️) |

---

## RadialMenu (6 Slots + Center) - Critical for Mobile Migration

**Desktop behavior:** Right-click tile → D3 pie menu with 6 slices + center button

**Slot enum:** `enum Slot { Info, Boat, Ally, Peace, AirAttack, Bomber }`  
**Center button:** Ground Attack (sword icon)

| Slot               | Icon           | Trigger Condition                      | Action             | Event Emitted                                                |
| ------------------ | -------------- | -------------------------------------- | ------------------ | ------------------------------------------------------------ |
| **Center (Sword)** | Ground Attack  | Enemy land selected                    | Attack with troops | `SendAttackIntentEvent(targetID, troops)`                    |
| **Boat**           | Transport Ship | Enemy coastal selected + you have port | Naval assault      | `SendBoatAttackIntentEvent(targetID, dst, troops, src)`      |
| **AirAttack**      | Paratrooper    | Enemy land + airfield + Jet Engines    | Air strike         | `SendParatrooperAttackIntentEvent(targetID, dst, troops)`    |
| **Bomber**         | Bomber Run     | Enemy structures + airfield in range   | Destroy structures | `SendBomberIntentEvent(targetID, structures, preferClosest)` |
| **Ally (Green)**   | Propose Ally   | Neutral/non-allied selected            | Alliance request   | `SendAllianceRequestIntentEvent(requestor, recipient)`       |
| **Ally (Red)**     | Break Alliance | Allied player selected                 | End alliance       | `SendBreakAllianceIntentEvent(requestor, recipient)`         |
| **Peace (Dove)**   | Request Peace  | Enemy selected + at war                | Peace offer        | `SendPeaceRequestIntentEvent(requestor, recipient)`          |
| **Peace (War)**    | Declare War    | Ally/neutral selected + not at war     | War declaration    | `SendDeclareWarIntentEvent(requestor, recipient)`            |
| **Info**           | View Intel     | Any player selected                    | Show stats         | Opens player info overlay                                    |

**Validation:** Uses `myPlayer.actions(tile)` which returns `PlayerActions` with availability flags like `canAttack`, `canSendAllianceRequest`, `canBreakAlliance`, `canRequestPeace`, `canDeclareWar`.

**Mobile strategy:** Split into Attack popup (⚔️ button) and Diplomacy popup (🤝 button) based on tile selection.

---

## ControlPanel.ts - Status Bar & Attack Ratio

**Desktop behavior:** Top bar with attack ratio slider + troop ratio + build panel toggle

**Key methods/properties:**

- `attackRatio` → Stored in `UIState.attackRatio` + localStorage
- `onAttackRatioChange(ratio)` → Updates UIState
- `onTroopChange(ratio)` → Emits `SendSetTargetTroopRatioEvent`
- `onInvestmentRateChange(rate)` → Emits `SendSetInvestmentRateEvent`
- `toggleBuildPanel()` → Emits `ToggleBuildPanelEvent`

**Events emitted:**

- `SendSetTargetTroopRatioEvent(ratio)`
- `SendSetInvestmentRateEvent(rate)`
- `ToggleBuildPanelEvent(isOpen)`

**Mobile adaptation:** Attack ratio via long-press ⚔️ button

---

## ControlPanel2.ts - Build/Attack/Economy Tabs

**Desktop behavior:** Tabbed panel with 3 tabs: **Build, Attack, Economy**

**Build Tab:**

- Structure build menu (City, Port, Airfield, etc.)
- Multi-build toggle (`uiState.multibuildEnabled`)
- Stack mode toggle (`uiState.upgradeMode`)
- Stack count controls
- Active trade ships display

**Attack Tab:**

- Attack unit build menu (nukes, warships, etc.)
- Multi-build toggle
- **Nuclear weapons appear HERE** (Atom Bomb, H-Bomb, MIRV in build list)

**Economy Tab:**

- **Production slider** (0 to `maxInvestmentRate`, typically 50%)
- **Road slider** (0-50%)
- **Research slider** (0-50%)
- **Military Expenditure** (always disabled/locked, NYI)
- Lock toggles: double-click slider to lock (prevents auto-adjust)
- **Constraint:** Production + Road + Research ≤ 100%

**Events emitted:**

- `SendSetInvestmentRateEvent(rate)` — production
- `SendSetRoadInvestmentEvent(rate)` — road
- `SendSetResearchInvestmentEvent(rate)` — research
- DOM `CustomEvent(INVESTMENT_SYNC_EVENT)` — slider sync

**Mobile adaptation:** Economy overlay (swipe up from bottom)

---

## ResearchTreeModal.ts - Technology System

**ACTUAL IMPLEMENTATION (NOT D3 TREE):**

**Layout:**

- CSS Grid (2×2 on desktop → 1 column on mobile)
- 4 categories: Land, Sea, Air, Nuclear
- Each category: vertical list of techs

**Tech row structure:**

```
[⭐/☆ Priority Toggle] | Tech Name | Progress Bar (45%) | Cost (500 🧪)
```

**Multi-Priority System:**

- User can prioritize multiple techs simultaneously (Set<string>)
- Beakers split evenly across all prioritized techs
- Example: 5% investment, 3 priorities → 1.67% per tick per tech

**Investment slider:**

- Built into modal header (NOT in ControlPanel2)
- Range: 0-50%
- Includes lock toggle

**Events emitted:**

- `SendResearchTreeSelectIntentEvent(techId)` (toggle priority)
- DOM `CustomEvent(INVESTMENT_REQUEST_EVENT)` (slider change — NOT EventBus)

**Mobile adaptation:** Wrap in sidebar (swipe from right), increase row height 48px→72px

---

## GameLeftSidebar.ts - Intel System

**Desktop behavior:** Left panel with toggle buttons (NOT tabs)

**Components embedded:**

1. **Leaderboard.ts** (main view)
   - Shows all players with stats (cities, gold, troops)
   - Sortable columns
   - Click row → centers map on player's capital
2. **TeamStats.ts** (toggle, team mode only)
   - Visible only in `GameMode.Team` games
   - Toggle button switches between leaderboard and team stats

**Note:** EventsDisplay is a **separate component**, not embedded in GameLeftSidebar.

**Mobile adaptation:**

- Swipe-from-left sidebar (70% screen width)
- Reuse Leaderboard component
- Swipe left to dismiss

---

## Validation Logic Locations

**Build validation:**

- `canBuild(unitType, tile)` → ControlPanel.ts
- Port: Requires 1+ adjacent water tiles
- Airfield: Requires land tile
- Fighter Jet: Requires Airfield + Jet Engines research

**Validation:**

- Uses `myPlayer.actions(tile)` which returns `PlayerActions` object
- `PlayerActions` has: `canAttack`, `buildableUnits`, `interaction.canSendAllianceRequest`, `canBreakAlliance`, `canRequestPeace`, `canDeclareWar`
- Private helpers: `shouldShowAirAttack()`, `shouldShowBomber()` (check upgrades, range, war status)

**Diplomacy validation:**

- `canProposeAlliance(target)` → via `actions.interaction.canSendAllianceRequest`
- `canDeclareWar(target)` → via `actions.interaction.canDeclareWar`

**Research validation:**

- Tech prerequisites → ResearchTreeModal.ts (can still prioritize locked techs)
- No "cancel" action exists (just toggle priority off)

---

## Important: What Desktop Does NOT Have

**No complex features to migrate:**

- ❌ No separate "Target Structure" action (Ground Attack works on structures)
- ❌ No per-building bomber selection (targets all structures, closest first)
- ❌ No nuclear targeting mode (nukes are units in build menu)
- ❌ No route preview for naval assault (instant launch)
- ❌ No attack confirmation dialogs (only for Declare War)
- ❌ No stack mode toggle visible on main UI (exists in ControlPanel2 Build tab — PC-only for mobile)
- ❌ No multi-build toggle in build panel (exists in ControlPanel2 Build/Attack tabs — PC-only for mobile)
- ❌ No research cancellation (only priority toggle)

**Mobile rule:** If desktop doesn't have it visibly, don't add it to mobile.

---

## Component File Paths (for reference)

```
src/client/
├── graphics/layers/
│   ├── RadialMenu.ts           # 770 lines, D3 pie menu
│   ├── ControlPanel.ts         # Status bar, attack ratio
│   ├── ControlPanel2.ts        # 2074 lines, Build/Attack/Economy tabs
│   ├── GameLeftSidebar.ts      # Leaderboard + TeamStats wrapper
│   ├── TopBar.ts               # Compact info bar (population + gold)
│   ├── Leaderboard.ts          # Player rankings
│   ├── EventsDisplay.ts        # Event feed
│   └── BuildMenu.ts            # Build item list (used by ControlPanel2)
├── ResearchTreeModal.ts        # Tech tree (Lit component, CSS Grid)
├── OptionsMenu.ts              # Settings modal
├── Transport.ts                # WebSocket bridge + all event class definitions
├── InputHandler.ts             # Keyboard/mouse input, emits AttackRatioEvent
└── events/
    └── InvestmentEvents.ts     # DOM CustomEvent constants + types
```

**Mobile components will go in:**

```
src/client/mobile/
├── MobileDetector.ts
├── MobileContextButton.ts
├── MobileBuildPopup.ts
├── MobileAttackPopup.ts
├── MobileDiplomacyPopup.ts
├── MobileIntelSidebar.ts
├── MobileResearchSidebar.ts
└── MobileEconomyOverlay.ts
```

---

## Next Steps

- See `REFERENCE-02-GAME-MECHANICS.md` for core game logic rules
- See `REFERENCE-03-PROJECT-SCOPE.md` for boundaries and constraints
- See `REFERENCE-04-EVENT-SYSTEM.md` for complete event emission reference
