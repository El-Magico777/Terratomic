# Mobile UI Architecture

> Last updated: 2026-02-12

## Overview

The mobile UI is a touch-first layer that activates when `MobileDetector.isMobile()` returns true (based on `navigator.maxTouchPoints`, `ontouchstart`, or user-agent heuristics). It replaces the desktop right-click/keyboard interactions with gesture-driven components built as **Lit web components** with Shadow DOM encapsulation.

**Total scope:** 13 files, ~5,294 lines under `src/client/mobile/`.

---

## Component Map

```
MobileUI (orchestrator – 998 lines)
├── MobileDetector            — device / orientation detection
├── MobileTopBar              — status bar (pop, gold, menu/research/settings buttons)
├── MobileActionGrid          — bottom sheet with context-aware action tiles (PRIMARY)
│
├── Gestures/
│   └── GestureDetector       — touch-event state machine (tap, double-tap, long-press, drag, pinch, edge-swipe)
│
├── Overlays/  (slide-in panels)
│   ├── MobileEconomyOverlay      — left-slide economy panel (troop ratio, attack ratio, investments)
│   ├── MobileIntelSidebar        — left-slide sidebar (Players leaderboard + Events stub)
│   ├── MobilePlayerToast         — slide-down toast for player info – show() never called
│   ├── MobileResearchSidebar     — right-slide sidebar hosting MobileResearchPanel
│   └── MobileSettingsSidebar     — right-slide sidebar hosting MobileSettingsPanel
│
├── Components/  (embedded panels)
│   ├── MobileResearchPanel       — full research tech tree, investment slider, category filters
│   └── MobileSettingsPanel       — settings toggles, replay save, exit game
│
└── Utils/
    └── HapticFeedback            — navigator.vibrate() wrapper with pattern presets
```

---

## Integration Points

### Entry: `Main.ts`

```
Game join → MobileDetector.isMobile() → mobileUI.setActive(true)
Leave lobby → mobileUI.setActive(false)
```

`MobileUI` instance stored on `window.__MOBILE_UI__` for cross-module access (used by `ClientGameRunner`).

### Game loop: `ClientGameRunner.ts`

Called once after game creation:

```ts
mobileUI.setTransformHandler(renderer.transformHandler);
mobileUI.initializeGestureDetection(canvas);
mobileUI.updateGameState(game);
```

### Input suppression: `InputHandler.ts`

When `document.body.classList.contains("mobile-ui-enabled")`:

- Right-click context menu is suppressed (3 guard checks)

### EventBus events emitted by mobile UI

| Event                              | Triggered by                             |
| ---------------------------------- | ---------------------------------------- |
| `SendSpawnIntentEvent`             | Tap on unclaimed land during spawn phase |
| `BuildUnitIntentEvent`             | Action grid build item selection         |
| `SendAttackIntentEvent`            | Action grid attack with troops           |
| `SendBoatAttackIntentEvent`        | Action grid naval attack                 |
| `SendBomberIntentEvent`            | Action grid air attack                   |
| `SendParatrooperAttackIntentEvent` | Action grid paratroopers                 |
| `SendAllianceRequestIntentEvent`   | Action grid alliance                     |
| `SendPeaceRequestIntentEvent`      | Action grid peace                        |
| `SendDeclareWarIntentEvent`        | Action grid declare war                  |
| `SendBreakAllianceIntentEvent`     | Action grid break alliance               |

---

## User Interaction Flow

### Primary flow (working)

```
1. User taps a tile on the map
2. GestureDetector fires "tap" event
3. MobileUI.handleMapTap() converts screen → tile via TransformHandler
4. MobileActionGrid.showForTile() renders context-aware actions based on tile ownership:
   - Own tile: build, economy
   - Enemy tile: attack (troops/boat/air/nuke), diplomacy
   - Unclaimed tile: expand
   - Shore/water: appropriate water actions
5. User taps an action tile in the grid
6. MobileUI.handleActionSelected() routes by prefix:
   - "build:*" → BuildUnitIntentEvent or enter placement mode
   - "attack:*" → appropriate attack intent event
   - "diplomacy:*" → alliance/peace/war events
   - "economy" → open economy overlay
7. EventBus delivers intent to Transport → server
```

### Sidebar flows (working)

| Trigger                | Target                              |
| ---------------------- | ----------------------------------- |
| TopBar menu button     | MobileIntelSidebar (left slide)     |
| TopBar research button | MobileResearchSidebar (right slide) |
| TopBar settings button | MobileSettingsSidebar (right slide) |
| Edge swipe from left   | MobileIntelSidebar                  |
| Edge swipe from right  | MobileResearchSidebar               |
| Long-press on map      | MobileEconomyOverlay (left slide)   |

