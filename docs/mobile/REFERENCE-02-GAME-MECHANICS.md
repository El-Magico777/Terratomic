# Game Mechanics Reference

**Purpose:** Document core game logic that mobile UI must preserve (DO NOT CHANGE)  
**Last Updated:** February 9, 2026

---

## Critical Rule

**Mobile changes UI only. Game mechanics stay 100% identical to desktop.**

If desktop does it a certain way, mobile does it the same way (just with touch-friendly UI).

---

## Research System

### Multi-Priority Model (NOT Single-Research)

**Desktop behavior:**

- Players can prioritize **multiple techs simultaneously**
- All prioritized techs receive beakers **every tick**
- Beakers are **split evenly** across priorities

**Example:**

```
Investment: 5% research
Prioritized techs: [Roads, Hospitals, Academy]
Beakers per tick: 100

Each tech gets: 100 / 3 = 33.33 beakers per tick
```

**Data structure:**

```typescript
class PlayerView {
  researchPriorities: Set<string>; // Multiple techs
}
```

### Toggle, Not Cancel

**No "cancel research" action:**

- To stop researching: Tap tech row again (removes ⭐ priority)
- Progress is **preserved** (not lost)
- Can re-prioritize later to continue where you left off

**No refunds:**

- Beakers already spent are not returned
- This is intentional (prevents gaming the system)

### Investment Slider Location

**Desktop:** Research slider is **inside ResearchTreeModal header** (0-50% range)

