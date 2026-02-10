# Mobile UI Handover – Context Action Redesign

**Date:** 2026-02-10  
**Branch:** `responsive-design-magico`  
**Last Commit:** `53fff479` – "fix: mobile gameplay polish"

---

## Commit History (10 commits on this branch)

| #   | Hash       | Description                                                                                                                                                                                                                                                           |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `dedfd622` | **docs:** Created 7 design specs (MOBILE-01 through MOBILE-07) + 5 reference docs + PROGRESS.md tracking. Fixed 70+ errors in docs.                                                                                                                                   |
| 2   | `ecb5bf50` | **Phase 1 – Foundation:** MobileDetector, gesture system (tap/long-press/drag/pinch/swipe), 6-state morphing context button, mobile top bar with stats, viewport meta, haptic feedback, palm rejection.                                                               |
| 3   | `a4a8fd69` | **Phase 2 – Build & Economy:** MobileBasePopup (smart positioning, backdrop dismiss), MobileBuildPopup (land/shore/water aware), MobilePlacementMode overlay, MobileEconomyOverlay (investment sliders with locks), full build→placement→BuildUnitIntentEvent wiring. |
| 4   | `be715d2c` | **Phase 3 – Combat & Warfare:** MobileAttackPopup (9 combat actions: ground/naval/air/bomber/nukes/war/intel), MobileAttackRatioSlider (0-100% troop allocation), MobileUnitActionPopup, all combat events wired.                                                     |
| 5   | `a17a63df` | **Phase 4 – Diplomacy & Intel:** MobileDiplomacyPopup (ally/break/peace), MobileIntelSidebar (Players/Events tabs, swipe-from-left), MobilePlayerToast, player relation detection, leaderboard data.                                                                  |
| 6   | `1ffd6ead` | **Phase 5 – Research & Progression:** MobileResearchSidebar (wraps existing ResearchTreeModal), slide-from-right, 70% width, backdrop dismiss.                                                                                                                        |
| 7   | `34b931a6` | **Phase 6 – Polish & Optimization:** HapticFeedback utility, swipe-down dismiss for popups, SkeletonLoader component, standardized 0.25s animations.                                                                                                                  |
| 8   | `f83bbb82` | **Bug fixes:** Stabilized mobile UI gameplay flow — spawn, expansion, desktop HUD hiding, radial menu disabling.                                                                                                                                                      |
| 9   | `d78f52e1` | **Bug fixes:** Refined build flow — build action parsing (strip "build:" prefix), placement mode exit recursion guard, accurate build costs from game config, default button state to attack, renderNumber formatting, compact toasts.                                |
| 10  | `53fff479` | **Bug fixes:** Enemy attack options (show all actions not just peace), water units (fix broken `.structures()` API call), hide PC top-bar, compact research priority modal, shore port detection via `isShoreline()`, async boat attack via `player.actions()`.       |

## Documentation Created (commit `dedfd622`)

All in `docs/mobile/`:

| File                                 | Purpose                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| `MOBILE-01-CORE-INTERACTIONS.md`     | Gesture system, touch handling, context button states    |
| `MOBILE-02-BUILD-ECONOMY.md`         | Build popup, placement mode, economy overlay design      |
| `MOBILE-03-COMBAT-WARFARE.md`        | Attack popup, troop slider, combat actions design        |
| `MOBILE-04-DIPLOMACY-INTEL.md`       | Diplomacy popup, intel sidebar, player toast design      |
| `MOBILE-05-RESEARCH-PROGRESSION.md`  | Research sidebar, tech tree wrapper design               |
| `MOBILE-06-IMPLEMENTATION.md`        | Implementation plan, phased rollout, architecture        |
| `MOBILE-07-TESTING-QA.md`            | Testing strategy, device matrix, QA checklist            |
| `REFERENCE-00-INDEX.md`              | Index of all mobile docs                                 |
| `REFERENCE-01-DESKTOP-COMPONENTS.md` | Desktop UI component inventory for migration reference   |
| `REFERENCE-02-GAME-MECHANICS.md`     | Game mechanics reference (troops, gold, attacks, builds) |
| `REFERENCE-03-PROJECT-SCOPE.md`      | Scope definition and boundaries                          |
| `REFERENCE-04-EVENT-SYSTEM.md`       | Complete EventBus event catalog with signatures          |

