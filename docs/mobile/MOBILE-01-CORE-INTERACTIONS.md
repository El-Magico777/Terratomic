# MOBILE-01: Core Interactions & Foundation

**Part of:** Terratomic Mobile UI Redesign  
**Dependencies:** None (foundation layer)  
**Status:** Design Phase  
**Last Updated:** February 9, 2026

---

## Overview

This document defines the **foundational touch interaction system** for Terratomic mobile. Everything else (build, combat, diplomacy) builds on top of these core mechanics.

### Scope & Boundaries

**CRITICAL: This is UI adaptation only**

✅ **What changes:**

- Touch interactions (tap, swipe, long-press replace mouse clicks, right-click, hover)
- Visual layout (popups replace radial menu, sidebars replace panels)
- Input patterns (mobile-friendly gestures)

❌ **What does NOT change:**

- Game mechanics (attack ratios, build costs, research logic)
- Event system (same events emitted to server)
- Validation logic (same checks for valid actions)
- Server code (no backend changes)
- **Desktop UI (PC version untouched)**

**Approach:** Adapt existing desktop UI to mobile touch patterns. Do not reinvent game logic.

---

### Core Principle

**Context-aware single button** that morphs based on selection. Map stays visible 98% of the time.

---

## 0. Device Detection & Platform Setup

### Entry Point: Main.ts

```typescript
// Add to Main.ts
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

if (isMobile) {
  import("./mobile/MobileUI").then((module) => {
    new module.MobileUI(gameRenderer, gameState);
  });
} else {
  // Load desktop UI (existing)
}
```

### MobileDetector.ts

```typescript
export class MobileDetector {
  static isMobile(): boolean {
    const touchDevice = "ontouchstart" in window;
    const smallScreen = window.innerWidth < 768;
    const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return touchDevice && (smallScreen || mobileUA);
  }

  static getDeviceInfo() {
    const ua = navigator.userAgent;
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const width = window.innerWidth;
    const screenSize = width < 375 ? "small" : width < 768 ? "medium" : "large";
    return { isTablet, isIOS, isAndroid, screenSize };
  }
}
```

### Responsive Button Sizing

- **Phone (small <375px):** 56×56px context button
- **Phone (medium):** 64×64px (default)
- **Tablet (≥768px):** 72×72px

### iOS-Specific Fixes

```css
.game-canvas {
  overscroll-behavior: none; /* Prevent bounce scroll */
  touch-action: pan-x pan-y; /* Allow pan, prevent double-tap zoom */
}

.fullscreen-container {
  height: 100dvh; /* Dynamic viewport for Safari toolbar */
}
```

---

## 1. Layout Architecture

### Default State: Clean Map

```
┌─────────────────────────────┐
│ 🏠 245  💰 89    [≡][⚙️]    │ ← Minimal top bar (translucent, 32px)
├─────────────────────────────┤
│                             │
│                             │
│                             │
│    GAME BOARD (PIXI)        │ ← 98% of screen
│    Clean, unobstructed      │   Drag, pinch zoom, tap to select
│                             │   Gestures trigger context changes
│                             │
│                             │
│                             │
│                   [🎯]      │ ← ONE context-aware button (56×56px)
└─────────────────────────────┘   Right corner, morphs based on selection
```

**Screen Breakdown:**

- **Top bar:** 32px fixed height, translucent background
- **Map canvas:** `calc(100vh - 32px - 72px)` (minus top bar and safe area)
- **Context button:** 56×56px, positioned 16px from right, 16px from bottom (+ safe-area-inset-bottom)

---

## 2. Touch Gestures

### Gesture Priority (Conflict Resolution)

**When multiple gestures could trigger, priority order:**

1. **Pinch zoom** (2 fingers) - Always wins, cancels others
2. **Edge swipe** - Detected within 150ms
3. **Long-press** (0.6s) - Canceled by movement >10px
4. **Double-tap** - Takes priority over single tap
5. **Drag** - Prevents tap from firing
6. **Tap** - Default fallback

### Primary Gestures (Always Active)

