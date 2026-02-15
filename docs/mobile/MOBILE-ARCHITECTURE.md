# Mobile UI Architecture

> Last updated: 2026-02-15

Quick-reference architecture map for the mobile UI layer. All source lives under `src/client/mobile/`.

Related docs: [Feature Matrix](MOBILE-FEATURE-MATRIX.md) · [Gestures & Haptics](MOBILE-GESTURES-HAPTICS.md) · [Action Grid Catalog](MOBILE-ACTION-GRID-CATALOG.md)

---

## Component Map

```
MobileUI (orchestrator, 1830 lines)
├── MobileDetector              — device / orientation / safe-area detection
├── MobileTopBar                — fixed top status bar (population, gold, clock, settings)
├── MobileActionGrid            — bottom-sheet context-aware action tiles
│
├── gestures/
│   └── GestureDetector         — touch state machine (tap, long-press, drag, pinch, edge-swipe)
│
├── overlays/
│   ├── MobileEconomyOverlay         — full-screen economy panel (investment sliders, troop/attack ratios)
│   ├── MobileIntelSidebar           — left-slide sidebar (Players leaderboard + Teams + Events tabs)
│   ├── MobilePlayerToast            — slide-down player info toast (long-press trigger)
│   ├── MobileAttackBar              — HUD bubbles for active attacks/boats/paratroopers/trade income
│   ├── MobileChatEmojiBar           — HUD bubbles for chat + emoji messages
│   ├── MobileAllianceNotifications  — alliance request + extension warning notifications
│   ├── MobileEventsDisplay          — events log (embedded in Intel sidebar Events tab)
│   ├── MobileResearchSidebar        — right-slide sidebar hosting MobileResearchPanel
│   ├── MobileResearchPriorityModal  — research category priority picker
│   ├── MobileResearchPriorityToast  — confirmation toast after priority selection
│   ├── MobileSettingsSidebar        — right-slide sidebar hosting MobileSettingsPanel
│   └── MobileTechUnlockToast        — tech unlock notification toast
│
├── components/
│   ├── MobileResearchPanel    — full research tech tree with category tabs
│   └── MobileSettingsPanel    — settings toggles, replay controls, exit game
│
└── utils/
    ├── HapticFeedback         — navigator.vibrate() wrapper (TAP / LONG_PRESS / ERROR / SUCCESS / WARNING)
    ├── Icons                  — unit type → icon path mappings
    └── OverlayPositioning     — shared attack-bar anchoring helpers for toasts/modals
```

---

## Activation

Mobile UI activates when `MobileDetector.isMobile()` returns `true` (screen width, UA, touch capability). `MobileUI` is instantiated in `Main.ts` and stored on `window.__MOBILE_UI__`. `ClientGameRunner` wires it to the game canvas and renderer.

Key lifecycle calls:

| Method                         | Caller             | Purpose                                     |
| ------------------------------ | ------------------ | ------------------------------------------- |
| `setActive(true/false)`        | `Main.ts`          | Attach/detach components, toggle CSS class  |
| `initializeGestureDetection()` | `ClientGameRunner` | Bind gesture detector to canvas             |
| `setTransformHandler()`        | `ClientGameRunner` | Screen↔world coordinate conversion         |
| `updateGameState(game)`        | `ClientGameRunner` | Propagate live `GameView` to all components |

When active, `body.mobile-ui-enabled` hides all desktop HUD elements (radial menu, control panels, desktop top bar, etc.).

---

## EventBus Events (mobile → server)

| Event                              | Source                         |
| ---------------------------------- | ------------------------------ |
| `SendSpawnIntentEvent`             | Tap unowned land (spawn phase) |
| `BuildUnitIntentEvent`             | Action grid build tile         |
| `SendUpgradeStructureIntentEvent`  | Stack mode tap                 |
| `SendAttackIntentEvent`            | Ground attack action           |
| `SendBoatAttackIntentEvent`        | Naval assault action           |
| `SendParatrooperAttackIntentEvent` | Paratrooper action             |
| `SendBomberIntentEvent`            | Bomber run action              |
| `SendAllianceRequestIntentEvent`   | Propose alliance action        |
| `SendBreakAllianceIntentEvent`     | Break alliance action          |
| `SendPeaceRequestIntentEvent`      | Request peace action           |
| `SendDeclareWarIntentEvent`        | Declare war action             |
| `SendEmojiIntentEvent`             | Player toast → emoji table     |
| `SendDonateTroopsIntentEvent`      | Player toast donate troops     |
| `SendDonateGoldIntentEvent`        | Player toast donate gold       |
| `ToggleUpgradeModeEvent`           | Stack mode toggle              |
| `ZoomEvent`                        | Pinch gesture / zoom buttons   |
| `DragEvent`                        | Drag gesture (map pan)         |
| `CenterCameraEvent`                | Center zoom button             |

---

## Interaction Flows

### Tap → Action Grid → Intent

1. `GestureDetector` fires `tap` → `MobileUI.handleMapTap()` converts screen→tile
2. `MobileActionGrid.showForTile()` resolves tile category and renders actions
3. User taps an action tile → `MobileUI.handleActionSelected()` routes by prefix (`build:`, `attack:`, `diplomacy:`, `spawn`, `mode:`)
4. Intent event emitted on `EventBus` → `Transport` → server

### Sidebar Access

| Trigger                   | Opens                         |
| ------------------------- | ----------------------------- |
| Economy tab button        | MobileEconomyOverlay          |
| Intel tab button          | MobileIntelSidebar (left)     |
| Research tab button       | MobileResearchSidebar (right) |
| TopBar settings icon      | MobileSettingsSidebar (right) |
| Edge swipe from left      | MobileIntelSidebar            |
| Edge swipe from right     | MobileResearchSidebar         |
| Long-press on player tile | MobilePlayerToast             |
| Long-press on other tile  | MobileEconomyOverlay          |

### Stack Mode

Toggle in action grid enables upgrade-mode: subsequent taps upgrade the nearest stackable structure (City, Port, Factory, etc.) using sticky targeting.

---

## File Inventory

| File                                      | Lines |
| ----------------------------------------- | ----- |
| `MobileUI.ts`                             | 1830  |
| `MobileActionGrid.ts`                     | 1597  |
| `MobileTopBar.ts`                         | 446   |
| `MobileDetector.ts`                       | 120   |
| `gestures/GestureDetector.ts`             | 332   |
| `components/MobileResearchPanel.ts`       | 679   |
| `components/MobileSettingsPanel.ts`       | 542   |
| `overlays/MobileEconomyOverlay.ts`        | 807   |
| `overlays/MobileIntelSidebar.ts`          | 771   |
| `overlays/MobileAttackBar.ts`             | 625   |
| `overlays/MobileEventsDisplay.ts`         | 577   |
| `overlays/MobilePlayerToast.ts`           | 572   |
| `overlays/MobileAllianceNotifications.ts` | 492   |
| `overlays/MobileResearchPriorityModal.ts` | 375   |
| `overlays/MobileTechUnlockToast.ts`       | 284   |
| `overlays/MobileChatEmojiBar.ts`          | 255   |
| `overlays/MobileResearchPriorityToast.ts` | 234   |
| `overlays/MobileResearchSidebar.ts`       | 209   |
| `overlays/MobileSettingsSidebar.ts`       | 206   |
| `utils/HapticFeedback.ts`                 | 124   |
| `utils/Icons.ts`                          | 76    |
| `utils/OverlayPositioning.ts`             | 48    |