Also: `PROGRESS.md` (root) tracks all work steps with type-check results, and `.github/copilot-instructions.md` has validation workflow requirements.

---

## Current State

The mobile UI has a working but **too-many-clicks** flow:  
`tap tile → tap action button → tap action in popup` = 3 taps per action.

The next phase **removes the floating action button + popup pattern** and replaces it with a **bottom action grid** that appears immediately when a tile is tapped.

---

## Task: Investigate & Implement Bottom Action Grid

### Design Requirements

When a tile is tapped, show a **bottom-anchored grid** of action buttons directly (no intermediate FAB click). Important actions are **larger tiles at the top** of the grid, less important ones are **smaller tiles below**.

### Tile-Type → Actions Matrix

| Tile Context                                           | Actions to Show                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Unconquered land, I have land border**               | Attack (ground)                                                                                                                         |
| **Unconquered land, NO land border (water between)**   | Attack via water (boat)                                                                                                                 |
| **Own land (inland)**                                  | All land build options (City, Hospital, Factory, DefensePost, MissileSilo, Airfield, ResearchLab, Academy, SAMLauncher, DoomsdayDevice) |
| **Own shore (land + adjacent water)**                  | All land build options **+ Port**                                                                                                       |
| **Own water (with Port)**                              | Water units: Warship, Submarine. If Airfield: also FighterJet                                                                           |
| **Enemy land, I border**                               | Attack (ground), Request Alliance, Request Neutral — OR if at peace/allied: Betray & Declare War                                        |
| **Enemy land, NO border at all (not even water)**      | Request Alliance, Request Neutral — OR if at peace/allied: Betray & Declare War                                                         |
| **Enemy land, NO land border but DO border via water** | Attack via water (boat), Request Alliance, Request Neutral — OR if at peace/allied: Betray & Declare War                                |

### Key Implementation Notes

- **Use canvas/sprite icons** for build options (not emoji) — the game already has sprite assets in `resources/sprites/` and icon assets in `resources/icons/`
- Build menu will be busy — acceptable for now, optimize layout later
- **No game logic changes needed** — all actions already work via existing events (`SendAttackIntentEvent`, `SendBoatAttackIntentEvent`, `BuildUnitIntentEvent`, `SendAllianceRequestIntentEvent`, `SendDeclareWarIntentEvent`, etc.)
- Border detection: use `player.actions(tile)` which returns `{ canAttack, buildableUnits[] }` — this is how the PC UI determines available actions
- Boat attack detection: `actions.buildableUnits.find(bu => bu.type === UnitType.TransportShip)` + `bu.canBuild !== false`
- Best port spawn: `myPlayer.bestTransportShipSpawn(tile)` (async)

---

## Key Files to Modify

### Remove/Replace

- `src/client/mobile/MobileContextButton.ts` — the floating action button (FAB), replace with new bottom grid
- `src/client/mobile/popups/MobileBuildPopup.ts` — build popup, merge into grid
- `src/client/mobile/popups/MobileAttackPopup.ts` — attack popup, merge into grid
- `src/client/mobile/popups/MobileDiplomacyPopup.ts` — diplomacy popup, merge into grid
- `src/client/mobile/popups/MobileBasePopup.ts` — base popup class (may no longer be needed)

### Modify

