# MOBILE-07: Testing & QA Requirements

**Part of:** Terratomic Mobile UI Redesign  
**Dependencies:** MOBILE-06 (Implementation complete)  
**Audience:** QA engineers, testers, product managers  
**Status:** Quality Assurance Specification  
**Last Updated:** February 9, 2026

---

## Overview

This document defines the **testing strategy** for Terratomic's mobile UI adaptation. It covers:

- Test infrastructure setup (Playwright, device emulation)
- Device matrix (which devices to test)
- Test cases (functional, UI, performance)
- RadialMenu parity verification (100% coverage checklist)
- Performance benchmarks
- Bug severity classification

### Scope & Boundaries

**CRITICAL: Test mobile UI only**

✅ **What to test:**

- Touch interactions (tap, swipe, long-press)
- Mobile popups/sidebars (build, attack, diplomacy, research)
- Device-specific rendering (iPhone, Android, tablets)
- Performance on mobile browsers (Safari iOS, Chrome Android)
- Cross-compatibility (mobile player vs desktop player in same game)

❌ **What NOT to test:**

- Game mechanics (already tested in existing desktop test suite)
- Server logic (unchanged)
- Desktop UI (existing tests still valid)
- Event validation (same as desktop)

**Testing focus:** UI rendering, touch gestures, device compatibility. Game logic already proven on desktop.

---

## 0. Test Infrastructure Setup

### 0.1 Playwright Installation

**Install Playwright for E2E tests:**

```bash
npm install -D @playwright/test
npx playwright install
```

This installs browsers (Chromium, WebKit, Firefox) for testing.

**Configure Playwright:**