| Gesture                       | Action                         | Visual Feedback                                              | Haptic    |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------ | --------- |
| **Tap tile/unit**             | Select (context button morphs) | Highlight selected tile (yellow border), button icon changes | 10ms buzz |
| **Long-press tile (0.6s)**    | Show info toast                | Toast slides from top, semi-transparent                      | 50ms buzz |
| **Double-tap tile**           | Center & zoom to selection     | Camera smooth pan (0.3s ease-out)                            | None      |
| **Pinch (2 fingers)**         | Zoom map                       | Scale indicator appears (optional)                           | None      |
| **Drag (1 finger)**           | Pan map                        | Map follows finger at 1:1 ratio                              | None      |
| **Swipe from left edge**      | Open Intel sidebar             | Sidebar slides in (70% width)                                | 25ms buzz |
| **Swipe from right edge**     | Open Research sidebar          | Sidebar slides in (70% width)                                | 25ms buzz |
| **Tap outside popup/sidebar** | Dismiss/close                  | Fade out (0.2s)                                              | None      |
| **3+ fingers touch**          | Cancel all gestures            | Highlights clear                                             | None      |

### Edge Swipe Detection

- **Trigger zone:** 20px from screen edge
- **Velocity threshold:** 150px/s minimum
- **Direction lock:** Horizontal swipe only (vertical = map pan)
- **Conflict prevention:** Don't trigger if pinch zoom or two-finger drag active

### Long-Press Mechanics

- **Threshold:** 600ms hold without movement
- **Movement tolerance:** <10px movement allowed (prevents accidental cancel)
- **Cancellation:** Lifting finger before 600ms = no action
- **Visual countdown:** Optional circular progress indicator around finger (disabled by default)

### Palm Rejection

```typescript
function isPalmTouch(touch: Touch): boolean {
  // iOS provides touch.radiusX/radiusY for contact area
  // Large area (>30px radius) likely = palm
  return (touch.radiusX ?? 0) > 30 || (touch.radiusY ?? 0) > 30;
}

onTouchStart(e: TouchEvent) {
  const validTouches = Array.from(e.touches).filter(t => !isPalmTouch(t));
  if (validTouches.length === 0) return; // Ignore palm-only touches
  // Process valid touches only
}
```

---

## 3. Context Button System

### Button States (6 Total)

The context button **morphs dynamically** based on what's selected:

