# MOBILE-06: Implementation Guide

**Part of:** Terratomic Mobile UI Redesign  
**Dependencies:** All MOBILE-01 through MOBILE-05 designs  
**Audience:** Developers implementing mobile UI  
**Status:** Technical Specification  
**Last Updated:** February 9, 2026

---

## Overview

This document provides the **technical implementation roadmap** for adapting Terratomic's UI to mobile devices. It covers:

- Component architecture
- File structure
- Code patterns
- Development phases (10 weeks)
- Integration points with existing codebase

### Scope & Boundaries

**CRITICAL: This is UI adaptation only**

✅ **Implementation changes:**

- New mobile components (`src/client/mobile/`)
- Device detection wrapper in Main.ts
- Touch gesture handlers
- Mobile-specific CSS (safe areas, larger touch targets)

❌ **What stays untouched:**

- Game logic (`src/core/` unchanged)
- Event system (same events to server)
- Desktop components (ControlPanel, RadialMenu, etc. remain for PC users)
- Server code (`src/server/` unchanged)
- Shared logic (attack calculations, build validation, research progression)

**Critical principle:** `if (isMobile) { load mobile UI } else { load desktop UI }`

**Desktop and mobile run in parallel** - no changes to existing PC experience.

---

## 1. Technology Stack (Unchanged)

**Frontend:**

- **TypeScript** (strict mode, ESM modules)
- **Lit** (web components)
- **PIXI.js** (canvas rendering)
- **Tailwind CSS** (utility-first styling)

**Build:**

- **Webpack** (bundling)
- **ts-node/esm** (build scripts)

**Testing:**

- **Jest** (unit tests)
- **@swc/jest** (ESM compilation)

**No new dependencies required** - all mobile features built with existing stack.

---

## 2. Component Architecture

### 2.1 New Mobile Components (To Be Created)

```
src/client/mobile/
├── MobileDetector.ts          # Device detection & orientation
├── MobileContextButton.ts     # 6-state morphing button
├── MobileTopBar.ts            # 32px top status bar
├── popups/
│   ├── MobileBuildPopup.ts    # Build menu (land/shore/water)
│   ├── MobileAttackPopup.ts   # 6 attack actions
│   ├── MobileDiplomacyPopup.ts # Ally/Peace/Break
│   └── MobileBasePopup.ts     # Shared popup base class
├── overlays/
│   ├── MobileEconomyOverlay.ts # Investment sliders
│   ├── MobilePlacementMode.ts  # Building placement UI
│   └── MobilePlayerToast.ts    # Long-press player info
├── sidebars/
│   ├── MobileIntelSidebar.ts   # Players + Events tabs
│   └── MobileResearchSidebar.ts # Tech tree wrapper
└── gestures/
    ├── GestureDetector.ts      # Touch event interpreter
    ├── EdgeSwipeDetector.ts    # Sidebar triggers
    └── LongPressDetector.ts    # 0.6s threshold

Total: ~15 new components, ~5000 lines of code
```

### 2.2 Modified Desktop Components

```
src/client/graphics/layers/
├── ControlPanel.ts           # Extract economy logic → MobileEconomyOverlay
├── ControlPanel2.ts          # Split logic → Build/Attack popups
├── RadialMenu.ts             # Disable on mobile (100% replaced)
├── EventsDisplay.ts          # Reused in MobileIntelSidebar
├── Leaderboard.ts            # Reused in MobileIntelSidebar (Players tab)
├── ResearchTreeModal.ts      # Minor touch optimizations (increase row height, simplify layout)
└── PlayerInfoOverlay.ts      # Extract logic → MobilePlayerToast

Total: ~7 files modified, ~500 lines changed
```

**Migration Strategy:**

- **Extract** logic into shared utilities (e.g., `src/core/utils/EconomyCalculator.ts`)
- **Reuse** display components where possible (e.g., EventsDisplay.ts)
- **Disable** desktop-only components on mobile (e.g., RadialMenu)

---

## 3. File Structure (Detailed)

### 3.1 Gesture System

**File:** `src/client/mobile/gestures/GestureDetector.ts`