**NOT** in ControlPanel2 Economy tab (that's Production/Road sliders only)

**Mobile must:** Keep slider in research sidebar header (same as desktop)

---

## Bomber Targeting

### Manual vs Auto

**Desktop behavior:**

1. **Manual targeting (before war):**
   - Use "Mark Target" action to set bomber priority on specific **player**
   - Marked player's structures get bombed first
   - Visible to allies (coordination feature)

2. **Auto targeting (during war):**
   - Bombers automatically target closest enemy structures
   - No user input required
   - Targets all structure types (City, Silo, Airfield, etc.)

**NO per-building selection:**

- Cannot choose "bomb only City" or "prioritize SAM Launchers"
- Desktop sends: `SendBomberIntentEvent(targetPlayer, allStructureTypes, closestFirst)`
- Bombers hit everything (closest first)

**Mobile must:** Same behavior - Mark Target for player priority, auto for everything else

---

## Naval Assault (Transport Ships)

### No Route Preview

**Desktop behavior:**

- Click "Naval Assault" → **instant launch**
- Server calculates `bestTransportShipSpawn(targetTile)` (expensive operation)
- No preview of ship path shown to user
- Ships auto-navigate to destination

**Mobile must:** Same instant launch (no route drawing)

---

## Attack Ratio

### Global Setting

**Desktop behavior:**

- One attack ratio setting (default 30%)
- Applies to **all attack types** (ground, naval, air)
- Changed via slider in ControlPanel
- Stored in `UIState.attackRatio`

**Calculation:**

```typescript
const troopsToSend = Math.floor(attackRatio * myPlayer.troops());
// Example: 30% of 1500 troops = 450 troops in attack
```

**Mobile must:** Same global ratio (long-press ⚔️ button shows slider)

---

## Build Validation

### Port Placement

**Rule:** Port requires **1 or more adjacent water tiles**

```typescript
function canBuildPort(tile: TileRef): boolean {
  const adjacentTiles = game.adjacentTiles(tile);
  return adjacentTiles.some((t) => game.isWater(t));
}
```

**Valid:**

```
[Water][Land-Port]  ← Port touches water
[Land ][Land     ]
```

**Invalid:**

```
[Land][Land]
[Land][Land-Port]  ← No adjacent water (2 tiles from ocean)
```

**Mobile must:** Use exact same validation

### Fighter Jet Placement

**Requirements:**

1. Must own Airfield
2. Jet Engines research unlocked
3. Can place on **land or water** (if you have airfield)

**Placement mode highlights valid tiles:**

- Green glow: Can place here
- Red overlay: Invalid tile

**Mobile must:** Same validation + visual feedback

---

## Nuclear Weapons

### Purchase Model (NOT Targeting Mode)

**Desktop behavior:**

- Nukes are **units in build menu** (like warships)
- Tap nuke option → **Instant purchase & launch**
- Auto-selects closest silo in range
- No complex targeting UI
- No double confirmation (same as other attacks)

**Nuke types:**
| Type | Cost | Blast Zone | Range | Research Required |
|------|------|------------|-------|-------------------|
| Atom Bomb | $5,000 | 3×3 (9 tiles) | 250 tiles | Nuclear Fission |
| H-Bomb | $15,000 | 5×5 (25 tiles) | 400 tiles | Thermonuclear Fusion |
| MIRV | $50,000 | 7×7 (49 tiles) | Global | MIRV Technology |

**Launch flow:**

```typescript
// User taps "☢️ Atom Bomb" in attack popup
// Nukes use the same build event as all other units:
eventBus.emit(new BuildUnitIntentEvent(UnitType.AtomBomb, targetTile));
// Server handles silo selection, range check, gold deduction automatically
```

**Mobile must:** Same simple purchase flow (no added complexity)

### Nuclear Defense

**Automated SAM intercept:**

- If you have SAM Launcher in range → **auto-intercept attempt**
- Success rates: 60% (Atom), 40% (H-Bomb), 20% (MIRV)
- No manual aiming required

**Evacuation option:**

- 3-tick warning toast appears
- User can tap "Evacuate Troops" (saves 50%)
- Structures still destroyed

**Mobile must:** Same automated defense + evacuation button

---

## Stack Mode & Multi-Build

### Desktop Implementation

**Stack mode:** May exist on desktop but **NOT visible in main UI** (possibly hidden setting or PC-only feature)

**Multi-build toggle:** May exist but not documented in mobile scope

**Mobile constraint:** Even if desktop has these, mobile **cannot implement** due to:

- Tile size ~40px on phones
- Precision tapping impossible (can't tap exact structure icon)
- Fat finger problem

**Mobile decision:** Stack mode + multi-build = **Desktop-only features**

**Mobile alternative:** Bulk build stepper (long-press item → select quantity → place multiple)

---

## Trade Ships

### Auto-Spawn Behavior

**Desktop behavior:**

- Trade ships **automatically spawn** when you own multiple cities
- NOT built from build menu (unlike other ships)
- Auto-navigate between your cities for trade routes

**Mobile must:** Same auto-spawn (no build menu entry for TradeShips)

---

## Submarine Detection

### Fog of War Rules

**Desktop behavior:**

- Submarines invisible unless detected (proximity or sonar)
- If not detected: "View Unit" option is **grayed out**
- Can still attempt "Attack Unit" (blind attack)
- No change to attack mechanics (just limited info)

**Mobile must:** Same detection rules (gray out tooltip if invisible)

---

## Alliance & Peace

### Request/Accept Flow

**Desktop behavior:**

1. Player A: Propose Alliance → Event sent
2. Player B: Receives notification in EventsDisplay
3. Player B: Clicks "Accept" or "Reject" inline button
4. If accepted: Both players become allies

**No expiration timers:**

- Alliance requests stay in event feed until dismissed
- No auto-expire after X ticks

**Mobile must:** Same flow (events in Intel sidebar, inline Accept/Reject)

---

## Declare War

### Confirmation Required

**Desktop behavior:**

- Only action with confirmation dialog
- "Declare war on Player2?" [Cancel] [Confirm]
- Prevents accidental wars

**Other attacks:**

- Ground Attack: No confirmation (instant)
- Naval Assault: No confirmation
- Air Strike: No confirmation
- Bomber Run: No confirmation

**Mobile must:** Confirm only for Declare War (others instant)

---

## Economy Triple Constraint

### Production + Road + Research ≤ 100%

**Desktop behavior:**

- Sum of three sliders cannot exceed 100%
- If user drags one slider up, others auto-reduce
- Lock toggles prevent specific sliders from auto-adjusting

**Example:**

```
Production: 50% (locked 🔒)
Road: 30%
Research: 20%

User drags Research to 40%:
→ Production stays 50% (locked)
→ Road auto-reduces to 10% (to maintain 100% total)
```

**Mobile must:** Same triple constraint + lock system

---

## Victory Conditions

**Not changed by mobile UI** - all victory logic stays server-side

---

## Tick System

**Game runs in ticks (server-controlled):**

- Troops generate per tick
- Beakers accumulate per tick
- Ships move per tick
- Timers count down per tick

**Mobile changes:** None (UI just displays tick count)

---

## Fog of War

**Visibility rules (server-side):**

- Can see tiles you own
- Can see tiles adjacent to your territory
- Can see enemy units in visible range
- Allied territories visible

**Mobile changes:** None (UI just renders visible tiles)

---

## Next Steps

- See `REFERENCE-01-DESKTOP-COMPONENTS.md` for UI component mapping
- See `REFERENCE-03-PROJECT-SCOPE.md` for what mobile can/cannot change
- See `REFERENCE-04-EVENT-SYSTEM.md` for exact event signatures