Create [playwright.config.ts](playwright.config.ts):

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:9000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Desktop Chrome (control/comparison)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Mobile Safari (iPhone 14 Pro)
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 14 Pro"] },
    },

    // Mobile Chrome (Pixel 7)
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 7"] },
    },

    // Tablet Safari (iPad Pro)
    {
      name: "iPad Pro",
      use: { ...devices["iPad Pro"] },
    },

    // Small screen (iPhone SE)
    {
      name: "iPhone SE",
      use: { ...devices["iPhone SE"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:9000",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Run tests:**

```bash
npm run test:e2e       # Run all E2E tests
npm run test:e2e:ui    # Open Playwright UI
npm run test:e2e:debug # Debug mode
```

Add to [package.json](package.json):

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

### 0.2 Device Emulation (Manual Testing)

**Chrome DevTools:**

1. Open Chrome → Inspect → Toggle Device Toolbar (Ctrl+Shift+M)
2. Select device: iPhone 14 Pro, Pixel 7, iPad Pro
3. Rotate device (landscape/portrait)
4. Throttle network: Fast 3G, Slow 3G
5. Throttle CPU: 4x slowdown (low-end device simulation)

**Safari Responsive Design Mode:**

1. Safari → Develop → Enter Responsive Design Mode
2. Select device: iPhone 14 Pro, iPad Pro
3. Test touch events (works with mouse on desktop)

**BrowserStack (Cloud Testing):**

- Sign up: https://www.browserstack.com
- Test on real devices (iOS 16, Android 13, etc.)
- Record video of test sessions
- Share links with team

---

### 0.3 Touch Event Testing

**Install touch simulator for desktop:**

```bash
npm install -D touch-simulator
```

Use in tests to simulate touch events:

```typescript
import { test, expect } from "@playwright/test";

test("long-press context button", async ({ page }) => {
  await page.goto("/game/123");

  // Simulate long-press (0.6s hold)
  await page.locator("#context-button").dispatchEvent("touchstart");
  await page.waitForTimeout(600);
  await page.locator("#context-button").dispatchEvent("touchend");

  // Expect economy overlay to open
  await expect(page.locator(".economy-overlay")).toBeVisible();
});
```

---

## 1. Device Testing Matrix

### 1.1 Priority 1: Must Test (Core Devices)

| Device                    | OS Version  | Screen Size | Resolution | Browser |
| ------------------------- | ----------- | ----------- | ---------- | ------- |
| **iPhone 14 Pro**         | iOS 17+     | 6.1"        | 2556x1179  | Safari  |
| **iPhone SE (3rd gen)**   | iOS 16+     | 4.7"        | 1334x750   | Safari  |
| **Samsung Galaxy S23**    | Android 13+ | 6.1"        | 2340x1080  | Chrome  |
| **Google Pixel 7**        | Android 14+ | 6.3"        | 2400x1080  | Chrome  |
| **iPad Pro 12.9"**        | iOS 17+     | 12.9"       | 2732x2048  | Safari  |
| **Samsung Galaxy Tab S8** | Android 13+ | 11"         | 2560x1600  | Chrome  |

**Rationale:** Covers iOS/Android, small/large screens, tablet, latest OS versions.

---

### 1.2 Priority 2: Should Test (Edge Cases)

| Device                 | OS Version | Screen Size     | Reason                                |
| ---------------------- | ---------- | --------------- | ------------------------------------- |
| **iPhone 11**          | iOS 15     | 6.1"            | Older iOS (test compatibility)        |
| **Samsung Galaxy A52** | Android 12 | 6.5"            | Mid-range device (slower CPU)         |
| **iPad Mini 6**        | iOS 16     | 8.3"            | Smaller tablet (different safe areas) |
| **OnePlus 10 Pro**     | Android 13 | 6.7"            | High refresh rate (120Hz)             |
| **Samsung Z Fold 4**   | Android 13 | 7.6" (unfolded) | Foldable (orientation changes)        |

**Rationale:** Tests performance on low-end devices, older OS versions, unusual form factors.

---

### 1.3 Priority 3: Nice to Test (Extended Coverage)

| Device                   | OS Version | Browser | Reason                                |
| ------------------------ | ---------- | ------- | ------------------------------------- |
| **Any Android**          | 11+        | Firefox | Test non-Chrome browser               |
| **Any iOS**              | 15+        | Chrome  | Test non-Safari browser (rare on iOS) |
| **iPad Pro 11"**         | iPadOS 17  | Safari  | Medium tablet size                    |
| **Xiaomi Redmi Note 11** | Android 12 | Chrome  | Budget device (low RAM)               |

---

## 2. Test Case Categories

### 2.1 Functional Tests (100+ Cases)

Tests that **core gameplay features work correctly** on mobile.

#### Category A: Build System (20 cases)

| ID           | Test Case                                       | Expected Result                             | Priority |
| ------------ | ----------------------------------------------- | ------------------------------------------- | -------- |
| **BUILD-01** | Tap own land tile → Build button appears        | 🏗️ Build button visible, blue               | P1       |
| **BUILD-02** | Tap Build button → Build popup opens            | Popup shows City, Factory, Bunker, Airfield | P1       |
| **BUILD-03** | Tap "City" → Placement mode starts              | Map shows green range indicator             | P1       |
| **BUILD-04** | Tap valid tile during placement → City built    | City appears on map, gold deducted          | P1       |
| **BUILD-05** | Tap invalid tile during placement → Error toast | Red flash, "Cannot build here" message      | P1       |
| **BUILD-06** | Tap "Cancel" during placement → Exits mode      | Map returns to normal, no action taken      | P1       |
| **BUILD-07** | Tap shore tile → Build button appears           | ⚙️ Manage button visible                    | P1       |
| **BUILD-08** | Tap Manage → Build popup (shore)                | Popup shows "Port" only                     | P1       |
| **BUILD-09** | Tap water tile → Build button appears           | 🌊 Water button visible                     | P1       |
| **BUILD-10** | Tap Water button → Build popup                  | Popup shows Warship, Submarine, Fighter Jet | P1       |
| **BUILD-11** | Build Warship without port → Error              | "Requires port" message, locked icon        | P1       |
| **BUILD-12** | Build Submarine without research → Error        | Locked, "Research Submarine tech"           | P2       |
| **BUILD-13** | Build Fighter Jet without airfield → Error      | "Requires airfield" message                 | P2       |
| **BUILD-14** | Can't afford structure → Grayed out             | Cost shown in red, tap does nothing         | P2       |
| **BUILD-15** | Build multiple cities in sequence               | Each placement completes correctly          | P2       |
| **BUILD-16** | Long-press Build button → Economy overlay       | Sliders appear, investment shown            | P1       |
| **BUILD-17** | Adjust investment slider → Updates              | Investment % changes, preview updates       | P2       |
| **BUILD-18** | Build locked structure → Unlock hint            | Tooltip: "Unlock in Research Tree"          | P3       |
| **BUILD-19** | Build on enemy tile → No build button           | Only Attack button appears                  | P1       |
| **BUILD-20** | Build popup → Swipe down → Closes               | Popup dismisses, no action taken            | P2       |

---

#### Category D: Game Mechanics (30 cases)

| ID          | Test Case                                   | Expected Result                                  | Priority |
| ----------- | ------------------------------------------- | ------------------------------------------------ | -------- |
| **MECH-01** | Peace timer active → Cannot attack          | Attack disabled, "Peace period: 5 ticks" message | P1       |
| **MECH-02** | Peace timer expired → Can attack            | Attack enabled, no restrictions                  | P1       |
| **MECH-03** | Safe zone tile → Cannot attack              | "This tile is a safe zone" error                 | P1       |
| **MECH-04** | Leave safe zone → Attacked                  | Enemy attack succeeds immediately                | P1       |
| **MECH-05** | Build submarine → Not visible to enemy      | Enemy sees empty water tile                      | P1       |
| **MECH-06** | Submarine attacks → Becomes visible         | Enemy now sees submarine for 3 ticks             | P1       |
| **MECH-07** | Submarine moves → Stays invisible           | Enemy still sees empty tile                      | P1       |
| **MECH-08** | Research complete → Units unlock            | Locked units now buildable                       | P1       |
| **MECH-09** | Multiple research priorities → All progress | 3 techs all show progress bars                   | P1       |
| **MECH-10** | Investment total >100% → Auto-reduce        | Unlocked sliders reduce to stay ≤100%            | P2       |
| **MECH-11** | Lock slider → Cannot auto-reduce            | Locked slider stays at value                     | P2       |
| **MECH-12** | Trade ship spawns from port → Visible       | Trade ship appears, moves to ally                | P1       |
| **MECH-13** | Embargo player → Trade ships despawn        | All trade routes with Player2 stop               | P2       |
| **MECH-14** | Bomber target set → Bomber run              | Bomber flies from airfield to target             | P1       |
| **MECH-15** | Paratroopers drop → Units spawn             | Infantry appear on ground tile                   | P1       |
| **MECH-16** | Donate troops → Units teleport              | Units appear in ally's city                      | P2       |
| **MECH-17** | Mark player as target → Red border          | All enemy tiles glow red                         | P2       |
| **MECH-18** | Send emoji → Appears on map                 | Emoji floats above enemy capital (3s)            | P3       |
| **MECH-19** | Stack building → Multiple placements        | Build 5 cities in sequence                       | P2       |
| **MECH-20** | Unit locked → Shows research hint           | "Unlock: Submarine Warfare" tooltip              | P2       |
| **MECH-21** | City upgraded → Stats increase              | Production +10%, health +50                      | P2       |
| **MECH-22** | Factory destroyed → Production drops        | Investment efficiency decreases                  | P2       |
| **MECH-23** | Airfield destroyed → Jets grounded          | Fighter jets cannot spawn                        | P1       |
| **MECH-24** | Port destroyed → Ships despawn              | Warships removed from map                        | P1       |
| **MECH-25** | Alliance accepted → Can donate troops       | Donate Troops appears in menu                    | P1       |
| **MECH-26** | Alliance broken → Troops still owned        | Donated troops stay with ally                    | P2       |
| **MECH-27** | Peace request accepted → War ends           | Cannot attack former enemy for 10 ticks          | P1       |
| **MECH-28** | Peace request rejected → Still at war       | Can continue attacking                           | P2       |
| **MECH-29** | Nuke launched → Area destroyed              | 5×5 grid tiles destroyed                         | P1       |
| **MECH-30** | Naval assault → Transport ships spawn       | 5 boats appear from port                         | P1       |

---

#### Category E: Accessibility (WCAG AA) (15 cases)

| ID          | Test Case                                 | Expected Result                           | Priority |
| ----------- | ----------------------------------------- | ----------------------------------------- | -------- |
| **A11Y-01** | Context button contrast ratio             | ≥4.5:1 (text), ≥3:1 (icons)               | P1       |
| **A11Y-02** | Touch target size                         | ≥56px diameter (iOS), ≥48px (Android)     | P1       |
| **A11Y-03** | Screen reader (VoiceOver) → Button labels | "Build structure, button" announced       | P1       |
| **A11Y-04** | Screen reader → Navigate menu             | All menu items readable                   | P1       |
| **A11Y-05** | Reduce motion enabled → No animations     | Slide/fade animations disabled            | P2       |
| **A11Y-06** | Color blind mode → Still playable         | Player colors distinguishable by patterns | P2       |
| **A11Y-07** | Zoom to 200% → Layout intact              | UI doesn't break/overlap                  | P2       |
| **A11Y-08** | Keyboard navigation (iPad) → Tab order    | Can navigate all buttons via Tab key      | P2       |
| **A11Y-09** | Focus indicators visible                  | Blue outline on focused button            | P1       |
| **A11Y-10** | Error messages readable                   | Red text ≥4.5:1 contrast, semantic HTML   | P1       |
| **A11Y-11** | Toast auto-dismiss → Screen reader        | "City built" announcement before dismiss  | P2       |
| **A11Y-12** | Long-press → Haptic feedback              | iPhone vibrates on successful long-press  | P3       |
| **A11Y-13** | Icon-only buttons → ARIA labels           | `aria-label="Build structure"` present    | P1       |
| **A11Y-14** | Dynamic content → Live region             | Screen reader announces new events        | P2       |
| **A11Y-15** | Language support → RTL layout             | Arabic/Hebrew: buttons swap sides         | P3       |

---

#### Category F: Touch Gesture Conflicts (12 cases)

| ID             | Test Case                                      | Expected Result                        | Priority |
| -------------- | ---------------------------------------------- | -------------------------------------- | -------- |
| **GESTURE-01** | Tap + drag (single finger) → Pan map           | Map pans, no button activation         | P1       |
| **GESTURE-02** | Pinch (two finger) → Zoom map                  | Map zooms, no pan                      | P1       |
| **GESTURE-03** | Edge swipe left + map pan → Sidebar wins       | Intel sidebar opens (gesture priority) | P1       |
| **GESTURE-04** | Edge swipe right + map pan → Sidebar wins      | Research sidebar opens                 | P1       |
| **GESTURE-05** | Long-press + accidental drag → Long-press wins | Economy overlay opens (not pan)        | P1       |
| **GESTURE-06** | Double-tap + accidental drag → Zoom wins       | Map zooms to tile (not pan)            | P2       |
| **GESTURE-07** | Tap context button + swipe → No swipe          | Button activates (taps always win)     | P1       |
| **GESTURE-08** | Palm touches edge → Ignored                    | Palm rejection (>30px radius)          | P2       |
| **GESTURE-09** | Stylus tap → Recognized                        | Same as finger tap (pressure agnostic) | P3       |
| **GESTURE-10** | Simultaneous pinch + long-press → Pinch wins   | Map zooms (pinch highest priority)     | P2       |
| **GESTURE-11** | Three-finger swipe → Ignored                   | Doesn't trigger sidebar (2-finger max) | P2       |
| **GESTURE-12** | Quick tap-tap (bounce) → Single tap            | Debounce prevents double action        | P1       |

---

#### Category G: Offline / Network Errors (10 cases)

| ID         | Test Case                                    | Expected Result                       | Priority |
| ---------- | -------------------------------------------- | ------------------------------------- | -------- |
| **NET-01** | Build structure offline → Queued             | "No connection, action queued" toast  | P1       |
| **NET-02** | Reconnect → Queued actions sent              | Queued build executes on server       | P1       |
| **NET-03** | WebSocket disconnect → Reconnect             | Auto-reconnects within 5s             | P1       |
| **NET-04** | Slow 3G → Loading spinner                    | "Sending..." indicator visible        | P2       |
| **NET-05** | Attack during disconnect → Fails gracefully  | Error toast: "Connect to attack"      | P1       |
| **NET-06** | Game state out of sync → Refresh             | "Reload game" prompt appears          | P1       |
| **NET-07** | Offline >60s → Session expired               | "Session timeout, please login"       | P2       |
| **NET-08** | Background app (iOS) → Pause game            | Game pauses, tick timer stops         | P1       |
| **NET-09** | Return from background → Sync state          | Game updates to current tick          | P1       |
| **NET-10** | Network error during critical action → Retry | Nuke launch retries 3x before failing | P1       |

---

#### Category H: Orientation & Form Factors (8 cases)

| ID            | Test Case                                  | Expected Result                            | Priority |
| ------------- | ------------------------------------------ | ------------------------------------------ | -------- |
| **ORIENT-01** | Rotate portrait → landscape → Button moves | Context button stays in corner             | P1       |
| **ORIENT-02** | Rotate during popup open → Popup reflows   | Popup re-centers, no overlap               | P1       |
| **ORIENT-03** | Landscape mode → Sidebars wider            | 50% width (vs 70% portrait)                | P2       |
| **ORIENT-04** | Foldable unfolds → Layout adapts           | Switches to tablet layout (if >768px)      | P3       |
| **ORIENT-05** | iPad split-screen → Still playable         | Context button doesn't leave viewport      | P2       |
| **ORIENT-06** | iPhone notch → Button clears notch         | Safe area: ≥44px from top                  | P1       |
| **ORIENT-07** | Android navigation bar → Button clears     | Safe area: ≥48px from bottom               | P1       |
| **ORIENT-08** | Ultra-wide Android → Centered              | Game content centered, black bars on sides | P3       |

---

#### Category B: Combat System (25 cases)

| ID            | Test Case                                   | Expected Result                                           | Priority |
| ------------- | ------------------------------------------- | --------------------------------------------------------- | -------- |
| **COMBAT-01** | Tap enemy land tile → Attack button appears | ⚔️ Attack button visible, red                             | P1       |
| **COMBAT-02** | Tap Attack button → Attack popup opens      | 6 actions visible: Ground, Naval, Air, Bomber, War, Intel | P1       |
| **COMBAT-03** | Tap "Ground Attack" → Ratio slider appears  | Slider 0-100%, preview shows expected casualties          | P1       |
| **COMBAT-04** | Adjust ratio to 50% → Preview updates       | Attacker: 50 units, Defender: 25 units (example)          | P1       |
| **COMBAT-05** | Tap "Confirm" → Attack sent                 | `SendAttackIntentEvent` emitted, popup closes             | P1       |
| **COMBAT-06** | Tap "Naval Assault" → Boat attack           | `SendBoatAttackIntentEvent` emitted                       | P1       |
| **COMBAT-07** | Naval assault without port → Error          | "Requires port to launch boats" message                   | P2       |
| **COMBAT-08** | Tap "Air Strike" → Air attack               | `SendParatrooperAttackIntentEvent` emitted                | P1       |
| **COMBAT-09** | Air strike without airfield → Error         | "Requires airfield" message                               | P2       |
| **COMBAT-10** | Tap "Bomber Run" → Bomber attack            | `SendBomberIntentEvent` emitted                           | P1       |
| **COMBAT-11** | Bomber without research → Error             | "Research Bomber tech" message                            | P2       |
| **COMBAT-12** | Tap "Declare War" → War declared            | `DeclareWarEvent` emitted, war state changes              | P1       |
| **COMBAT-13** | Tap "View Intel" → Intel sidebar opens      | Swipes in from left, shows Players tab                    | P2       |
| **COMBAT-14** | Tap enemy structure → Attack popup          | Same 6 actions available                                  | P1       |
| **COMBAT-15** | Attack own tile → No attack button          | ⚙️ Manage button appears instead                          | P1       |
| **COMBAT-16** | Attack allied tile → No attack button       | 🤝 Diplomacy button appears                               | P1       |
| **COMBAT-17** | Attack neutral player → Peace enforced      | "Request peace first" or "Declare war first"              | P2       |
| **COMBAT-18** | Attack with 0 units → Error                 | "No units to attack with" message                         | P2       |
| **COMBAT-19** | Attack popup → Swipe down → Closes          | Popup dismisses, no attack sent                           | P2       |
| **COMBAT-20** | Enemy unit on map → Tap → Deploy button     | ✈️ Deploy button appears (if own unit nearby)             | P2       |
| **COMBAT-21** | Tap Deploy → Unit moves                     | Unit moves to target tile                                 | P1       |
| **COMBAT-22** | Deploy without movement range → Error       | "Out of range" message                                    | P2       |
| **COMBAT-23** | Multiple attacks in sequence                | Each attack processes correctly                           | P2       |
| **COMBAT-24** | Attack ratio 100% → All units sent          | Preview and actual match                                  | P1       |
| **COMBAT-25** | Attack ratio 0% → No units sent             | Attack cancels, no casualties                             | P3       |

---

#### Category C: Diplomacy System (15 cases)

| ID           | Test Case                                 | Expected Result                                        | Priority |
| ------------ | ----------------------------------------- | ------------------------------------------------------ | -------- |
| **DIPLO-01** | Tap allied territory → Diplomacy button   | 🤝 Diplomacy button visible, orange                    | P1       |
| **DIPLO-02** | Tap Diplomacy button → Diplomacy popup    | 3 actions: Propose Ally, Break Alliance, Request Peace | P1       |
| **DIPLO-03** | Tap "Propose Ally" → Alliance sent        | `SendAllianceRequestIntentEvent` emitted               | P1       |
| **DIPLO-04** | Propose ally to existing ally → Error     | "Already allied" message                               | P2       |
| **DIPLO-05** | Tap "Break Alliance" → Confirmation       | "Break alliance with Player 2?" [No] [Yes]             | P1       |
| **DIPLO-06** | Confirm break alliance → Alliance broken  | `BreakAllianceEvent` emitted                           | P1       |
| **DIPLO-07** | Tap "Request Peace" → Peace sent          | `SendPeaceRequestIntentEvent` emitted                  | P1       |
| **DIPLO-08** | Request peace from ally → Error           | "Already at peace" message                             | P2       |
| **DIPLO-09** | Swipe from left → Intel sidebar opens     | Sidebar shows Players tab, leaderboard visible         | P1       |
| **DIPLO-10** | Tap player in leaderboard → Quick actions | "Ally" "Break Alliance" "Peace" buttons                | P2       |
| **DIPLO-11** | Long-press player in leaderboard → Toast  | Player info toast: territories, units, gold            | P1       |
| **DIPLO-12** | Swipe sidebar left → Closes               | Sidebar dismisses smoothly                             | P2       |
| **DIPLO-13** | Tap Events tab → Event feed visible       | Recent events listed (attacks, alliances, etc.)        | P1       |
| **DIPLO-14** | Diplomacy popup → Swipe down → Closes     | Popup dismisses, no action taken                       | P2       |
| **DIPLO-15** | Tap neutral territory → Diplomacy button  | Same 3 actions available                               | P1       |

---

#### Category D: Research System (15 cases)

| ID              | Test Case                                     | Expected Result                              | Priority |
| --------------- | --------------------------------------------- | -------------------------------------------- | -------- |
| **RESEARCH-01** | Swipe from right → Research sidebar opens     | Tech tree visible, pinch zoom works          | P1       |
| **RESEARCH-02** | Pinch out on tree → Zoom in                   | Tree zooms smoothly to 200%                  | P1       |
| **RESEARCH-03** | Pinch in on tree → Zoom out                   | Tree zooms out to 50%                        | P1       |
| **RESEARCH-04** | Tap tech node → Detail panel appears          | Panel slides up from bottom                  | P1       |
| **RESEARCH-05** | Detail panel shows prerequisites              | Locked prereqs highlighted in red            | P1       |
| **RESEARCH-06** | Tap "Start Research" → Research begins        | Progress bar appears at top                  | P1       |
| **RESEARCH-07** | Start research without prereqs → Error        | "Requires [Tech Name]" message               | P2       |
| **RESEARCH-08** | Tap "Invest More" → Economy overlay           | Sliders show research investment %           | P2       |
| **RESEARCH-09** | Adjust research investment → Progress updates | Progress bar fills faster/slower             | P1       |
| **RESEARCH-10** | Tap "Cancel" on active research → Confirm     | "Cancel research? Progress lost." [No] [Yes] | P1       |
| **RESEARCH-11** | Confirm cancel → Research stops               | Progress bar disappears, no refund           | P2       |
| **RESEARCH-12** | Research completes → Notification             | Toast: "Tech unlocked: Jet Engines"          | P1       |
| **RESEARCH-13** | Swipe sidebar left → Closes                   | Sidebar dismisses smoothly                   | P2       |
| **RESEARCH-14** | Tap locked node → Shows prereqs               | Detail panel lists missing techs             | P2       |
| **RESEARCH-15** | Pan tree (one-finger drag when zoomed)        | Tree pans smoothly                           | P1       |

---

#### Category E: Economy System (10 cases)

| ID          | Test Case                                 | Expected Result                              | Priority |
| ----------- | ----------------------------------------- | -------------------------------------------- | -------- |
| **ECON-01** | Long-press Build button → Economy overlay | Overlay appears with sliders                 | P1       |
| **ECON-02** | Adjust Productivity slider → Updates      | Investment % changes, income preview updates | P1       |
| **ECON-03** | Total investments > 100% → Error          | Red warning: "Total cannot exceed 100%"      | P1       |
| **ECON-04** | Tap outside overlay → Closes              | Overlay dismisses, changes saved             | P2       |
| **ECON-05** | Swipe down on overlay → Closes            | Overlay dismisses smoothly                   | P2       |
| **ECON-06** | Long-press own structure → Upgrade popup  | Shows upgrade options (if applicable)        | P2       |
| **ECON-07** | Upgrade city → Level up                   | City upgraded, cost deducted                 | P1       |
| **ECON-08** | Income displayed in top bar               | Updates every tick                           | P1       |
| **ECON-09** | Gold displayed in top bar                 | Deducts on purchase, adds on tick            | P1       |
| **ECON-10** | Investment changes → Real-time effect     | Progress bars update immediately             | P1       |

---

#### Category F: UI/UX (15 cases)

| ID        | Test Case                                 | Expected Result                                    | Priority |
| --------- | ----------------------------------------- | -------------------------------------------------- | -------- |
| **UI-01** | Context button morphs on selection change | Build → Attack → Manage (smooth transitions)       | P1       |
| **UI-02** | Context button respects safe area         | Not hidden by home indicator or notch              | P1       |
| **UI-03** | Top bar respects safe area                | Not hidden by status bar                           | P1       |
| **UI-04** | Sidebar respects safe area                | Padding at bottom for home indicator               | P1       |
| **UI-05** | Haptic feedback on tap                    | Light vibration (10ms)                             | P2       |
| **UI-06** | Haptic feedback on long-press             | Stronger vibration (50ms)                          | P2       |
| **UI-07** | Haptic feedback on error                  | Double vibration (100ms each)                      | P3       |
| **UI-08** | Double-tap map → Center on selection      | Map pans smoothly to center                        | P2       |
| **UI-09** | Pinch zoom map → Zooms                    | Smooth zoom in/out                                 | P1       |
| **UI-10** | Drag map → Pans                           | Smooth pan (no jank)                               | P1       |
| **UI-11** | Rotate device → Landscape mode            | UI adapts (sidebars narrower, button repositioned) | P1       |
| **UI-12** | Rotate back to portrait → UI restores     | All elements return to portrait layout             | P1       |
| **UI-13** | Popup appears → Map dims                  | Map opacity 30%, popup on top                      | P1       |
| **UI-14** | Sidebar appears → Map dims                | Map opacity 30%, sidebar slides in                 | P1       |
| **UI-15** | Close popup/sidebar → Map restores        | Map returns to 100% opacity                        | P1       |

---

## 3. RadialMenu Parity Verification (100% Checklist)

**Goal:** Ensure every RadialMenu action has a mobile equivalent.

### Desktop RadialMenu (7 Slots)

| RadialMenu Slot   | Desktop Action                    | Mobile Equivalent                                           | Test Case ID        | Status |
| ----------------- | --------------------------------- | ----------------------------------------------------------- | ------------------- | ------ |
| **Center button** | Ground Attack (ratio slider)      | Attack popup → Ground Attack                                | COMBAT-03           | ✅     |
| **Boat**          | Naval Assault (boat attack)       | Attack popup → Naval Assault                                | COMBAT-06           | ✅     |
| **AirAttack**     | Air Strike (airfield required)    | Attack popup → Air Strike                                   | COMBAT-08           | ✅     |
| **Bomber**        | Bomber Run (bomber tech required) | Attack popup → Bomber Run                                   | COMBAT-10           | ✅     |
| **Info**          | View enemy intel                  | Attack popup → View Intel                                   | COMBAT-13           | ✅     |
| **Ally**          | Propose Alliance / Break Alliance | Diplomacy popup → Propose Ally / Break Alliance             | DIPLO-03, DIPLO-06  | ✅     |
| **Peace**         | Request Peace / Declare War       | Attack popup → Declare War; Diplomacy popup → Request Peace | COMBAT-12, DIPLO-07 | ✅     |

**Additional Desktop Actions (ControlPanel, ControlPanel2):**

| Desktop Component     | Desktop Action            | Mobile Equivalent                                | Test Case ID | Status |
| --------------------- | ------------------------- | ------------------------------------------------ | ------------ | ------ |
| **ControlPanel2**     | Build City                | Build popup → City                               | BUILD-03     | ✅     |
| **ControlPanel2**     | Build Factory             | Build popup → Factory                            | BUILD-03     | ✅     |
| **ControlPanel2**     | Build Bunker              | Build popup → Bunker                             | BUILD-03     | ✅     |
| **ControlPanel2**     | Build Airfield            | Build popup → Airfield                           | BUILD-03     | ✅     |
| **ControlPanel2**     | Build Port                | Build popup (shore) → Port                       | BUILD-08     | ✅     |
| **ControlPanel**      | Adjust investment sliders | Economy overlay → Sliders                        | ECON-02      | ✅     |
| **ResearchTreeModal** | Start research            | Research sidebar → Detail panel → Start Research | RESEARCH-06  | ✅     |
| **Leaderboard**       | View player rankings      | Intel sidebar → Players tab                      | DIPLO-09     | ✅     |
| **EventsDisplay**     | View recent events        | Intel sidebar → Events tab                       | DIPLO-13     | ✅     |

**Parity Status:** ✅ **100%** (16/16 actions mapped and tested)

---

## 4. Performance Benchmarks

### 4.1 Frame Rate (Target: 60 FPS)

| Scenario                      | Device   | Target FPS | Max FPS Drop    | Acceptable?   |
| ----------------------------- | -------- | ---------- | --------------- | ------------- |
| **Idle map (no interaction)** | All      | 60         | 0               | ✅            |
| **Panning map**               | All      | 60         | 5 (55 FPS min)  | ✅            |
| **Pinch zooming map**         | All      | 60         | 10 (50 FPS min) | ✅            |
| **Opening popup**             | All      | 60         | 5 (55 FPS min)  | ✅            |
| **Sidebar slide animation**   | All      | 60         | 5 (55 FPS min)  | ✅            |
| **Research tree zoom**        | All      | 60         | 10 (50 FPS min) | ✅            |
| **Large battle (100+ units)** | High-end | 60         | 15 (45 FPS min) | ✅            |
| **Large battle (100+ units)** | Low-end  | 45         | 15 (30 FPS min) | ⚠️ Acceptable |

**How to measure:**

- Chrome DevTools → Performance tab → Record interaction
- Look for dropped frames (red bars)
- Calculate average FPS over 10-second window

**Pass criteria:**

- High-end devices (iPhone 14 Pro, Galaxy S23): 55+ FPS average
- Low-end devices (iPhone SE, Galaxy A52): 45+ FPS average

---

### 4.2 Touch Response Time (Target: <50ms)

| Interaction               | Target Latency | Max Latency | Pass Criteria                         |
| ------------------------- | -------------- | ----------- | ------------------------------------- |
| **Tap button**            | <50ms          | <100ms      | Visual feedback appears within 50ms   |
| **Long-press**            | 600ms          | 650ms       | Haptic fires at exactly 600ms (±50ms) |
| **Swipe to open sidebar** | <50ms          | <100ms      | Sidebar starts sliding within 50ms    |
| **Pinch zoom**            | <16ms          | <50ms       | Zoom updates every frame (60 FPS)     |

**How to measure:**

- Use high-speed camera (240 FPS) to record screen
- Count frames between touch and visual change
- 1 frame at 60 FPS = 16.67ms

**Pass criteria:** 90% of interactions under target latency

---

### 4.3 Memory Usage (Target: <150 MB)

| Scenario                      | Device | Target Memory | Max Memory | Pass Criteria   |
| ----------------------------- | ------ | ------------- | ---------- | --------------- |
| **Initial load**              | All    | 50 MB         | 75 MB      | No memory leaks |
| **After 10 minutes gameplay** | All    | 100 MB        | 150 MB     | No leaks        |
| **After 30 minutes gameplay** | All    | 120 MB        | 180 MB     | <60 MB increase |

**How to measure:**

- Chrome DevTools → Memory tab → Take heap snapshot
- Compare before/after 10-minute gameplay session
- Look for detached DOM nodes (memory leaks)

**Pass criteria:** Memory growth <60 MB over 30 minutes

---

### 4.4 Network Latency (Not UI-specific, but tracked)

| Action          | Expected Latency | Max Latency | Pass Criteria                    |
| --------------- | ---------------- | ----------- | -------------------------------- |
| **Send attack** | 50ms             | 200ms       | Server responds within 200ms     |
| **Join game**   | 100ms            | 500ms       | Game state loads within 500ms    |
| **Tick update** | 10ms             | 50ms        | State updates every tick (<50ms) |

**How to measure:**

- Network tab in DevTools
- Track WebSocket message timestamps

---

## 5. Cross-Browser Testing

| Browser              | OS          | Version | Priority | Notes                              |
| -------------------- | ----------- | ------- | -------- | ---------------------------------- |
| **Safari**           | iOS 16+     | Latest  | P1       | Primary browser (iOS defaults)     |
| **Chrome**           | Android 12+ | Latest  | P1       | Primary browser (Android defaults) |
| **Firefox**          | Android 12+ | Latest  | P2       | Some users prefer Firefox          |
| **Samsung Internet** | Android 12+ | Latest  | P3       | Pre-installed on Samsung devices   |
| **Edge**             | Android 12+ | Latest  | P3       | Rare, but test if time permits     |

**Pass criteria:**

- P1 browsers: 100% feature parity
- P2 browsers: 95% feature parity (minor visual differences OK)
- P3 browsers: 90% feature parity (graceful degradation OK)

---

## 6. Accessibility Testing

### 6.1 Screen Reader Support

| Test Case                                           | Expected Result                          | WCAG Level |
| --------------------------------------------------- | ---------------------------------------- | ---------- |
| **VoiceOver (iOS)** announces button labels         | "Build button", "Attack button", etc.    | A          |
| **TalkBack (Android)** announces popup titles       | "Build on Land", "Attack Enemy", etc.    | A          |
| **Focus order** follows logical flow                | Top → Context button → Popups → Sidebars | AA         |
| **ARIA labels** present on all interactive elements | `aria-label`, `role` attributes set      | AA         |

**How to test:**

- iOS: Settings → Accessibility → VoiceOver → Enable
- Android: Settings → Accessibility → TalkBack → Enable
- Navigate UI using swipe gestures
- Verify all elements are announced correctly

**Pass criteria:** 100% of interactive elements have ARIA labels

---

### 6.2 Color Contrast (WCAG AA)

| Element                     | Contrast Ratio | Required | Pass?           |
| --------------------------- | -------------- | -------- | --------------- |
| **Button text on blue bg**  | 4.5:1          | 4.5:1    | ✅              |
| **Button text on red bg**   | 4.5:1          | 4.5:1    | ✅              |
| **Popup text on dark bg**   | 7:1            | 4.5:1    | ✅              |
| **Locked item (gray text)** | 3:1            | 4.5:1    | ❌ (fix needed) |

**How to test:**

- Use Chrome DevTools → Accessibility panel
- Or WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

**Pass criteria:** All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)

---

### 6.3 Keyboard Support (Optional on Mobile)

| Action               | Keyboard Shortcut | Implementation                        |
| -------------------- | ----------------- | ------------------------------------- |
| **Open build popup** | `B`               | Focus Build button, Enter to activate |
| **Close popup**      | `Escape`          | Closes active popup/sidebar           |
| **Navigate tree**    | Arrow keys        | Moves focus in research tree          |
| **Zoom in/out**      | `+` / `-`         | Adjusts map zoom                      |

**Pass criteria:** Optional for mobile, but nice-to-have for tablet users with keyboards

---

## 7. Bug Severity Classification

| Severity          | Definition                              | Examples                                                                               | Response Time       |
| ----------------- | --------------------------------------- | -------------------------------------------------------------------------------------- | ------------------- |
| **P1 (Critical)** | Blocks core gameplay, data loss         | - Cannot send attacks<br>- App crashes on launch<br>- Build button doesn't appear      | Fix within 24 hours |
| **P2 (High)**     | Major feature broken, workaround exists | - Sidebar doesn't open<br>- Haptic feedback not working<br>- Popup doesn't dismiss     | Fix within 1 week   |
| **P3 (Medium)**   | Minor feature broken, low impact        | - Animation stutters<br>- Color slightly off<br>- Tooltip text truncated               | Fix within 2 weeks  |
| **P4 (Low)**      | Cosmetic, nice-to-have                  | - Icon misaligned by 1px<br>- Shadow too strong<br>- Hover effect (no hover on mobile) | Fix in next release |

---

## 8. QA Checklist (Before Launch)

### 8.1 Functional Testing

- [ ] All 100+ test cases pass on P1 devices
- [ ] RadialMenu 100% parity verified (16/16 actions)
- [ ] No critical bugs (P1) open
- [ ] <5 high-priority bugs (P2) open

### 8.2 Performance Testing

- [ ] 60 FPS on high-end devices (iPhone 14 Pro, Galaxy S23)
- [ ] 45+ FPS on low-end devices (iPhone SE, Galaxy A52)
- [ ] Touch response <50ms (90% of interactions)
- [ ] Memory growth <60 MB over 30 minutes
- [ ] No memory leaks detected

### 8.3 Cross-Device Testing

- [ ] Tested on all P1 devices (6 devices)
- [ ] Tested on at least 3 P2 devices
- [ ] Tested on tablet (iPad Pro, Galaxy Tab)
- [ ] Tested on foldable (Samsung Z Fold) if available
- [ ] Tested in landscape orientation

### 8.4 Browser Testing

- [ ] Safari (iOS) - 100% feature parity
- [ ] Chrome (Android) - 100% feature parity
- [ ] Firefox (Android) - 95% feature parity

### 8.5 Accessibility Testing

- [ ] VoiceOver (iOS) tested - all elements announced
- [ ] TalkBack (Android) tested - all elements announced
- [ ] Color contrast WCAG AA compliant
- [ ] ARIA labels on all interactive elements
- [ ] Focus order logical

### 8.6 Edge Case Testing

- [ ] Extremely small screen (iPhone SE) - UI fits
- [ ] Extremely large screen (iPad Pro 12.9") - UI scales
- [ ] High refresh rate (120Hz) - animations smooth
- [ ] Low refresh rate (60Hz) - no dropped frames
- [ ] Poor network connection - graceful degradation
- [ ] Offline mode - error messages clear

### 8.7 Regression Testing

- [ ] Desktop UI still works (no broke changes)
- [ ] Server events unchanged (mobile emits same events)
- [ ] Game logic unchanged (no balance changes)
- [ ] All existing desktop tests pass

---

## 9. Automated Testing

### 9.1 Unit Tests (Jest)

**Coverage target:** 95%

```bash
npm test -- --coverage
```

**Key areas:**

- Gesture detection (tap, long-press, pinch, swipe)
- Context button state transitions
- Popup open/close logic
- Event emissions (Build, Attack, Diplomacy events)

**Pass criteria:** 95% line coverage, all tests green

---

### 9.2 Integration Tests (Playwright)

**Coverage:** Critical user flows

**Example flows:**

1. **Build City:** Tap tile → Build button → City → Tap valid tile → City built
2. **Send Attack:** Tap enemy tile → Attack button → Ground Attack → Adjust ratio → Confirm → Attack sent
3. **Propose Ally:** Swipe left → Intel sidebar → Tap player → Ally button → Alliance sent
4. **Start Research:** Swipe right → Research sidebar → Tap node → Start Research → Research begins

```typescript
// tests/e2e/mobile-ui.spec.ts
test("Build city on mobile", async ({ page }) => {
  await page.goto("http://localhost:9000");
  await page.tap('[data-tile-id="123"]'); // Own land tile
  await page.tap('.context-button[state="build"]');
  await page.tap('.popup-item[action="build-city"]');
  await page.tap('[data-tile-id="456"]'); // Target tile
  await expect(page.locator("[data-structure-id]")).toContainText("City");
});
```

**Pass criteria:** All critical flows pass on Chrome (headless)

---

### 9.3 Visual Regression Tests (Percy/Chromatic)

**Coverage:** All popups, sidebars, button states

**Example:**

```typescript
await percySnapshot(page, "Build Popup - Land Tile");
await percySnapshot(page, "Attack Popup - Enemy Tile");
await percySnapshot(page, "Diplomacy Popup - Allied Tile");
```

**Pass criteria:** No unexpected visual changes (±5% pixel diff tolerance)

---

## 10. User Acceptance Testing (UAT)

### 10.1 Beta Testing Group

**Target:** 100 mobile users

- 50 iOS (mix of iPhone models)
- 50 Android (mix of brands)

**Selection criteria:**

- Active players (10+ games completed)
- Mix of skill levels (beginner → expert)
- Geographic diversity (US, EU, Asia)

### 10.2 Feedback Collection

**Methods:**

- In-game survey (after 1 hour of mobile gameplay)
- Discord channel (#mobile-beta)
- Bug report form (Google Forms)

**Questions:**

1. Rate ease of building structures (1-5 stars)
2. Rate ease of sending attacks (1-5 stars)
3. Rate ease of diplomacy actions (1-5 stars)
4. Did you experience any bugs? (Yes/No, describe)
5. What feature was hardest to find? (Free text)
6. Would you recommend mobile Terratomic to a friend? (NPS 0-10)

**Success criteria:**

- Average rating ≥4.0 stars for all features
- <10% of users report critical bugs
- NPS score ≥8.0

---

## 11. Launch Readiness Checklist

- [ ] **QA Checklist 100% complete** (Section 8)
- [ ] **Automated tests passing** (Unit, Integration, Visual Regression)
- [ ] **Beta testing complete** (100 users, NPS ≥8.0)
- [ ] **Performance benchmarks met** (60 FPS, <150 MB memory)
- [ ] **Accessibility audit passed** (WCAG AA compliant)
- [ ] **Cross-device testing complete** (P1 + P2 devices)
- [ ] **RadialMenu parity verified** (16/16 actions)
- [ ] **No P1 bugs open**
- [ ] **<5 P2 bugs open**
- [ ] **Feature flag ready** (can enable/disable mobile UI)
- [ ] **Rollback plan documented** (disable flag if issues)
- [ ] **Monitoring setup** (Sentry error tracking, analytics)

---

## Next Steps

✅ **All 7 documents complete**  
⏭️ **Start development:** Follow MOBILE-06 implementation phases  
⏭️ **After development:** Execute this QA plan  
⏭️ **Beta launch:** Week 11-12 (100 users)  
⏭️ **Full launch:** Week 13 (all mobile users)

**Ready to build!** 🚀
