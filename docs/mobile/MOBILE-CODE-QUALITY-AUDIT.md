# Mobile UI Code Quality Audit

**Date:** 2025-07-17  
**Scope:** `src/client/mobile/**` (20 files, ~8 500 lines)  
**Type:** Documentation-only — no runtime changes until explicit "go"

---

## Prioritized Findings

### Critical

| #   | File                                       | Issue                                                                                                                                                                                                          | Why it matters                                                                                           | Minimal-risk fix                                                                                                                                    |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | `overlays/MobileEventsDisplay.ts` L498–505 | **`formatTimeAgo()` treats 1 tick = 1 second** — engine runs ~10 ticks/s (confirmed in `src/core/game/RoadManager.ts` L690). All relative timestamps display **10× too fast** ("60s ago" is really 6s ago).    | Players see wildly inaccurate event ages on the mobile Events display.                                   | Divide `ticksAgo` by 10 (or import a `TICKS_PER_SECOND` constant from core).                                                                        |
| C-2 | `MobileDetector.ts` L88–102                | **`getSafeAreaInsets()` is broken.** Reads `getPropertyValue("env(safe-area-inset-top)")` — `env()` is a CSS function, not a custom property name, so `getPropertyValue` always returns `""` → all insets = 0. | Notched-device padding will never be applied (currently unused but will mis-fire if anyone wires it up). | Read using a real CSS custom property set from `env()` in a root style rule, or remove the method and use CSS `env()` directly in component styles. |

### High

| #   | File                                                     | Issue                                                                                                                                                                                                                        | Why it matters                                                                                           | Minimal-risk fix                                                                           |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| H-1 | `MobileTopBar.ts` L403–412                               | **setTimeout leak — no `disconnectedCallback`.** `handleStatsClick()` fires a bare 3 000 ms `setTimeout`; rapid taps queue multiple timers. If the element is removed while a timer is pending, it fires on a detached node. | Memory/state leak on teardown; stacked timeouts cause flickering details tooltip.                        | Store the timer ID; clear it on re-tap and in a new `disconnectedCallback`.                |
| H-2 | `overlays/MobilePlayerToast.ts`                          | **No `disconnectedCallback`.** `autoHideTimeout` (setTimeout) is not cleared if the toast element is removed from the DOM while visible.                                                                                     | Timer fires on a detached element — minor leak, possible console error.                                  | Add `disconnectedCallback`, clear `autoHideTimeout`.                                       |
| H-3 | `MobileActionGrid.ts` L1091–1113, L1208–1230, L1317–1339 | **Nuke action blocks duplicated ×3.** Identical `canLaunchNuke` + push logic for atom / hbomb / mirv is copy-pasted across `getEnemyCanAttackActions`, `getEnemyCanBoatAttackActions`, and `getEnemyNoAttackActions`.        | Maintenance hazard — any nuke balance change or new nuke type requires editing three places identically. | Extract a `pushNukeActions(actions, myPlayer, game)` helper called from all three methods. |
| H-4 | `MobileActionGrid.ts`                                    | **Diplomacy action blocks duplicated ×3.** Alliance/betray/break-alliance logic is repeated across the same three enemy-action methods.                                                                                      | Same duplication risk as H-3.                                                                            | Extract `pushDiplomacyActions(actions, myPlayer, targetPlayer, game)`.                     |
| H-5 | `overlays/MobileResearchPriorityModal.ts` L320–332       | **`getOrCreateToast()` appends `<mobile-research-priority-toast>` to body but never removes it.** Element persists in the DOM forever (or until page unload).                                                                | DOM leak — one orphaned element per first use; harmless in practice but violates teardown hygiene.       | Remove the toast in `disconnectedCallback`, or let MobileUI own the toast lifecycle.       |

### Medium