```typescript
export type GestureType =
  | "tap"
  | "double-tap"
  | "long-press"
  | "drag"
  | "pinch"
  | "edge-swipe-left"
  | "edge-swipe-right";

export interface Gesture {
  type: GestureType;
  position: { x: number; y: number };
  delta?: { x: number; y: number }; // For drag/pinch
  scale?: number; // For pinch zoom
}

export class GestureDetector {
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.attachListeners();
  }

  private attachListeners() {
    this.canvas.addEventListener("touchstart", this.onTouchStart.bind(this));
    this.canvas.addEventListener("touchmove", this.onTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.onTouchEnd.bind(this));
  }

  private onTouchStart(e: TouchEvent) {
    this.touchStartTime = Date.now();
    this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    // Start long-press timer (0.6s)
    this.longPressTimer = setTimeout(() => {
      this.emit({ type: "long-press", position: this.touchStartPos! });
      navigator.vibrate?.(50); // Haptic feedback
    }, 600);
  }

  private onTouchEnd(e: TouchEvent) {
    clearTimeout(this.longPressTimer!);
    const duration = Date.now() - this.touchStartTime;

    if (duration < 200) {
      this.emit({ type: "tap", position: this.touchStartPos! });
    }
  }

  // ... pinch, drag, edge swipe detection
}
```

**File:** `src/client/mobile/gestures/EdgeSwipeDetector.ts`

```typescript
export class EdgeSwipeDetector {
  private static EDGE_THRESHOLD = 20; // pixels from edge

  static isLeftEdgeSwipe(
    startX: number,
    startY: number,
    deltaX: number,
  ): boolean {
    return startX < this.EDGE_THRESHOLD && deltaX > 50;
  }

  static isRightEdgeSwipe(
    startX: number,
    screenWidth: number,
    deltaX: number,
  ): boolean {
    return startX > screenWidth - this.EDGE_THRESHOLD && deltaX < -50;
  }
}
```

---

### 3.2 Context Button (6 States)

**File:** `src/client/mobile/MobileContextButton.ts`

```typescript
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

type ButtonState =
  | "build"
  | "attack"
  | "manage"
  | "diplomacy"
  | "deploy"
  | "water";

@customElement("mobile-context-button")
export class MobileContextButton extends LitElement {
  @property({ type: String }) state: ButtonState = "build";
  @property({ type: Boolean }) visible: boolean = false;

  static styles = css`
    :host {
      position: fixed;
      bottom: calc(env(safe-area-inset-bottom) + 16px);
      right: 16px;
      z-index: 1000;
    }

    .button {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--button-bg);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      transition:
        transform 0.2s,
        background 0.2s;
    }

    .button:active {
      transform: scale(0.9);
    }

    .build {
      background: #3b82f6;
    }
    .attack {
      background: #ef4444;
    }
    .manage {
      background: #10b981;
    }
    .diplomacy {
      background: #f59e0b;
    }
    .deploy {
      background: #8b5cf6;
    }
    .water {
      background: #06b6d4;
    }
  `;

  render() {
    const icon = this.getIcon();
    return html`
      <button
        class="button ${this.state}"
        @click="${this.onClick}"
        ?hidden="${!this.visible}"
      >
        ${icon}
      </button>
    `;
  }

  private getIcon(): string {
    const icons = {
      build: "🏗️",
      attack: "⚔️",
      manage: "⚙️",
      diplomacy: "🤝",
      deploy: "✈️",
      water: "🌊",
    };
    return icons[this.state];
  }

  private onClick() {
    this.dispatchEvent(
      new CustomEvent("button-click", { detail: { state: this.state } }),
    );
  }
}
```

---

### 3.3 Build Popup Example

**File:** `src/client/mobile/popups/MobileBuildPopup.ts`