| Selection State            | Icon | Color            | Label (Accessibility)      |
| -------------------------- | ---- | ---------------- | -------------------------- |
| **Nothing selected**       | 🏗️   | Green (#10b981)  | "Build structures"         |
| **Enemy territory**        | ⚔️   | Red (#ef4444)    | "Attack enemy"             |
| **Own territory**          | ⚙️   | Blue (#3b82f6)   | "Manage territory"         |
| **Allied/neutral**         | 🤝   | Green (#10b981)  | "Diplomacy"                |
| **Own unit**               | ✈️   | Purple (#8b5cf6) | "Deploy unit"              |
| **Water tile (can build)** | 🏗️   | Green (#10b981)  | "Build naval units"        |
| **Water tile (no port)**   | 🌊   | Gray (#9ca3af)   | "Need port to build ships" |

**Note:** Water tiles show different states based on port availability. Without ports, button is grayed out and shows tooltip on tap.

### Morphing Transition

```css
.context-button {
  transition:
    background-color 0.2s ease,
    transform 0.15s ease;
}

.context-button-icon {
  transition: opacity 0.1s ease;
}

/* Icon swap: fade out old, fade in new */
.icon-exit {
  opacity: 0;
}
.icon-enter {
  opacity: 1;
}
```

**Animation sequence (200ms total):**

1. Old icon fades out (0-100ms)
2. Button color changes (0-200ms, ease curve)
3. New icon fades in (100-200ms)
4. Scale feedback on tap: `scale(0.95)` for 150ms

---

## 4. Top Bar (Always Visible)

### Minimal Stats Strip

```
┌─────────────────────────────┐
│ [≡] 🏠 245  💰 89    [⚙️]   │ ← 32px height
└─────────────────────────────┘
  ↑               ↑          ↑
  Menu       Stats (tap)  Settings
```

**Components:**

- **[≡] Hamburger (left):** Opens Intel sidebar (same as swipe-from-left)
- **🏠 Pop / 💰 Gold (center):**
  - Tap → Expands to show growth rates (tooltip)
  - Format: `🏠 1,245` (compact, no decimals)
- **[⚙️] Settings (right):** Opens OptionsMenu modal

**Styling:**

```css
.mobile-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  padding-top: env(safe-area-inset-top, 0);
  background: rgba(0, 0, 0, 0.5); /* 50% transparency */
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}
```

**Touch Targets:**

- Hamburger/Settings buttons: 44×32px (full height clickable)
- Stats display: Tap anywhere on center text

---

## 5. Selection Feedback

### Visual Indicators

**Selected tile:**

```css
/* Highlight effect on selected tile */
.tile-selected {
  box-shadow:
    0 0 0 2px rgba(234, 179, 8, 1),
    /* Yellow border */ 0 0 12px 4px rgba(234, 179, 8, 0.4); /* Glow */
  z-index: 10;
}
```

**Valid placement targets (during build mode):**

```css
.tile-valid {
  background: rgba(34, 197, 94, 0.3); /* Green overlay */
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}
```

**Invalid targets:**

```css
.tile-invalid {
  background: rgba(239, 68, 68, 0.3); /* Red overlay */
}
```

### Haptic Feedback Patterns

```typescript
// Haptic feedback API (iOS/Android)
function haptic(type: "light" | "medium" | "heavy") {
  if ("vibrate" in navigator) {
    const patterns = {
      light: 10, // Selection, tap
      medium: 25, // Sidebar open/close
      heavy: 50, // Long-press trigger
    };
    navigator.vibrate(patterns[type]);
  }
}
```

**When to vibrate:**

- **Light (10ms):** Tile selection, button tap, popup open/close
- **Medium (25ms):** Sidebar slide in/out, mode change
- **Heavy (50ms):** Long-press triggered, action executed (build, attack)

---

## 6. Safe Areas & Viewport

### Viewport Meta Tag

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=yes"
/>
<meta name="theme-color" content="#4a5d23" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent"
/>
```

### CSS Safe Area Support

```css
/* Global safe area padding */
body {
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
}

/* Top bar safe area */
.mobile-top-bar {
  padding-top: env(safe-area-inset-top, 0);
  height: calc(32px + env(safe-area-inset-top, 0));
}

/* Context button safe area */
.context-button {
  bottom: max(16px, env(safe-area-inset-bottom, 0));
  right: max(16px, env(safe-area-inset-right, 0));
}

/* Map canvas container */
.game-canvas-container {
  padding-top: calc(32px + env(safe-area-inset-top, 0));
  padding-bottom: env(safe-area-inset-bottom, 0);
  height: 100vh;
  max-height: 100dvh; /* Dynamic viewport height (excludes browser chrome) */
}
```

### Notch/Island Handling (iPhone 14 Pro, etc.)

- **Top bar extends into notch area** (content shifts down via padding-top)
- **Context button respects home indicator** (bottom safe area inset)
- **Popups avoid rounded corners** (min 16px padding from edges)

---

## 7. Orientation Support

### Portrait (Primary)

- Default layout as shown above
- Context button: Bottom-right corner (thumb reach)
- Popups: Appear above button (vertical space)

### Landscape (Optimized)

```
┌──────────────────────────────────────┐
│ 🏠 245  💰 89              [≡][⚙️]   │
├────────────────────┬─────────────────┤
│                    │  Popup anchors  │
│  Game Board        │  to right       │
│  (Left 70%)        │  (if space)     │
│                    │                 │
│  Map stays         │  ┌────────────┐ │
│  visible           │  │ Actions... │ │
│                    │  └────────────┘ │
│                   [🎯]               │
└────────────────────┴─────────────────┘
```

**Changes in landscape:**

- Map: 70% width (still visible during popups)
- Popups: Anchor to right side instead of above button
- Context button: Stays bottom-right (reachable with right thumb)
- Sidebars: Max 50% width (vs 70% in portrait)

---

## 8. Accessibility

### ARIA Labels

```html
<button class="context-button" aria-label="Build structures" role="button">
  🏗️
</button>
```

**Dynamic label updates:**

```typescript
contextButton.setAttribute(
  "aria-label",
  selectedState === "enemy"
    ? "Attack enemy"
    : selectedState === "own"
      ? "Manage territory"
      : "Build structures",
);
```

### Keyboard Support (Optional, for desktop/tablet)

- **Escape:** Close popup or sidebar
- **Tab:** Focus next action in popup
- **Enter/Space:** Activate focused action
- **Arrow keys:** Navigate popup rows

### Focus Management

When popup opens:

1. Trap focus within popup
2. Focus first action row
3. Tab cycles through rows (wrap at bottom)
4. Escape closes → focus returns to context button

---

## 9. Performance Targets

| Metric                   | Target | Notes                                                            |
| ------------------------ | ------ | ---------------------------------------------------------------- |
| **Touch response**       | <50ms  | From tap to visual feedback                                      |
| **Context button morph** | <200ms | Icon swap + color change                                         |
| **Popup open**           | <250ms | Slide-in animation                                               |
| **Selection highlight**  | <16ms  | Single frame (60 FPS)                                            |
| **Gesture detection**    | <100ms | Long-press threshold check                                       |
| **Frame rate**           | 60 FPS | During animations (30 FPS acceptable during intensive rendering) |

---

## 10. Implementation Checklist

### Phase 1A: Viewport & Layout (Week 1)

- [ ] Update viewport meta tag (`viewport-fit=cover`)
- [ ] Add CSS safe area variables
- [ ] Create `.mobile-top-bar` component (32px, translucent)
- [ ] Create `.context-button` component (56×56px FAB)
- [ ] Test safe areas on iPhone 14 Pro / Pixel 6 Pro

### Phase 1B: Gestures (Week 1)

- [ ] Implement edge swipe detection (left/right, 20px threshold)
- [ ] Implement long-press detection (600ms, <10px movement tolerance)
- [ ] Implement double-tap detection (300ms window)
- [ ] Add haptic feedback (light/medium/heavy patterns)
- [ ] Test gesture conflicts (pinch while swiping, etc.)

### Phase 1C: Context Button (Week 2)

- [ ] Create `MobileContextButton.ts` component
- [ ] Implement 6 button states (icon + color mapping)
- [ ] Add morphing animation (200ms icon/color transition)
- [ ] Wire up selection → state change logic
- [ ] Add ARIA labels (dynamic based on state)
- [ ] Test on real device (tap responsiveness)

### Phase 1D: Selection System (Week 2)

- [ ] Add visual highlight to selected tile (yellow glow)
- [ ] Implement selection state tracking (currently selected tile/unit)
- [ ] Add double-tap to center camera
- [ ] Test selection → context button morphing flow

---

## 11. Design Decisions

**D1: Water tiles with no buildable options**

- **Decision:** Show 7th button state (🌊 Water, disabled) when water selected with no valid builds
- **Reasoning:** Clear feedback to user that tile type doesn't support construction
- **Implementation:** Add to context button state logic

**D2: Long-press countdown indicator**

- **Decision:** No visual countdown (keep UI clean)
- **Reasoning:** 600ms is fast enough, users learn the timing quickly
- **Alternative:** Can add as settings toggle in Phase 6 (Polish) if user feedback requests it

**D3: Haptic feedback intensity**

- **Decision:** Use standard OS patterns (light/medium/heavy) - no custom intensity settings
- **Reasoning:** Keep settings simple, OS handles device differences
- **Implementation:** `navigator.vibrate([50])` for light, `[100]` for medium, `[200]` for heavy

**D4: Context button position**

- **Decision:** Bottom-right always (no left-hand mode in v1)
- **Reasoning:** Right-handed majority, keeps implementation simple
- **Future:** Can add left-hand toggle in settings if user feedback requests (Phase 6+)

---

## 12. Desktop Component Mapping

| Desktop Component       | Mobile Equivalent | Changes                                             |
| ----------------------- | ----------------- | --------------------------------------------------- |
| **TopBar.ts**           | `MobileTopBar.ts` | Simplified to 32px, always visible, no `@lg:hidden` |
| **GameLeftSidebar.ts**  | Removed           | Replaced by hamburger → Intel sidebar               |
| **OptionsMenu.ts**      | Reused            | Triggered from [⚙️] button                          |
| **InputHandler.ts**     | Extended          | Add long-press, edge swipe, haptic feedback         |
| **TransformHandler.ts** | Extended          | Add safe area bounds checking                       |

---

## Next Steps

✅ **This doc:** Core interactions foundation  
⏭️ **MOBILE-02:** Build & Economy popups (depends on context button)  
⏭️ **MOBILE-03:** Combat & Attack popups (depends on context button)

**Ready for implementation:** Week 1-2 tasks can start once design is approved.
