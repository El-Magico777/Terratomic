# Mobile Gestures + Haptics Audit

> Last updated: 2026-02-15
> Scope: Audit/documentation only (no runtime code changes)

## Purpose

This document defines current mobile gesture + haptic behavior and a normalized target behavior baseline for future implementation work.

Goals for mobile .io gameplay:

- predictable touch semantics (no gesture ambiguity)
- smooth interaction at 60fps (no gesture/haptic churn)
- low battery impact (avoid unnecessary vibration calls)
- consistent feedback semantics across map, overlays, and lobby flows

## Current Gesture Mapping (Runtime)

Source of truth:

- `src/client/mobile/gestures/GestureDetector.ts`
- `src/client/mobile/MobileUI.ts`

| Gesture          | Detection                                  | Current Action Mapping                                                                         |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Tap              | `<200ms` and movement `<10px`              | `MobileUI.handleMapTap()` → spawn, stack action, or ActionGrid open                            |
| Double tap       | emitted by detector (`<300ms`)             | **No listener in `MobileUI`** (currently unused)                                               |
| Long press       | `600ms` hold (cancelled on movement)       | `MobileUI.handleMapLongPress()` → player toast on owned/player tile, otherwise economy overlay |
| Drag             | movement `>10px`, incremental delta        | emits `DragEvent(dx, dy)` for map pan                                                          |
| Pinch            | two+ touches, scale from initial distance  | emits `ZoomEvent(centerX, centerY, delta)`                                                     |
| Edge swipe left  | near left edge + fast horizontal movement  | toggles Intel sidebar                                                                          |
| Edge swipe right | near right edge + fast horizontal movement | toggles Research sidebar                                                                       |

## Current Haptic Mapping (Runtime)

### Core utility patterns

Source: `src/client/mobile/utils/HapticFeedback.ts`

- `TAP = 10ms`
- `LONG_PRESS = 50ms`
- `ERROR = 100ms`
- `SUCCESS = 15ms`
- `WARNING = 30ms`

### Where haptics are currently triggered

| Area                                  | Current behavior                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gesture detector                      | Direct `navigator.vibrate`: tap `10ms`, long-press `50ms`, edge-swipe `25ms`                                                                              |
| ActionGrid                            | Disabled/locked tile => `ERROR`; valid tile tap => `TAP`; backdrop close => `TAP`                                                                         |
| MobileUI action dispatch              | Build/attack/diplomacy/stack success paths => mostly `SUCCESS`; menu-type routes => `TAP`; stack miss => `ERROR`; long-press player toast => `LONG_PRESS` |
| TopBar                                | direct `navigator.vibrate(10)` on settings/stats interactions                                                                                             |
| Economy overlay                       | direct `navigator.vibrate(10)` on lock toggles                                                                                                            |
| Intel / Settings / Research sidebars  | open/tab/player-select interactions => `TAP`                                                                                                              |
| Settings / Research panels            | toggles and selections => mostly `TAP`; save replay => `SUCCESS`                                                                                          |
| Player toast / alliance notifications | confirm actions => `SUCCESS`; dismiss/light actions => `TAP`; war action uses `ERROR`                                                                     |
| Chat/emoji bubble bar                 | no haptic on bubble focus tap                                                                                                                             |
| Attack bar / events display           | no haptic on attack-bubble cancel taps or event filter taps                                                                                               |
| Lobby and lobby modals                | no `HapticFeedback` usage; click-only interactions                                                                                                        |

## Target Baseline (Documented Expected Behavior)

User preference baseline for this pass:

- haptics should be moderate overall
- guaranteed haptics for successful action confirmations (build/attack/upgrade)

Target policy:

1. **Success confirms**
   - keep `SUCCESS` on successful gameplay intents (build/attack/upgrade/diplomacy confirmations)
2. **Error feedback**
   - keep `ERROR` for invalid/blocked attempts (locked action, invalid stack target)
3. **Navigation + passive interactions**
   - keep light/optional (`TAP`) only for major mode switches and panel opens
   - avoid haptics for passive notification consumption (chat/emoji bubbles, scrolling, event reading)
4. **Gesture-layer vibration**
   - avoid unconditional vibration at low-level detector for every tap in future refactor
   - prefer feature-level haptics to avoid duplicate pulses and improve battery efficiency

## Inconsistencies / Gaps Found

1. Mixed haptic APIs are used (`HapticFeedback` and direct `navigator.vibrate`).
2. Gesture detector bypasses global haptics enable/disable (`HapticFeedback.enabled`).
3. `double-tap` is detected but not bound in `MobileUI`.
4. Some overlay actions are interactive but silent (no haptic), while less critical actions are haptic-enabled.
5. Lobby flows currently do not implement mobile-specific haptic semantics.

## Performance + UX Guardrails (for future implementation)

- Never vibrate from high-frequency paths (`touchmove`, drag, pinch loop).
- Avoid stacking multiple haptic triggers for one user intent.
- Keep pulses short (`<=15ms`) for routine confirms.
- Do not vibrate for purely informational UI updates.
- Prefer centralized haptic routing through `HapticFeedback` only.

## Future Implementation Checklist (No changes in this pass)

1. Route all vibration calls through `HapticFeedback` (remove direct `navigator.vibrate` calls).
2. Decide whether `double-tap` should be mapped or removed.
3. Introduce one mobile interaction matrix in code comments/docs that maps gesture → intent → haptic.
4. Add smoke tests/manual QA checklist for iOS Safari + Android Chrome gesture/haptic parity.