```typescript
import { MobileBasePopup } from "./MobileBasePopup";
import { TileRef } from "../../../core/game/GameMap";
import { GameView } from "../../../core/game/GameView";

export class MobileBuildPopup extends MobileBasePopup {
  private tile: TileRef;
  private game: GameView;

  constructor(tile: TileRef, game: GameView) {
    super();
    this.tile = tile;
    this.game = game;
    this.title = this.getTitle();
    this.items = this.getMenuItems();
  }

  private getTitle(): string {
    if (this.game.isWater(this.tile)) return "🌊 Build on Water";
    if (this.hasAdjacentWater(this.tile)) return "⚓ Build on Shore";
    return "🏗️ Build";
  }

  private hasAdjacentWater(tile: TileRef): boolean {
    const neighbors = this.game.neighbors(tile);
    return neighbors.some((n) => this.game.isWater(n));
  }

  private getMenuItems() {
    const myPlayer = this.game.myPlayer();

    // Land structures
    if (this.game.isLand(this.tile)) {
      return [
        { icon: "🏙️", label: "City", cost: 50, action: "build-city" },
        { icon: "🏭", label: "Factory", cost: 100, action: "build-factory" },
        { icon: "🛡️", label: "Bunker", cost: 75, action: "build-bunker" },
        {
          icon: "✈️",
          label: "Airfield",
          cost: 150,
          action: "build-airfield",
          locked: !this.hasResearch("airfield"),
        },
      ];
    }

    // Shore: Port only
    if (this.hasAdjacentWater(this.tile)) {
      return [
        {
          icon: "⚓",
          label: "Port",
          cost: 120,
          action: "build-port",
          locked: !this.hasResearch("port"),
        },
      ];
    }

    // Water: Units (if ports exist)
    if (this.game.isWater(this.tile)) {
      return [
        {
          icon: "⛵",
          label: "Warship",
          cost: 200,
          action: "build-warship",
          locked: !this.hasPort(),
        },
        {
          icon: "🚢",
          label: "Submarine",
          cost: 250,
          action: "build-submarine",
          locked: !this.hasResearch("submarine"),
        },
        {
          icon: "✈️",
          label: "Fighter Jet",
          cost: 300,
          action: "build-fighter",
          locked: !this.hasResearch("jet-engines"),
        },
      ];
    }
  }

  private hasResearch(tech: string): boolean {
    // Check via game API (tech names are placeholders - use actual tech IDs)
    return this.game.myPlayer().hasCompletedResearch(tech);
  }

  private hasPort(): boolean {
    return this.game
      .myPlayer()
      .structures()
      .some((s) => s.type === "port");
  }
}
```

---

## 4. Desktop Component Integration

### 4.1 Device Detection (Entry Point)

**File:** `src/client/Main.ts` (modify existing)

```typescript
import { MobileDetector } from "./mobile/MobileDetector";

// At app startup
if (MobileDetector.isMobile()) {
  import("./mobile/MobileUI").then((module) => {
    new module.MobileUI(gameRenderer, gameState);
  });
} else {
  // Load desktop UI (existing)
  new RadialMenu(gameRenderer);
  new ControlPanel(gameRenderer, gameState);
  // ... etc
}
```

**File:** `src/client/mobile/MobileDetector.ts`

```typescript
export class MobileDetector {
  static isMobile(): boolean {
    // Check multiple signals
    const touchDevice = "ontouchstart" in window;
    const smallScreen = window.innerWidth < 768;
    const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    return touchDevice && (smallScreen || mobileUA);
  }

  static getOrientation(): "portrait" | "landscape" {
    return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
  }

  static getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue("env(safe-area-inset-top)")) || 0,
      bottom:
        parseInt(style.getPropertyValue("env(safe-area-inset-bottom)")) || 0,
      left: parseInt(style.getPropertyValue("env(safe-area-inset-left)")) || 0,
      right:
        parseInt(style.getPropertyValue("env(safe-area-inset-right)")) || 0,
    };
  }
}
```

---

### 4.2 Shared Logic Extraction

**Example:** Economy calculations used by both ControlPanel and MobileEconomyOverlay

**New file:** `src/core/utils/EconomyCalculator.ts`

```typescript
export class EconomyCalculator {
  static calculateIncome(player: Player): number {
    const cityIncome =
      player.structures.filter((s) => s.type === "city").length * 10;
    const factoryIncome =
      player.structures.filter((s) => s.type === "factory").length * 25;
    return cityIncome + factoryIncome;
  }

  static calculateInvestmentImpact(
    investmentPercent: number,
    currentProgress: number,
  ): number {
    // Same formula used by desktop, now shared
    return currentProgress + investmentPercent * 0.1;
  }
}
```

**Usage in desktop:**

```typescript
// ControlPanel.ts
import { EconomyCalculator } from '../../../core/utils/EconomyCalculator';

updateIncome() {
  const income = EconomyCalculator.calculateIncome(this.player);
  this.incomeLabel.text = `Income: $${income}`;
}
```

**Usage in mobile:**

```typescript
// MobileEconomyOverlay.ts
import { EconomyCalculator } from '../../../core/utils/EconomyCalculator';

render() {
  const income = EconomyCalculator.calculateIncome(this.player);
  return html`<div>Income: $${income}</div>`;
}
```

---

## 5. Development Phases (10 Weeks)

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Device detection, gesture system, context button