- `src/client/mobile/MobileUI.ts` — **main coordinator**, currently routes through `handleContextButtonClick()` → `handleBuildAction()`/`handleAttackAction()` etc. Rewrite to show bottom grid directly on tile tap via `handleMapTap()` → new `showActionGrid(tile)`
- Current flow in MobileUI.ts:
  - `handleMapTap(position)` → `updateContextButtonForTile(tile)` (sets FAB icon)
  - FAB click → `handleContextButtonClick(state)` → opens popup
  - Popup item click → `handleBuildItemSelected(action)` / `handleAttackItemSelected(action)` / `handleDiplomacyItemSelected(action)`
- New flow should be: `handleMapTap(position)` → `showActionGrid(tile)` which determines tile context and shows appropriate grid

### Reference (don't modify)

- `src/client/Transport.ts` — event classes: `BuildUnitIntentEvent`, `SendAttackIntentEvent`, `SendBoatAttackIntentEvent`, `SendAllianceRequestIntentEvent`, etc.
- `src/client/ClientGameRunner.ts` — lines 580-700 show how desktop handles attack vs boat attack via `player.actions(tile)` and `canBoatAttack()`
- `src/core/game/GameView.ts` — `PlayerView.actions(tile): Promise<PlayerActions>`, `PlayerView.bestTransportShipSpawn(tile)`, `isLand()`, `isShoreline()`, `neighbors()`
- `src/core/game/Game.ts` — `UnitType` enum, `UpgradeType` enum

---

## Architecture Context

- **Lit web components** — all mobile UI uses Lit `@customElement` decorators
- **EventBus** — `this.eventBus.emit(new SomeEvent(...))` triggers server communication via Transport.ts
- **TransformHandler** — `screenToWorldCoordinates(x, y)` converts touch to game tile
- **CSS injection** — MobileUI.ts injects a `<style id="mobile-ui-styles">` tag to hide desktop elements when `body.mobile-ui-enabled` class is set
- **Game state access** — `this.currentGame` is a `GameView`, `this.currentGame.myPlayer()` returns `PlayerView`
- Sprites/icons live in `resources/sprites/` and `resources/icons/`

---

## Existing Event Handlers (keep these, just wire them to the new grid)

From `MobileUI.ts`:

- **Build:** `this.eventBus.emit(new BuildUnitIntentEvent(unitType, tile))`
- **Ground attack:** `this.eventBus.emit(new SendAttackIntentEvent(ownerId, troops))`
- **Boat attack:** `this.eventBus.emit(new SendBoatAttackIntentEvent(ownerId, tile, troops, spawnPort))`
- **Alliance request:** `this.eventBus.emit(new SendAllianceRequestIntentEvent(myPlayer, targetPlayer))`
- **Declare war:** `this.eventBus.emit(new SendDeclareWarIntentEvent(myPlayer, targetPlayer))`
- **Peace request:** `this.eventBus.emit(new SendPeaceRequestIntentEvent(myPlayer, targetPlayer))`
- **Break alliance:** `this.eventBus.emit(new SendBreakAllianceIntentEvent(myPlayer, targetPlayer))`
- **Nuke launch:** `this.eventBus.emit(new BuildUnitIntentEvent(UnitType.AtomBomb, tile))`

---

## Build/Research Requirements (for locking items in grid)

From `MobileBuildPopup.ts` (keep this logic):

- Hospital: needs `UpgradeType.HospitalResearch`
- MissileSilo: needs `UpgradeType.NuclearFission`
- ResearchLab: needs `UpgradeType.ResearchLabResearch`
- SAMLauncher: needs `UpgradeType.SAMLevel1`
- DoomsdayDevice: needs `UpgradeType.DoomsdayDeviceResearch`
- Submarine: needs Port + `UpgradeType.SubmarineResearch`
- FighterJet: needs Airfield + `UpgradeType.JetEngines`

Costs: use `aggregateStructureBuildCost()` from `src/core/game/Costs.ts` — see `MobileBuildPopup.getUnitCost()` for the pattern.
