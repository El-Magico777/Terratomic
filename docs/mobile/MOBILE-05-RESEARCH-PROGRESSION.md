# MOBILE-05: Research & Progression System

**Part of:** Terratomic Mobile UI Redesign  
**Dependencies:** MOBILE-01 (Core Interactions), MOBILE-02 (Economy investments)  
**Status:** Design Phase  
**Last Updated:** February 9, 2026

---

## Overview

This document defines the **technology research system** on mobile. The desktop ResearchTreeModal component is reused with minimal changes—it's already well-designed for mobile adaptation.

### Scope & Boundaries

**CRITICAL: This is UI adaptation only**

✅ **What changes:**

- Swipe-from-right sidebar replaces center modal
- CSS Grid 2×2 → 1 column (portrait phones)
- Long-press tooltips replace hover
- 72px row height (vs 48px desktop) for touch targets

❌ **What does NOT change:**

- Research mechanics (multi-priority system, beakers accumulation, tech unlocks)
- Priority toggle logic (Set<string> of prioritized techs)
- Investment calculations (beakers split across priorities)
- Event emissions (SendResearchTreeSelectIntentEvent identical)
- **Desktop UI (ResearchTreeModal.ts untouched)**

**Approach:** Wrap existing ResearchTreeModal in mobile sidebar. Same component, mobile-friendly wrapper.

---

### Design Philosophy

**Don't rebuild what works.** The tech tree component already exists—just adapt layout for touch.

---

## 1. Research Sidebar (Swipe from Right)

### Trigger: Swipe from right edge OR tap [🔬 Research] quick link

```
┌─────────────┬─────────────────┐
│             │ ✕ Research      │
│             │ Investment: 5%  │   ← Slider in header
│    MAP      │ ┌─────────────┐ │   70% screen width
│  (dimmed    │ │ Land        │ │   Slides in from right
│   30%)      │ │ ⭐ Roads 45% │ │   Map stays visible
│             │ │ ☆ Hospital  │ │   Scrollable grid
│             │ └─────────────┘ │
│             │ ┌─────────────┐ │
│             │ │ Sea         │ │
│             │ │ ☆ Ports     │ │
│             │ └─────────────┘ │
└─────────────┴─────────────────┘
```

**Sidebar Properties:**

- **Width:** 70% screen (portrait), 50% (landscape)
- **Background:** Dark semi-transparent (95% opacity)
- **Map behind:** Dimmed to 30% opacity (still visible)
- **Layout:** Vertical scrollable list, 4 category sections (Land/Sea/Air/Nuclear)
- **Slide animation:** 0.25s ease-out from right
- **Dismissal:** Swipe left, tap outside, tap ✕ button

---

## 2. Research Grid Component (Reused)

### Desktop Component: ResearchTreeModal.ts

**Actual Implementation:**

- **Lit-based** CSS Grid layout (NOT D3/tree visualization)
- **4 categories:** Land, Sea, Air, Nuclear (2×2 grid on desktop, 1 column on mobile)
- **Vertical lists:** Each category shows techs as simple vertical list
- **Priority toggles:** ⭐ Prioritized / ☆ Prioritize buttons (multi-select allowed)
- **Progress bars:** Show % completion (beakers accumulated)
- **Investment slider:** Built into modal header (0-50% allocation)

**Desktop Reality (Not What Was Documented):**

- ❌ NO D3 tree with nodes/edges
- ❌ NO pinch zoom/pan
- ❌ NO parent-child visual connections
- ✅ Simple scrollable grid with tech lists
- ✅ Priority system (multiple techs can be prioritized simultaneously)
- ✅ Beakers split across all prioritized techs

**Mobile Optimizations:**

```typescript
// Increase row height for touch targets
const rowHeight = isMobile ? 72 : 48; // Larger rows

// Switch to single column on mobile
const gridColumns = isMobile ? 1 : 2; // Portrait: 1 col, Desktop: 2×2

// Remove hover tooltips, use tap for details
if (isMobile) {
  techRow.removeEventListener('mouseover', showTooltip);
  techTech Row Interaction

### Tap Tech Row → Toggle Priority

**Primary Action: Priority Toggle**
```

Tap tech row → Toggles ⭐ Prioritized ↔ ☆ Not Prioritized

```

**Visual States:**
- **⭐ Prioritized** - Yellow background, receives beakers this tick
- **☆ Available** - Gray, not receiving beakers
- **🔒 Locked** - Red, prerequisites not met (can still be "pre-prioritized")

**Multi-Priority System:**
Desktop supports **multiple simultaneous priorities**. All prioritized techs receive beakers proportionally each tick.

**Example:**
```

Prioritized: Roads (⭐), Hospitals (⭐), Academy (⭐)
Investment: 5% → Split 3 ways
Roads gets: 1.67% per tick
Hospitals: 1.67% per tick  
Academy: 1.67% per tick

```

### Long-Press Tech Row → Show Details

```