**Tasks:**

- [ ] Create `src/client/mobile/` directory structure
- [ ] Implement `MobileDetector.ts` (device detection)
- [ ] Implement `GestureDetector.ts` (tap, long-press, pinch, drag)
- [ ] Implement `EdgeSwipeDetector.ts` (sidebar triggers)
- [ ] Create `MobileContextButton.ts` (6 states, morphing animation)
- [ ] Create `MobileTopBar.ts` (32px status bar)
- [ ] Add viewport meta tag to HTML (`viewport-fit=cover`)
- [ ] Test on iOS Safari & Chrome Android

**Deliverable:** Context button appears, changes state based on selection

---

### Phase 2: Build System (Week 3)

**Goal:** Build popup, placement mode

**Tasks:**

- [ ] Create `MobileBasePopup.ts` (shared popup base class)
- [ ] Create `MobileBuildPopup.ts` (land/shore/water menus)
- [ ] Create `MobilePlacementMode.ts` (range indicators, cancel button)
- [ ] Extract build logic from `ControlPanel2.ts` → shared util
- [ ] Wire up `MapTappedEvent` → show build popup (if own land/shore/water)
- [ ] Test placement mode validation (can't build on enemy tiles)
- [ ] Test build cost display (red if can't afford)

**Deliverable:** Can build cities, factories, bunkers, ports, and water units

---

### Phase 3: Combat & Attack (Week 4)

**Goal:** Attack popup, unit deployment

**Tasks:**

- [ ] Create `MobileAttackPopup.ts` (6 actions: Ground, Naval, Air, Bomber, War, Intel)
- [ ] Implement attack ratio adjustment (slider, 0-100%)
- [ ] Wire up `MapTappedEvent` → show attack popup (if enemy tile/structure/unit)
- [ ] Emit `SendAttackIntentEvent` (same as desktop RadialMenu)
- [ ] Emit `SendBoatAttackIntentEvent` (naval assault)
- [ ] Emit `SendParatrooperAttackIntentEvent` (air strike)
- [ ] Emit `SendBomberIntentEvent` (bomber run)
- [ ] Implement unit deployment (own units → deploy button)
- [ ] Test attack validations (can't attack allies, can't attack without resources)

**Deliverable:** All 6 attack actions work, RadialMenu 6/9 actions replaced

---

### Phase 4: Diplomacy & Intel (Weeks 5-6)

**Goal:** Diplomacy popup, Intel sidebar, player toasts

**Tasks:**

- [ ] Create `MobileDiplomacyPopup.ts` (Ally, Break Alliance, Peace)
- [ ] Create `MobileIntelSidebar.ts` (swipe from left)
- [ ] Create Players tab (embed Leaderboard.ts)
- [ ] Create Events tab (embed EventsDisplay.ts)
- [ ] Create `MobilePlayerToast.ts` (long-press trigger)
- [ ] Wire up `MapTappedEvent` → show diplomacy popup (if allied/neutral territory)
- [ ] Emit `SendAllianceRequestIntentEvent` (same as desktop RadialMenu)
- [ ] Emit `SendBreakAllianceIntentEvent`
- [ ] Emit `SendPeaceRequestIntentEvent`
- [ ] Test edge swipe detection (left edge, 20px threshold)

**Deliverable:** All diplomacy actions work, RadialMenu 9/9 actions replaced, Intel sidebar functional

---

### Phase 5: Research & Economy (Weeks 7-8)

**Goal:** Research sidebar, economy overlay

**Tasks:**

- [ ] Create `MobileResearchSidebar.ts` (swipe from right)
- [ ] Embed `ResearchTreeModal.tsx` (increase node size, adjust zoom)
- [ ] Create sticky progress bar (current research)
- [ ] Implement detail panel (bottom sheet)
- [ ] Create `MobileEconomyOverlay.ts` (investment sliders)
- [ ] Extract economy logic from `ControlPanel.ts` → `EconomyCalculator.ts`
- [ ] Wire up long-press context button → economy overlay
- [ ] Test pinch zoom on tech tree (real device)
- [ ] Test investment adjustments (real-time progress updates)

**Deliverable:** Research and economy systems fully functional on mobile

---

### Phase 6: Polish & Optimization (Week 9)

**Goal:** Animations, haptics, performance

**Tasks:**

- [ ] Add slide animations (popups, sidebars: 0.25s ease-out)
- [ ] Add haptic feedback (tap: 10ms, long-press: 50ms, error: 100ms)
- [ ] Implement popup dismiss gestures (swipe down, tap outside)
- [ ] Optimize PIXI rendering (reduce draw calls)
- [ ] Add loading states (skeleton screens for sidebars)
- [ ] Test on low-end Android (4GB RAM, 60Hz screen)
- [ ] Test on high-refresh displays (120Hz iPhone/iPad)
- [ ] Profile frame rate (target 60 FPS constant)

**Deliverable:** Smooth 60 FPS, responsive feel, no jank

---

### Phase 7: Accessibility & Testing (Week 10)

**Goal:** ARIA labels, keyboard support, cross-device testing

**Tasks:**

- [ ] Add ARIA labels to all buttons (`aria-label`, `role`)
- [ ] Test with screen reader (iOS VoiceOver, Android TalkBack)
- [ ] Add keyboard support (optional: arrow keys, enter, escape)
- [ ] Test landscape orientation (adjust sidebar widths)
- [ ] Test on iPad (larger screen, different safe areas)
- [ ] Test on tablet Android (10" screen)
- [ ] Test on foldable devices (Samsung Z Fold)
- [ ] Run automated tests (Jest, Playwright)
- [ ] Fix bugs found during QA

**Deliverable:** Fully tested, accessible mobile UI

---

## 6. Event Integration (No Changes)

All mobile components emit **the same events** as desktop:

| Mobile Component                    | Desktop Component          | Event Emitted                               |
| ----------------------------------- | -------------------------- | ------------------------------------------- |
| Build popup → City                  | ControlPanel2 → City       | `BuildUnitIntentEvent`                      |
| Attack popup → Ground Attack        | RadialMenu → Center button | `SendAttackIntentEvent`                     |
| Attack popup → Naval Assault        | RadialMenu → Boat          | `SendBoatAttackIntentEvent`                 |
| Attack popup → Air Strike           | RadialMenu → AirAttack     | `SendParatrooperAttackIntentEvent`          |
| Attack popup → Bomber Run           | RadialMenu → Bomber        | `SendBomberIntentEvent`                     |
| Diplomacy popup → Propose Ally      | RadialMenu → Ally          | `SendAllianceRequestIntentEvent`            |
| Diplomacy popup → Request Peace     | RadialMenu → Peace         | `SendPeaceRequestIntentEvent`               |
| Economy overlay → Adjust investment | ControlPanel2 → Slider     | DOM `CustomEvent(INVESTMENT_REQUEST_EVENT)` |
| Research detail → Toggle priority   | ResearchTreeModal → Row    | `SendResearchTreeSelectIntentEvent`         |

**Server-side code unchanged** - mobile is UI-only refactor.

---

## 7. CSS & Styling Patterns

### 7.1 Safe Area Insets

**Pattern:** Use CSS custom properties for safe areas

```css
.context-button {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom) + 16px);
  right: 16px;
}

.top-bar {
  position: fixed;
  top: env(safe-area-inset-top);
  left: env(safe-area-inset-left);
  right: env(safe-area-inset-right);
  height: 32px;
}

.sidebar {
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}
```

**Viewport meta tag (required):**

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no"
/>
```

---

### 7.2 Touch Target Size

**Minimum:** 44x44px (Apple HIG), 48x48px (Material Design)

```css
.popup-item {
  min-height: 48px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.context-button {
  width: 64px;
  height: 64px; /* Larger than minimum for easier thumb reach */
}
```

---

### 7.3 Tailwind Utilities

**Use existing Tailwind classes where possible:**

```html
<div
  class="fixed bottom-4 right-4 w-16 h-16 rounded-full bg-blue-500 shadow-lg"
>
  🏗️
</div>
```

**Custom classes for mobile-specific styles:**

```css
/* tailwind.config.js - add to theme.extend */
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      }
    }
  }
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests (Jest)

**Example:** `MobileContextButton.test.ts`

```typescript
import { MobileContextButton } from "./MobileContextButton";

describe("MobileContextButton", () => {
  it("should render with correct state", () => {
    const button = new MobileContextButton();
    button.state = "attack";
    document.body.appendChild(button);

    expect(button.shadowRoot?.querySelector(".button")).toHaveClass("attack");
    expect(button.shadowRoot?.querySelector(".button")?.textContent).toBe("⚔️");
  });

  it("should emit event on click", async () => {
    const button = new MobileContextButton();
    button.state = "build";
    document.body.appendChild(button);

    const eventSpy = jest.fn();
    button.addEventListener("button-click", eventSpy);

    button.shadowRoot?.querySelector("button")?.click();

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { state: "build" },
      }),
    );
  });
});
```

---

### 8.2 Visual Regression Tests (Playwright)

**Example:** `mobile-ui.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 375, height: 667 }, // iPhone SE
  hasTouch: true,
});

test("Build popup appears on tap", async ({ page }) => {
  await page.goto("http://localhost:9000");

  // Tap on own land tile
  await page.tap('[data-tile-id="123"]');

  // Build popup should be visible
  await expect(page.locator(".mobile-build-popup")).toBeVisible();

  // Screenshot for visual regression
  await expect(page).toHaveScreenshot("build-popup.png");
});
```

---

### 8.3 Device Testing Matrix (See MOBILE-07)

- **iOS:** iPhone SE (small), iPhone 14 Pro (large), iPad Pro 12.9"
- **Android:** Samsung Galaxy S22 (small), Pixel 7 (medium), Samsung Tab S8 (tablet)
- **Browsers:** Safari (iOS), Chrome (Android), Firefox (Android)

---

## 9. Code Review Checklist

Before merging mobile UI PR:

- [ ] All 15 new components created
- [ ] All 7 desktop components modified correctly (no logic removed, only extracted)
- [ ] Device detection works (tested on iPhone, Android)
- [ ] Gestures work (tap, long-press, pinch, swipe tested on real devices)
- [ ] Context button morphs correctly (all 6 states)
- [ ] All popups emit correct events (verified in event log)
- [ ] RadialMenu 100% replaced (9/9 actions mapped)
- [ ] Safe areas respected (no UI hidden behind notch/home indicator)
- [ ] 60 FPS maintained (profiled on low-end device)
- [ ] ARIA labels added (screen reader tested)
- [ ] No desktop functionality lost (feature parity verified)
- [ ] Unit tests pass (95% coverage)
- [ ] Visual regression tests pass (no unexpected UI changes)
- [ ] QA checklist complete (see MOBILE-07)

---

## 10. Rollout Strategy

### 10.1 Feature Flag (Recommended)

```typescript
// config/MobileConfig.ts
export class MobileConfig {
  static ENABLE_MOBILE_UI = process.env.MOBILE_UI_ENABLED === "true";
}

// Main.ts
if (MobileDetector.isMobile() && MobileConfig.ENABLE_MOBILE_UI) {
  // Load mobile UI
} else {
  // Load desktop UI
}
```

**Benefits:**

- Test in production with specific users (opt-in beta)
- Rollback quickly if issues found
- Gradual rollout (10% → 50% → 100%)

---

### 10.2 Beta Testing Phase

**Week 11-12:** Invite 100 mobile users to test

- Enable feature flag for their accounts
- Collect feedback via in-game survey
- Monitor error logs (Sentry/LogRocket)
- Iterate on bugs/UX issues

**Week 13:** Full rollout to all mobile users

---

## 11. Performance Budgets

| Metric                           | Target | Max    |
| -------------------------------- | ------ | ------ |
| **Bundle size (mobile.js)**      | 50 KB  | 75 KB  |
| **Initial load time**            | 1.5s   | 2.5s   |
| **Frame rate (gameplay)**        | 60 FPS | 50 FPS |
| **Frame rate (UI interactions)** | 60 FPS | 45 FPS |
| **Memory usage**                 | 100 MB | 150 MB |
| **Touch response time**          | <50ms  | <100ms |

---

## 12. Documentation & Handoff

**For developers:**

- This doc (MOBILE-06)
- Inline code comments (TSDoc)
- README.md update (mobile dev setup)

**For designers:**

- MOBILE-01 through MOBILE-05 (UX specs)
- Figma mockups (optional, if created)

**For QA:**

- MOBILE-07 (testing requirements)
- Device matrix
- Test cases

---

## Next Steps

✅ **MOBILE-01:** Core interactions  
✅ **MOBILE-02:** Build & economy  
✅ **MOBILE-03:** Combat & attack  
✅ **MOBILE-04:** Diplomacy & intel  
✅ **MOBILE-05:** Research & progression  
✅ **This doc:** Implementation roadmap  
⏭️ **MOBILE-07:** Testing & QA checklist

**Ready to start Week 1:** Foundation phase (device detection, gestures, context button)
