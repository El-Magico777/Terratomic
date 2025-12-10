# Research Tree UI Mockup

## **Research Tree Overview**

2x2 Grid layout for compact visibility. Quick glance at all branches and their progress.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ R&D                                          Investment: [10%] [25%] [50%]  │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 🌊 SEA                               │ 🪖 LAND                              │
│ ├─ Missile Navy  ████░░ 40% [☆]      │ ├─ Mil. Academy  ██░░░░ 15% [☆]      │
│ ├─ Adv. Fleet    🔒 Locked           │ ├─ SAM Systems   🔒 Locked           │
│ └─ Nuclear Subs  🔒 Locked           │ └─ Doomsday      🔒 Locked           │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ✈️ AIR                               │ 💰 ECONOMY                           │
│ ├─ Paratroopers  ███░░░ 25% [⭐]     │ ├─ Roads & Hosp. ██████ 65% [☆]      │
│ ├─ Adv. Jets     🔒 Locked           │ ├─ Int. Trade    🔒 Locked           │
│ └─ Naval Strike  🔒 Locked           │ └─ Insurance     🔒 Locked           │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## **Unlock Mechanic: Beaker Investment + Priority**

### **How It Works**

1. **Investment Control** - Toggle between 10%, 25%, or 50% of income invested in research.
2. **Random progression** - Techs unlock naturally based on investment.
3. **Priority system** - "Prioritize" a specific tech to focus research points into it.
4. **Sequential unlocks** - Must unlock Tier 1 before Tier 2, etc.

### **UI Interaction**

```
┌─────────────────────────────────────────────────────────────────┐
│ R&D                                Investment: [10%] [25%] [50%]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Click [☆ Prioritize] on any available tech to focus research.  │
│                                                                 │
│  [⭐ Prioritized] turns Orange/Gold to indicate focus.          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  LOCKED     │   │  AVAILABLE  │   │  PRIORITY   │   │  COMPLETE   │
│  (grey)     │   │  (glowing)  │   │  (gold)     │   │  (green)    │
├─────────────┤   ├─────────────┤   ├─────────────┤   ├─────────────┤
│   🔒        │   │   ✨        │   │   ⭐        │   │   ✅        │
│             │   │             │   │  ████░░ 67% │   │             │
│  Requires   │   │  Click to   │   │  Researching│   │  Unlocked!  │
│  prev tech  │   │  prioritize │   │  faster     │   │             │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

---

## **Color Coding by Category**

| Category   | Color       | Hex       |
| ---------- | ----------- | --------- |
| 🌊 Sea     | Blue        | `#3498db` |
| 🪖 Land    | Green       | `#2ecc71` |
| ✈️ Air     | Purple      | `#9b59b6` |
| 💰 Economy | Gold/Yellow | `#f1c40f` |
| ★ Focus    | Orange      | `#f39c12` |