┌─────────────────┐
│ ✕ Jet Engines │ ← Toast overlay
├─────────────────┤
│ Cost: 500 🧪 │
│ │
│ Unlocks: │
│ • Air Strike │
│ • Fighter Jets │
│ │
│ Requires: │
│ ✓ Airfield │
│ ✗ Advanced │
│ Aerodynamics │
└─────────────────┘

```Multi-Tech Progress Display

### Sidebar Header Shows All Prioritized Techs

```

┌─────────────────────────────┐
│ Investment: 5% [Lock 🔒] │ ← Slider + lock toggle
│ ┌─────────────────────────┐ │
│ │ ⭐ Roads 45% ░░░░ │ │ ← Each prioritized tech
│ │ ⭐ Hospitals 30% ░░░ │ │ gets progress bar
│ │ ⭐ Academy 10% ░ │ │
│ └─────────────────────────┘ │
│ Beakers split 3 ways │
└─────────────────────────────┘

```

**How It Works:**
- Desktop allows **multiple simultaneous priorities** (Set<string>)
- All prioritized techs accumulate beakers **every tick**
- Investment % is **split evenly** across all priorities
- Techs auto-complete when beakers ≥ cost

**No "Cancel Research" Action:**
- Desktop has no cancel button
- To stop: tap tech row again to remove ⭐ priority
- Progress is preserved (can re-prioritize later)

**Investment Lock:**
- Double-tap slider to lock/unlock
- Locked sliders protected from auto-reduction (when total >100%)
- Same lock system as economy overlay (MOBILE-02) │
│ ┌─────────────────────────┐ │
│ │░░░░░░░░░░            │ │ ← Progress bar
│ └─────────────────────────┘ │
│ Investment: 5% per tick     │
│ [Adjust] [Cancel]           │
└─────────────────────────────┘
```

**Actions:**

- **Adjust:** Opens investment slider (same as economy overlay)
- **Cancel:** Stops researcBuilt Into Sidebar)

### Investment Slider in Research Modal Header

**Desktop Implementation:**

- ResearchTreeModal has **built-in slider** in header (0-50% max)
- NOT in separate economy overlay
- Slider renders at top of modal (always visible when scrolling techs)

```
┌─────────────────────────────┐
│ Research Investment:        │
│ ┌─────────────────────────┐ │ ← Slider in header
│ │━━━━━━━━━░░░░░░░░░░░░░░│ │   (part of modal)
│ └─────────────────────────┘ │
│ 5% per tick  [Lock 🔒]      │
│                             │
│ [Land] [Sea] [Air] [Nuclear]│ ← Category tabs
│ ⭐ Roads (45%) ░░░░          │
│ ☆ Hospitals                 │
└─────────────────────────────┘
```

**Slider Behavior:**

- Range: 0-50% (max allocation)
- Changes emit DOM `CustomEvent(INVESTMENT_REQUEST_EVENT)` (not EventBus)
- ControlPanel2 coordinates with Prod/Road sliders
- Lock icon prevents accidental changes (double-tap to lock/unlock)

**Mobile Reuse:**