### Spawn phase flow (working)

```
1. Tap on unclaimed land tile
2. MobileActionGrid shows "Spawn Here" action
3. Tap action → SendSpawnIntentEvent
```

---

## Gesture System

`GestureDetector` is a touch-event state machine on the canvas element that detects:

| Gesture              | Detection Logic                                              | Status                                                   |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| **Tap**              | Single touch, < 200ms, < 10px movement                       | **Working** → tile selection                             |
| **Double-tap**       | Two taps within 300ms                                        | **Detected** but unused                                  |
| **Long-press**       | Single touch held > 500ms, < 10px movement                   | **Working** → economy overlay                            |
| **Drag**             | Single touch moving > 10px threshold                         | **Partial** → placement mode only, map pan unimplemented |
| **Pinch**            | Two-finger touch with scale change                           | **Detected** but zoom unimplemented                      |
| **Edge swipe left**  | Touch starting within 20px of left edge, moving > 50px right | **Working** → intel sidebar                              |
| **Edge swipe right** | Touch starting within 20px of right edge, moving > 50px left | **Working** → research sidebar                           |

---

## File Inventory

| File                                | Lines | Status                                   |
| ----------------------------------- | ----- | ---------------------------------------- |
| `MobileActionGrid.ts`               | 1003  | Active, primary interaction surface      |
| `MobileUI.ts`                       | 1086  | Active orchestrator                      |
| `components/MobileResearchPanel.ts` | 683   | Active, embedded in ResearchSidebar      |
| `overlays/MobileEconomyOverlay.ts`  | 647   | Active                                   |
| `overlays/MobileIntelSidebar.ts`    | 362   | Active (Events tab stubbed)              |
| `MobileTopBar.ts`                   | 307   | Active                                   |
| `gestures/GestureDetector.ts`       | 280   | Active (pinch/drag partial)              |
| `components/MobileSettingsPanel.ts` | 262   | Active                                   |
| `overlays/MobileResearchSidebar.ts` | 154   | Active                                   |
| `overlays/MobilePlayerToast.ts`     | 149   | Active – `show()` not yet called         |
| `overlays/MobileSettingsSidebar.ts` | 147   | Active                                   |
| `MobileDetector.ts`                 | 107   | Active                                   |
| `utils/HapticFeedback.ts`           | 107   | Importable utility, not called currently |

---

## Known Issues & TODOs

### Critical (breaks expected behavior)

1. **Pinch zoom unimplemented** – gesture detected but not forwarded to `TransformHandler`
2. **Map drag/pan unimplemented** – only placement mode finger tracking works
3. **GestureDetector.destroy() leaks listeners** – uses `.bind(this)` in `removeEventListener` (creates new references that don't match)
4. **`updateGameState()` called once** – sidebars/overlays receive initial game ref only (works because `GameView` is a live proxy, but fragile)

### Medium (missing features)

5. **Events tab** in Intel sidebar is a placeholder
6. **MobilePlayerToast** – `show()` is never called from anywhere
7. **HapticFeedback** – imported but never invoked

### Low (polish)

8. **`console.log` statements** in MobileUI.ts should be removed or gated behind a debug flag
9. **TODO comments** remain across several mobile files

---

## Cleanup History

The following dead/orphaned code was removed on 2026-02-12:

| Removed File                          | Lines | Reason                                            |
| ------------------------------------- | ----- | ------------------------------------------------- |
| `gestures/LongPressDetector.ts`       | 84    | Never imported (logic inlined in GestureDetector) |
| `gestures/EdgeSwipeDetector.ts`       | 57    | Never imported (logic inlined in GestureDetector) |
| `utils/SkeletonLoader.ts`             | 147   | Never rendered                                    |
| `MobileContextButton.ts`              | 187   | Always hidden, superseded by ActionGrid           |
| `popups/MobileBasePopup.ts`           | 383   | Only used by deleted popups                       |
| `popups/MobileBuildPopup.ts`          | 290   | Unreachable via hidden context button             |
| `popups/MobileAttackPopup.ts`         | 291   | Unreachable via hidden context button             |
| `popups/MobileDiplomacyPopup.ts`      | 174   | Unreachable via hidden context button             |
| `popups/MobileUnitActionPopup.ts`     | 148   | Never opened (stub)                               |
| `overlays/MobileAttackRatioSlider.ts` | 226   | Unreachable via hidden context button             |
| `overlays/MobilePlacementMode.ts`     | 233   | Unreachable (ActionGrid always sets selectedTile) |

~2,861 lines and ~618 lines of supporting code in MobileUI.ts were removed.
24 files → 13 files, ~8,000 lines → ~5,294 lines.
