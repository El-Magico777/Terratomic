# Implementation Plan: In-Game UI Scale Slider

## Overview

- Allow players to scale every in-game UI element via a slider in the `UserSettingModal` "Basic" tab.
- Persist the preference in `localStorage` so it takes effect as soon as the app launches.
- Keep the scaling logic encapsulated so future components can reuse it without duplicating math.

## Step 1 – Shared UI scale utility

1. Create `src/client/uiScale.ts` with:
   - Constants for the storage key (`settings.uiScale`), default percent (100), min (75) and max (150).
   - Helper functions: `clampPercent`, `percentToScale`, `scaleToPercent`, `getStoredUiScalePercent`, `saveUiScalePercent`, and `applyUiScalePercent`.
   - `applyUiScalePercent` tries `document.body.style.zoom` (most browsers). If `zoom` is unsupported it falls back to updating `document.documentElement.style.fontSize` (affects the Tailwind rem-based layout) and sets an attribute like `data-ui-scale` for debugging/test hooks. Also set a CSS custom property `--ui-scale` for future fine-grained styling.
   - `initializeUiScaleFromStorage` that reads, clamps, applies once during boot.
   - Guard every DOM access with `if (typeof document === "undefined")` to keep tests/server tools safe.

## Step 2 – Bootstrap hook

1. Import `initializeUiScaleFromStorage` near the top of `src/client/Main.ts`.
2. Invoke it before instantiating `Client` (during module evaluation) so the scale is applied before any UI renders.
3. Optionally expose `applyUiScalePercent` for debugging by attaching it to `window` in development (behind a simple `if (import.meta?.env?.DEV)` guard) so QA can test quickly.

## Step 3 – User settings modal integration

1. In `src/client/UserSettingModal.ts`:
   - Import the helper functions (`applyUiScalePercent`, `getStoredUiScalePercent`, `saveUiScalePercent` and the min/max constants if needed).
   - Add a `@state() private uiScalePercent = DEFAULT_UI_SCALE_PERCENT;`.
   - In `connectedCallback`, after existing logic, initialize `this.uiScalePercent = getStoredUiScalePercent();`.
2. Render the slider (reusing `<setting-slider>`):
   ```html
   <setting-slider
     label="UI Scale"
     description="Adjust the overall size of the interface."
     min="${UI_SCALE_MIN_PERCENT}"
     max="${UI_SCALE_MAX_PERCENT}"
     .value="${this.uiScalePercent}"
     @change="${this.handleUiScaleChange}"
   ></setting-slider>
   ```

   - The existing slider already shows a trailing `%`, so no component changes are required.
3. Implement `handleUiScaleChange(e: CustomEvent<{ value: number }>)`:
   - Extract, clamp, set `this.uiScalePercent`.
   - Call `saveUiScalePercent(percent)` and `applyUiScalePercent(percent)` for instant effect + persistence.
   - Consider debouncing if we see perf issues, but initial implementation can be direct because slider emits on `input`.

## Step 4 – Testing & QA notes

1. Manual checks:
   - Load the app with no stored value → slider defaults to 100% and the UI renders unscaled.
   - Open the settings modal, adjust the slider, verify immediate scaling and label updates.
   - Refresh the page → preferred scale reapplies before UI flashes at wrong size.
   - Test both extremes (75%, 150%) to ensure layout stays intact.
   - Sanity-check Firefox to confirm the fallback (font-size scaling) still provides a noticeable effect.
2. Automated coverage is limited because behavior relies on the DOM; unit-test the pure helpers (clamp/percent conversions) if time allows.