| #   | File                                                                                                                      | Issue                                                                                                                                                                                                                                         | Why it matters                                                                                                        | Minimal-risk fix                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-1 | `MobileUI.ts` L942–1008, L1810                                                                                            | **7 empty event-handler bodies.** Listeners like `overlay-closed`, `sidebar-closed`, `player-selected`, and `handleOrientationChange` contain only a comment (`// Economy overlay closed`) and no actual logic.                               | Dead code that obscures intent — unclear if logic was intentionally omitted or accidentally deleted.                  | Either add the intended behavior or remove the handler + listener registration. Add a `// intentionally empty` comment if the handler exists only for future use. |
| M-2 | `overlays/MobileEventsDisplay.ts` L206, L304                                                                              | **Dead method `onAllianceRequestEvent`.** Its registration in `updateMap` is commented out, but the 15-line method body still exists.                                                                                                         | Unreachable code increasing file size and confusion.                                                                  | Delete the method body.                                                                                                                                           |
| M-3 | `MobileDetector.ts` L107–121                                                                                              | **Dead method `getContextButtonSize()`.** Defined but never called anywhere in the codebase.                                                                                                                                                  | Unreachable code.                                                                                                     | Delete or mark `@deprecated` if planned for future use.                                                                                                           |
| M-4 | `MobileActionGrid.ts` L908–915                                                                                            | **`getOwnShoreActions()` is a pure passthrough** to `getOwnLandActions()`. There is no shore-specific logic.                                                                                                                                  | Misleading API surface — suggests shore has custom behavior when it doesn't. Adds an extra call-frame per shore tile. | Inline the call at the call-site (L708) or leave with a `// see M-4: intentional delegation` comment.                                                             |
| M-5 | `overlays/MobileTechUnlockToast.ts`, `overlays/MobileResearchPriorityModal.ts`, `overlays/MobileResearchPriorityToast.ts` | **Identical `getAttackBarBottom()` / `updateTopOffset()` / `startRepositionLoop()` / `stopRepositionLoop()` pattern copied across 3 files.** Each queries `<mobile-attack-bar>` element rect and runs a `setInterval(180ms)` reposition loop. | Triplicated positioning logic — any change to attack bar layout requires editing three files.                         | Extract into a shared mixin or utility function (e.g., `AttackBarPositionMixin` or `positionBelowAttackBar(el, basePx, gapPx)`).                                  |
| M-6 | `MobileActionGrid.ts` L492–500                                                                                            | **`formatNumber()` duplicates `renderNumber()` from `src/client/Utils.ts`**, but with less precision (simple 1K/1M thresholds vs Utils' tiered formatting).                                                                                   | Inconsistent number display between mobile action grid and rest of the app.                                           | Import and use `renderNumber()` from `src/client/Utils.ts`.                                                                                                       |

### Low

| #   | File                                | Issue                                                                                                                                                                                                                                                                                                      | Why it matters                                                                                                                                          | Minimal-risk fix                                                                                              |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| L-1 | `gestures/GestureDetector.ts` L201  | **`isEdgeTouch(changedTouch)` checks end position on touchEnd**, but the real gate is `touchStartPos.x < EDGE_THRESHOLD` a few lines later. The end-position check is redundant — a finger that starts at the edge and ends in the center would fail the `isEdgeTouch(changedTouch)` guard and never fire. | Subtle logic: swipe gesture could silently fail if finger moves past the edge zone. Not currently a visible bug because fast swipes stay near the edge. | Remove the `isEdgeTouch(changedTouch)` guard on L201 — the start-position checks on L204/L213 are sufficient. |
| L-2 | `gestures/GestureDetector.ts`       | **`NodeJS.Timeout` type used for browser `setTimeout`.** Works at runtime but is technically the wrong type domain.                                                                                                                                                                                        | Minor TypeScript hygiene issue.                                                                                                                         | Use `ReturnType<typeof setTimeout>` or `number`.                                                              |
| L-3 | `components/MobileSettingsPanel.ts` | **`handleExitGame()` uses `window.confirm()`** — blocking synchronous dialog, not mobile-friendly.                                                                                                                                                                                                         | Poor UX on mobile — confirm() renders inconsistently and blocks the main thread.                                                                        | Replace with a custom in-app confirmation modal. Low priority since it works.                                 |
| L-4 | `overlays/MobileEconomyOverlay.ts`  | **Fragile rounding workaround** in `handleAttackRatioChange`: `if (ratio === 0.11 && this.attackRatio === 0.01) ratio = 0.1`.                                                                                                                                                                              | Floating-point comparison is inherently fragile; future slider range changes could break the condition.                                                 | Use epsilon comparison or rounding to nearest step.                                                           |
| L-5 | `overlays/MobileIntelSidebar.ts`    | **`getLeaderboardData()` recomputes full leaderboard on every render.** Iterates all players, sorts, and slices.                                                                                                                                                                                           | Performance concern for large lobbies (50+ players). Acceptable for current typical lobby sizes (<20).                                                  | Cache leaderboard data and recompute only when tick changes. Low priority.                                    |
| L-6 | `components/MobileResearchPanel.ts` | **`handleCategoryPrioritize` emits individual events per tech.** Toggling a category with 8 techs fires 8 separate custom events.                                                                                                                                                                          | Burst of events could cause 8 re-renders upstream. Acceptable if consumer batches.                                                                      | Consider emitting a single batch event with all tech IDs.                                                     |

---

## Quick Wins

Items that are safe, self-contained, and can be done in isolation with minimal regression risk:

1. **C-1 — Fix `formatTimeAgo` tick rate** (~5 min). Divide by 10 or use constant. Single-line change.
2. **H-1 — Add timer cleanup to MobileTopBar** (~10 min). Store timeout ID, clear on re-tap and in `disconnectedCallback`.
3. **H-2 — Add `disconnectedCallback` to MobilePlayerToast** (~5 min). Clear `autoHideTimeout`.
4. **M-2 — Delete dead `onAllianceRequestEvent`** (~2 min). Remove method and commented registration.
5. **M-3 — Delete dead `getContextButtonSize`** (~2 min). Remove method.
6. **M-6 — Replace `formatNumber` with `renderNumber`** (~5 min). Import from Utils, delete local copy.
7. **L-2 — Fix `NodeJS.Timeout` type** (~1 min). Change to `ReturnType<typeof setTimeout>`.

**Estimated total: ~30 min for all quick wins.**

---

## Do Not Change Yet

These items need design discussion or broader coordination before acting:

| #                                   | Reason to hold                                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-2 (`getSafeAreaInsets`)           | Method is currently unused — no call-sites. Fixing it requires deciding the CSS custom-property approach AND creating actual CSS rules with `env()`. Better handled as part of a dedicated notch-support pass. |
| M-1 (empty handlers)                | Each empty handler may be intentionally reserved for future features (overlay close analytics, player-select navigation, orientation-responsive layout). Need product intent before removing.                  |
| M-5 (reposition pattern extraction) | Touching 3 files simultaneously increases risk. Best done with a dedicated test pass to verify toast/modal positioning after refactor.                                                                         |
| H-3/H-4 (nuke/diplomacy dedup)      | MobileActionGrid is 1 700 lines — large refactors here risk subtle action-availability regressions. Recommend pairing with manual QA on all tile categories.                                                   |
| L-3 (`confirm()` replacement)       | Requires designing and building a reusable mobile confirmation modal component — out of scope for a hygiene pass.                                                                                              |
| L-5 (leaderboard caching)           | No observed performance issue at current lobby sizes. Premature optimization.                                                                                                                                  |

---

## Implementation Order

Recommended sequencing for a future fix pass:

```
Phase 1 — Quick wins (safe, isolated, no cross-file deps)
  ├── C-1  Fix formatTimeAgo tick rate
  ├── H-1  MobileTopBar timer cleanup + disconnectedCallback
  ├── H-2  MobilePlayerToast disconnectedCallback
  ├── M-2  Delete dead onAllianceRequestEvent
  ├── M-3  Delete dead getContextButtonSize
  ├── M-6  Replace formatNumber with renderNumber
  └── L-2  Fix NodeJS.Timeout type

Phase 2 — Moderate refactors (single-file, need light testing)
  ├── H-5  Toast DOM cleanup in MobileResearchPriorityModal
  ├── M-4  Inline getOwnShoreActions
  └── L-4  Fix attackRatio rounding

Phase 3 — Multi-file refactors (need QA pass)
  ├── H-3  Extract pushNukeActions helper
  ├── H-4  Extract pushDiplomacyActions helper
  └── M-5  Extract reposition loop utility

Phase 4 — Design-dependent (need product input)
  ├── C-2  Fix or remove getSafeAreaInsets
  ├── M-1  Resolve empty event handlers
  ├── L-3  Replace confirm() with mobile modal
  ├── L-5  Cache leaderboard data
  └── L-6  Batch research priority events
```

---

## Validation Checklist

After each phase, run:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test` — all tests pass
- [ ] Manual mobile QA on Chrome Android + Safari iOS:
  - Tap all action grid categories (own land, shore, water, enemy, neutral, spawn)
  - Open/close all sidebars and overlays
  - Trigger nuke actions with sufficient/insufficient gold
  - Verify event timestamps display correctly
  - Verify toast/notification positioning under attack bar
  - Long-press → player toast → verify auto-dismiss
  - Toggle stats detail in top bar rapidly

---

## File Inventory

| File                             | Lines | Has `disconnectedCallback` | Timers/RAF           | Status                |
| -------------------------------- | ----- | -------------------------- | -------------------- | --------------------- |
| `MobileUI.ts`                    | 1 862 | N/A (not LitElement)       | RAF stats loop       | ⚠️ M-1                |
| `MobileActionGrid.ts`            | 1 700 | No (no timers)             | RAF in `showForTile` | ⚠️ H-3, H-4, M-4, M-6 |
| `MobileDetector.ts`              | 122   | N/A (static class)         | None                 | ⚠️ C-2, M-3           |
| `MobileTopBar.ts`                | 429   | **No**                     | setTimeout           | 🔴 H-1                |
| `GestureDetector.ts`             | 332   | N/A (`destroy()`)          | setTimeout           | ⚠️ L-1, L-2           |
| `HapticFeedback.ts`              | 120   | N/A (static)               | None                 | ✅ Clean              |
| `Icons.ts`                       | 90    | N/A (static)               | None                 | ✅ Clean              |
| `MobileEconomyOverlay.ts`        | 806   | ✅ Yes                     | Event listener       | ⚠️ L-4                |
| `MobileIntelSidebar.ts`          | 756   | No (no timers)             | None                 | ⚠️ L-5                |
| `MobilePlayerToast.ts`           | 563   | **No**                     | setTimeout           | 🔴 H-2                |
| `MobileAttackBar.ts`             | 625   | ✅ Yes                     | setInterval          | ✅ Clean              |
| `MobileEventsDisplay.ts`         | 601   | No (no timers)             | None                 | 🔴 C-1, M-2           |
| `MobileAllianceNotifications.ts` | 492   | No (no timers)             | None                 | ✅ Clean              |
| `MobileChatEmojiBar.ts`          | 280   | No (no timers)             | None                 | ✅ Clean              |
| `MobileTechUnlockToast.ts`       | 300   | ✅ Yes                     | setInterval          | ⚠️ M-5                |
| `MobileResearchPanel.ts`         | 668   | ✅ Yes                     | setInterval          | ⚠️ L-6                |
| `MobileSettingsPanel.ts`         | 428   | No (no timers)             | None                 | ⚠️ L-3                |
| `MobileResearchSidebar.ts`       | 220   | No (no timers)             | None                 | ✅ Clean              |
| `MobileSettingsSidebar.ts`       | 230   | No (no timers)             | None                 | ✅ Clean              |
| `MobileResearchPriorityModal.ts` | 386   | ✅ Yes                     | setInterval          | ⚠️ H-5, M-5           |
| `MobileResearchPriorityToast.ts` | 252   | ✅ Yes                     | setInterval          | ⚠️ M-5                |