- Keep slider in modal header (don't move to economy overlay)
- Makes research self-contained
- Prod/Road sliders stay in economy overlay (MOBILE-02) │
  │ [View Research Tree] ➜ │ ← Quick link
  └─────────────────────────────┘

```

**Tapping "Research: 5%":**
- Opens slider to adjust % (0-100%)
- Shows estimate: "At 10%, Roads complete in ~12 ticks"
- Changes apply immediately

---

## 6. Research Quick Link (Build Popup)
Category Navigation & Scrolling

### Category Sections

Desktop shows 4 categories in 2×2 grid. Mobile: vertical stack.

```

┌──────────────────┐
│ [Land] │ ← Category 1
│ ⭐ Roads (45%) │
│ ☆ Hospitals │
│ ☆ Academy │
├──────────────────┤
│ [Sea] │ ← Category 2
│ ☆ Ports │
│ ☆ Advanced Nav │
├──────────────────┤
│ [Air] │ ← Category 3
│ 🔒 Jet Engines │ (locked)
├──────────────────┤
│ [Nuclear] │ ← Category 4
│ 🔒 Fission │
└──────────────────┘

````

**Scrolling Behavior:**
- One-finger drag scrolls sidebar vertically
- All 4 categories scroll together (single scrollable list)
- No horizontal scroll (single column layout)
- Momentum scrolling (native iOS/Android behavior)
- Rubber-band bounce at top/bottom

---

## 3. Implementation Checklist

### Phase 5A: Research Sidebar (Week 8)
- [ ] Create `MobileResearchSidebar.ts` component
- [ ] Implement swipe-from-right detection (20px edge threshold)
- [ ] Wrap ResearchTreeModal component in sidebar container
- [ ] Add slide-in animation (0.25s ease-out from right)
- [ ] Dim map to 30% opacity when sidebar open
- [ ] Add ✕ close button in header
- [ ] Test swipe-to-dismiss gesture (swipe left to close)

### Phase 5B: Grid Layout Mobile Adaptation (Week 8)
- [ ] Modify ResearchTreeModal: Grid columns (2×2 → 1 column on mobile)
- [ ] Increase tech row height to 72px (desktop: 48px)
- [ ] Switch grid layout: 2×2 → 1 column (portrait phones)
- [ ] Disable hover tooltips, wire up long-press for tech details
- [ ] Test priority toggle (tap tech row to toggle ⭐/☆)
- [ ] Test smooth vertical scrolling on real device

### Phase 5C: Multi-Priority Display (Week 9)
- [ ] Show ALL prioritized techs in sidebar header (not just one)
- [ ] Add progress bars for each prioritized tech
- [ ] Wire up priority toggles to game state
- [ ] Implement event: `SendResearchTreeSelectIntentEvent(techId)`
- [ ] Handle pre-prioritization (can prioritize locked techs)
- [ ] Test beakers split calculation (multiple priorities)
- [ ] Verify research progress updates every tick

### Phase 5D: Investment Slider Integration (Week 9)
- [ ] Keep investment slider in modal header (DON'T move to economy overlay)
- [ ] Add lock toggle (double-tap to lock/unlock slider)
- [ ] Emit DOM `CustomEvent(INVESTMENT_REQUEST_EVENT)` on slider change
- [ ] Coordinate with ControlPanel2 (prod/road sliders need to rebalance if over 100%)
- [ ] Test real-time progress updates (beakers accumulated every tick)
- [ ] Show estimated completion time for prioritized techs

---

## 4. Desktop Component Modifications

| Desktop Component | Mobile Changes | Reason |
|------------------|----------------|--------|
| **ResearchTreeModal.ts** | Wrap in `MobileResearchSidebar.ts` | Sidebar from right, not center modal |
| **Grid layout** | 2×2 grid → 1 column | Portrait phone screen |
| **Row height** | 48px → 72px | Larger touch targets |
| **Hover tooltips** | Long-press for tooltip | No hover on mobile |
| **Priority toggle** | Same (tap to toggle ⭐/☆) | Already touch-friendly |
| **Investment slider** | Keep in header | Self-contained modal |
| **Category layout** | Vertical stack (no tabs) | Scrollable list |

**Implementation:**
```typescript
// In ResearchTreeModal.ts
const isMobile = MobileDetector.isMobile();
const gridColumns = isMobile ? 1 : 2; // Mobile: 1 column, Desktop: 2×2
const rowHeight = isMobile ? 72 : 48; // Larger rows for touch

// Remove hover tooltips on mobile
if (isMobile) {
  techRow.removeEventListener('mouseover', showTooltip);
  techRow.addEventListener('pointerdown', handleLongPress);
}
````

**Lines of code change:** ~30 (mostly CSS grid adjustments + event handler switches)

---

## 5. Performance Considerations

### CSS Grid Rendering on Mobile

**Optimization:**

- Simple vertical scrolling (no complex rendering)
- CSS Grid container with 1 column on mobile (4 rows for categories)
- Smooth scroll with native momentum

**No Special Optimizations Needed:**

- ✅ Desktop already uses simple CSS Grid (not D3 visualization)
- ✅ No zoom/pan interactions (just vertical scroll)
- ✅ No node culling needed (all techs visible in scrollable list)
- ✅ CSS transforms handle 60 FPS scrolling natively

**Mobile-Specific Changes:**

```typescript
// Switch to single column on mobile
const gridColumns = isMobile ? 1 : 2; // Desktop: 2×2 grid, Mobile: 1 column

// Larger touch targets
const rowHeight = isMobile ? 72 : 48;

// Remove hover tooltips
if (isMobile) {
  techRow.addEventListener("pointerdown", handleLongPress);
}
```

**Frame Rate Target:**

- 60 FPS list scrolling (standard browser performance)
- Instant priority toggles (simple DOM class swap)

---

## 7. Accessibility

### ARIA Labels

```html
<button
  class="research-tech-row"
  aria-label="Toggle priority for Jet Engines technology"
>
  ✈️ Jet Engines
</button>

<div
  class="research-detail-tooltip"
  role="tooltip"
  aria-label="Jet Engines research details"
>
  ...
</div>
```

### Keyboard Support (Optional)

- **Arrow keys:** Navigate tech list (up/down)
- **Enter:** Toggle priority on selected tech
- **Escape:** Close detail tooltip
- **Tab:** Move between category sections

---

## Next Steps

✅ **MOBILE-01:** Core interactions  
✅ **MOBILE-02:** Build & Economy  
✅ **MOBILE-03:** Combat & Attack  
✅ **MOBILE-04:** Diplomacy & Intel  
✅ **This doc:** Research & Progression  
⏭️ **MOBILE-06:** Implementation guide (technical details)  
⏭️ **MOBILE-07:** Testing & QA requirements

**Simplest Part:** Research reuses 90% of existing desktop component. Main work is sidebar wrapper and touch optimizations.
