# MOBILE-03: Combat & Warfare System

**Part of:** Terratomic Mobile UI Redesign  
**Dependencies:** MOBILE-01 (Core Interactions), MOBILE-02 (Build system for fighter jets)  
**Status:** Design Phase  
**Last Updated:** February 9, 2026

---

## Overview

This document defines all **combat actions** on mobile and provides the **complete RadialMenu migration**. Desktop's right-click radial menu (7 slots) is replaced by context-aware popups with text labels.

### Scope & Boundaries

**CRITICAL: This is UI adaptation only**

✅ **What changes:**

- Text popups replace RadialMenu.ts (D3 pie slices → labeled rows)
- Tap ⚔️ button replaces right-click
- Long-press overlays replace hover tooltips

❌ **What does NOT change:**

- Combat mechanics (attack ratios, troop calculations, bomber targeting)
- Event emissions (SendAttackIntentEvent, SendBoatAttackIntentEvent, etc. identical)
- Validation logic (canGroundAttack, canNavalAssault exact same as desktop)
- Nuclear weapons mechanics (blast zones, SAM intercept, evacuation)
- **Desktop UI (RadialMenu.ts untouched)**

**Approach:** RadialMenu actions → popup rows. Same events, same validation, touch-friendly UI.

---

### Critical Goal

**100% feature parity** with desktop RadialMenu.ts - no combat actions lost.

---

## 1. Attack Popup (Enemy Territory)

### Trigger: ⚔️ Context Button (Enemy Land/Structure Selected)

```
┌───────────────────┐
│ 🪖 Ground Attack  │ ← 72px tall rows
│ 🚢 Naval Assault  │   (if coastal + port)
│ ✈️ Air Strike     │   (if airfield + jets)
│ 💣 Bomber Run     │   (if airfield + in range)
│ 🎯 Mark Target    │   (bomber priority targeting)
│ ────────────────  │
│ ☢️ Atom Bomb      │   (if silo + $5k + research unlocked)
│ 💥 H-Bomb         │   (if silo + $15k + H-bomb research)
│ 🚀 MIRV           │   (if silo + $50k + MIRV research)
│ ────────────────  │
│ ⚔️ Declare War    │   (if not at war)
│ 👁️ View Intel     │   (player stats)
└───────────────────┘
```

**Popup Properties:**

- **Position:** Above ⚔️ button (or left/right if near edge)
- **Background:** Semi-transparent dark (90%), red accent border
- **Tap outside:** Closes popup
- **Nuclear options:** Only appear if you own Missile Silo + have research + can afford
- **Mark Target:** Sets bomber priority for this player's structures

---

## 2. Attack Actions Detail

### 2.1 Ground Attack (Primary)

**Desktop Equivalent:** RadialMenu center button (sword icon)

**Triggers When:**

- Enemy territory selected
- You have troops available
- Not in peace timer phase

**Action Flow:**

1. User taps ⚔️ → Popup opens
2. User taps "🪖 Ground Attack"
3. Popup closes
4. **Executes:** `SendAttackIntentEvent(targetID, attackRatio * myPlayer.troops())`
5. Toast notification: "Attacking with 450 troops" (3s)

**Uses Attack Ratio:**

- From economy overlay (default 30%)
- Adjust via long-press ⚔️ button

**Validation:**

```typescript
function canGroundAttack(target: TileRef): boolean {
  const owner = game.owner(target);
  if (owner === game.myPlayer()) return false; // Can't attack self

  const peaceTimer = game.peaceTimerEndsAtTick();
  if (peaceTimer && game.ticks() < peaceTimer) {
    return owner.isPlayer() === false; // Can attack neutral during peace
  }

  return game.myPlayer().troops() > 0;
}
```

---

### 2.2 Naval Assault

**Desktop Equivalent:** RadialMenu Boat slot (ship icon)

**Triggers When:**

- Coastal enemy territory selected
- You have a port
- Target is reachable by water

**Action Flow:**

1. User taps "🚢 Naval Assault"
2. **Backend calculates:** `bestTransportShipSpawn(targetTile)` (expensive operation)
3. If valid spawn found → Ships launch
4. **Executes:** `SendBoatAttackIntentEvent(targetID, targetTile, troops, null)`
5. Toast: "Naval assault launched" (3s)

**Special Logic:**

- Transport boat spawns automatically (NOT from build menu)
- Uses same attack ratio as ground attack
- If no valid spawn: Shows toast "No valid port for naval route"

**Validation:**

```typescript
function canNavalAssault(target: TileRef): boolean {
  // Must have port
  if (game.myPlayer().units(UnitType.Port).length === 0) return false;

  // Must be coastal target
  if (!game.isCoastal(target)) return false;

  // Must have transport ship unlocked (check buildableUnits)
  const transportShip = game
    .myPlayer()
    .actions(target)
    .buildableUnits.find((u) => u.type === UnitType.TransportShip);

  return transportShip?.canBuild === true;
}
```

---

### 2.3 Air Strike (Paratrooper)

**Desktop Equivalent:** RadialMenu AirAttack slot (paratrooper icon)

**Triggers When:**

- Enemy land target selected
- You have airfield(s)
- Jet Engines technology researched
- Target is land (not water)

**Action Flow:**

1. User taps "✈️ Air Strike"
2. **Executes:** `SendParatrooperAttackIntentEvent(targetID, targetTile, troops)`
3. Toast: "Air strike launched" (3s)

**Validation:**

```typescript
function canAirStrike(target: TileRef): boolean {
  const player = game.myPlayer();

  // Must have Jet Engines upgrade
  if (!player.hasUpgrade(UpgradeType.JetEngines)) return false;

  // Must have at least one airfield
  if (player.units(UnitType.Airfield).length === 0) return false;

  // Must be land target
  if (!game.isLand(target)) return false;

  // Must be enemy
  const owner = game.owner(target);
  if (owner === player || !owner.isPlayer()) return false;

  // Check peace timer
  const peaceTimerEndsAtTick = game.peaceTimerEndsAtTick();
  if (peaceTimerEndsAtTick && game.ticks() < peaceTimerEndsAtTick) {
    return false;
  }

  return true;
}
```

---

### 2.4 Bomber Run

**Desktop Equivalent:** RadialMenu Bomber slot (airfield icon)

**Triggers When:**

- Enemy land target selected
- You have active airfield(s)
- Enemy has structures on their territory
- Target is within bomber range
- At war with target player

**Action Flow:**

1. User taps "💣 Bomber Run"
2. **Executes:** `SendBomberIntentEvent(targetPlayer, allStructureTypes, closestFirst=true)` ✅
3. Targets all structure types with closest-first priority
4. Toast: "Bomber run launched against Player2" (3s)

**Validation:**

```typescript
function canBomberRun(target: TileRef): boolean {
  const player = game.myPlayer();
  const owner = game.owner(target) as PlayerView;

  // Must have airfield
  if (player.units(UnitType.Airfield).length === 0) return false;

  // Must be land
  if (!game.isLand(target)) return false;

  // Must be enemy player
  if (owner === player || !owner.isPlayer()) return false;

  // Must be at war
  if (!player.isAtWarWith(owner)) return false;

  // Check if any airfield can reach target
  const airfields = player.units(UnitType.Airfield);
  for (const airfield of airfields) {
    if (!airfield.isActive()) continue;

    const range = game.config().bomberTargetRange(airfield.bomberLevel() ?? 1);
    const dist = Math.sqrt(game.euclideanDistSquared(airfield.tile(), target));

    if (dist <= range) return true;
  }

  return false;
}
```

**Target Priority (all structures):**

```typescript
const allStructures = [
  UnitType.City,
  UnitType.DefensePost,
  UnitType.SAMLauncher,
  UnitType.MissileSilo,
  UnitType.Port,
  UnitType.Airfield,
  UnitType.Hospital,
  UnitType.Academy,
  UnitType.ResearchLab,
  UnitType.Factory,
  UnitType.DoomsdayDevice,
];
```

---

### 2.5 Declare War

**Desktop Equivalent:** RadialMenu Peace slot (war icon, dark red)

**Triggers When:**

- Allied or neutral territory selected
- NOT currently at war with them

**Action Flow:**

1. User taps "⚔️ Declare War"
2. Confirmation dialog: "Declare war on Player2?" [Cancel] [Confirm]
3. If confirmed → `SendDeclareWarIntentEvent(myPlayer, targetPlayer)`
4. Toast: "War declared on Player2" (3s)

**Validation:**

```typescript
function canDeclareWar(target: TileRef): boolean {
  const owner = game.owner(target);
  if (!owner.isPlayer()) return false; // Can't declare war on neutral
  if (owner === game.myPlayer()) return false; // Can't attack self

  // Can only declare if NOT at war
  return !game.myPlayer().isAtWarWith(owner as PlayerView);
}
```

**UI Changes:**

- In Attack popup, "Declare War" shows in **dark red** (#8B0000)
- Uses war icon (crossed swords) instead of attack icon

---

### 2.6 Mark Target (Bomber Priority)

**Trigger:** Tap "🎯 Mark Target" in attack popup (enemy only)

**Action Flow:**

1. User taps "🎯 Mark Target"
2. Confirmation: "Mark Player2 as attack target? Visible to allies." [Cancel] [Mark]
3. If confirmed → `SendTargetPlayerIntentEvent(targetID)`
4. Toast: "Player2 marked as target"
5. Target player's territory highlighted red on map (for you + allies)
6. Pin icon appears on leaderboard next to their name

**Visual Changes:**

```
Map:
╔═══════════════╗
║ Player2 🎯    ║ ← Red glowing border on all their tiles
║ (Target)      ║   Visible to you and allies
╚═══════════════╝

Leaderboard:
┌─────────────────┐
│ 🎯 Player2      │ ← Pin icon
│ 150 cities      │
└─────────────────┘
```

**Bomber Coordination:**

- Marked targets get bomber priority: bombers target their structures first
- Allies see your marked targets
- Useful for coordinating multi-player attacks
- Can unmark by tapping again ("🎯 Unmark Target")

**Validation:**

- Only available for enemy players
- Cannot mark neutral/allied players
- Cannot mark yourself

---

### 2.7 View Intel (from Attack popup)

**Desktop Equivalent:** RadialMenu Info slot

**Action Flow:**

1. User taps "👁️ View Intel"
2. Popup closes
3. Opens Intel sidebar (MOBILE-04) with selected player's details
4. Shows: Stats, units, relation, territory count

---

## 3. Attack Enemy Unit

### Trigger: ⚔️ Context Button (Enemy Boat/Submarine Selected)

```
┌───────────────────┐
│ ⚓ Attack Unit    │ ← Direct unit targeting
│ 🚢 Naval Assault  │   (if you have boats)
│ ✈️ Air Strike     │   (if airfield + jets)
│ ────────────────  │
│ 👁️ View Unit      │   (if visible - subs may not be)
└───────────────────┘
```

**Behavior:**

- "Attack Unit" targets the specific unit (not general territory attack)
- Naval Assault / Air Strike work same as attacking territory
- Submarines only show "View Unit" if detected (proximity/sonar)

---

## 4. Attack Ratio Adjustment

### Trigger: Long-press ⚔️ button (0.6s hold)

Instead of opening popup, shows **inline slider**:

```
┌─────────────────────────────┐
│ ⌄ Attack Ratio         [✕]  │
├─────────────────────────────┤
│ 30%                         │
│ ┌─────────────────────────┐ │
│ │░░░░░░░░          🔘    │ │ ← 48px tall slider
│ └─────────────────────────┘ │
│ 450 / 1,500 troops          │
│                             │
│ Adjust how many troops      │
│ participate in attacks      │
└─────────────────────────────┘
```

**Persistence:**

- Change applies immediately to next attack
- Saved in UIState (same as desktop)
- Swipe down or tap ✕ to close

---

## 5. Nuclear Weapons (Purchasable Attack Units)

### Trigger: Tap Nuclear Option in Attack Popup

**Nukes are units** (like warships) that you purchase and launch instantly.

**Action Flow:**

1. Select enemy tile → Tap ⚔️ → Attack popup opens
2. If you have Missile Silo + research + gold → Nuke options appear
3. Tap "☢️ Atom Bomb" → **Instant purchase & launch**
4. Event emitted: `BuildUnitIntentEvent(UnitType.AtomBomb, targetTile)`
5. Toast: "Atom Bomb launched! (-$5,000)" (3s)

**No Complex Targeting:**

- Launches from closest silo in range
- Hits selected tile immediately
- No confirmation dialog (same as other attacks)
- Blast zone is automatic (3×3, 5×5, or 7×7 based on nuke type)

---

### 5.1 Nuclear Weapon Types

| Type             | Area           | Unlocked By          | Cost    | Range     |
| ---------------- | -------------- | -------------------- | ------- | --------- |
| **☢️ Atom Bomb** | 3×3 (9 tiles)  | Nuclear Fission      | $5,000  | 250 tiles |
| **💥 H-Bomb**    | 5×5 (25 tiles) | Thermonuclear Fusion | $15,000 | 400 tiles |
| **🚀 MIRV**      | 7×7 (49 tiles) | MIRV Technology      | $50,000 | Global    |

**Validation:**

```typescript
function canLaunchNuke(
  target: TileRef,
  nukeType: "atom" | "hbomb" | "mirv",
): boolean {
  const silos = game.myPlayer().units(UnitType.MissileSilo);
  if (silos.length === 0) return false; // No silos

  const cost =
    nukeType === "atom" ? 5000 : nukeType === "hbomb" ? 15000 : 50000;
  if (game.myPlayer().gold() < cost) return false; // Can't afford

  // Check if any silo can reach target
  const maxRange =
    nukeType === "atom" ? 250 : nukeType === "hbomb" ? 400 : Infinity;
  for (const silo of silos) {
    if (!silo.isActive()) continue;
    const dist = game.distance(silo.tile(), target);
    if (dist <= maxRange) return true;
  }

  return false; // No silo in range
}
```

**Effects:**

- Destroys all units + structures in blast area
- Creates radiation zone (5/10/15 ticks, prevents settling)
- All players notified in Events feed
- Animation: Missile flies from silo → explosion at target

---

### 5.2 Nuclear Defense

**When enemy launches nuke at you:**

**Detection Toast (3-tick warning):**

```
┌───────────────────────────┐
│ ⚠️ NUCLEAR LAUNCH DETECTED│
│ Incoming: Atom Bomb       │
│ Target: Your Capital      │
│ ETA: 3 ticks              │
│                          │
│ [Evacuate Troops]        │ ← Only option if no SAM
└───────────────────────────┘
```

**Tap "Evacuate Troops":**

- Troops flee blast zone (saves 50%)
- Structures still destroyed
- 1-tick window to evacuate

**If you have SAM Launcher in range:**

- Automatic intercept attempt (no user action needed)
- Success rate: 60% (Atom), 40% (H-Bomb), 20% (MIRV)
- If successful: Toast "Nuke intercepted!" + mid-air detonation
- If failed: Normal blast

**No complex intercept UI** - just automated defense + evacuation option

---

## 6. Deploy Own Unit

### Trigger: ✈️ Context Button (Own Boat/Airfield Selected)

```
┌───────────────────┐
│ 🎯 Select Target  │
│ 🗺️ Show Range     │
│ ⚙️ Upgrade Unit    │
│ ────────────────  │
│ 🚮 Disband        │
└───────────────────┘
```

**Actions:**

**6.1 Select Target**

- Popup closes
- Map shows range overlay (circle around unit)
- Tap destination → Unit moves/attacks
- For transport ships: Shows reachable coastal tiles

**6.2 Show Range**

- Draws range circle on map (remains visible)
- Popup stays open (can select other actions)

**6.3 Upgrade Unit**

- Shows upgrade tree (if available)
- Tap upgrade → Confirm → Cost deducted
- Example: Airfield Level 1 → Level 2 (bomber range +50%)

**6.4 Disband**

- Confirmation: "Disband unit? No refund." [Cancel] [Confirm]
- Removes unit from game

**Long-press ✈️:** Shows unit stats (health, movement range, cargo, level)

---

## 7. RadialMenu Migration - Complete Mapping

### Desktop → Mobile Coverage Table

| Desktop RadialMenu Slot                  | Mobile Context Popup                               | Trigger                             | Status         |
| ---------------------------------------- | -------------------------------------------------- | ----------------------------------- | -------------- |
| **Center Button (Sword, Ground Attack)** | ⚔️ Attack → "🪖 Ground Attack"                     | Select enemy tile → Tap ⚔️          | ✅ Implemented |
| **Boat (Transport Ship)**                | ⚔️ Attack → "🚢 Naval Assault"                     | Select coastal enemy → Tap ⚔️       | ✅ Implemented |
| **AirAttack (Paratrooper)**              | ⚔️ Attack → "✈️ Air Strike"                        | Select enemy tile → Tap ⚔️          | ✅ Implemented |
| **Bomber (Airfield Strike)**             | ⚔️ Attack → "💣 Bomber Run"                        | Select enemy tile → Tap ⚔️          | ✅ Implemented |
| **Info (Player Stats)**                  | 👁️ "View Intel" (in all popups) OR Long-press tile | Any context popup OR Long-press     | ✅ Implemented |
| **Ally (Alliance Request)**              | 🤝 Diplomacy → "🤝 Propose Ally"                   | Select neutral → Tap 🤝 (MOBILE-04) | ✅ Designed    |
| **Ally (Break Alliance, Traitor)**       | 🤝 Diplomacy → "💔 Break Alliance"                 | Select ally → Tap 🤝 (MOBILE-04)    | ✅ Designed    |
| **Peace (Peace Request, Dove)**          | 🤝 Diplomacy → "🕊️ Request Peace"                  | Select enemy → Tap 🤝 (MOBILE-04)   | ✅ Designed    |
| **Peace (Declare War, War Icon)**        | ⚔️ Attack → "⚔️ Declare War"                       | Select ally/neutral → Tap ⚔️        | ✅ Implemented |

**Coverage:** ✅ **100% (9/9 actions)** - All desktop radial menu actions accessible via mobile

---

## 8. Event Emissions (Desktop Parity)

All mobile actions emit the **same events** as desktop RadialMenu:

```typescript
// Ground Attack
const owner = game.owner(targetTile);
eventBus.emit(
  new SendAttackIntentEvent(owner.isPlayer() ? owner.id() : null, troops),
);

// Naval Assault
eventBus.emit(
  new SendBoatAttackIntentEvent(
    owner.isPlayer() ? owner.id() : null,
    targetTile,
    troops,
    null,
  ),
);

// Air Strike (Paratrooper Drop)
eventBus.emit(
  new SendParatrooperAttackIntentEvent(
    owner.isPlayer() ? owner.id() : null,
    targetTile,
    troops,
  ),
);

// Bomber Run (Set Target)
eventBus.emit(
  new SendBomberIntentEvent(
    owner.isPlayer() ? owner.id() : null,
    allStructureTypes,
    true,
  ),
);

// Declare War
eventBus.emit(new SendDeclareWarIntentEvent(myPlayer, targetPlayer));

// Nuclear Launch (Atom, H-Bomb, MIRV) — uses same build event as all units!
eventBus.emit(new BuildUnitIntentEvent(UnitType.AtomBomb, targetTile));
eventBus.emit(new BuildUnitIntentEvent(UnitType.HydrogenBomb, targetTile));
eventBus.emit(new BuildUnitIntentEvent(UnitType.MIRV, targetTile));

// Mark Target (Bomber Priority)
eventBus.emit(new SendTargetPlayerIntentEvent(targetPlayer.id()));

// Alliance Request (MOBILE-04)
eventBus.emit(new SendAllianceRequestIntentEvent(myPlayer, targetPlayer));

// Break Alliance (MOBILE-04)
eventBus.emit(new SendBreakAllianceIntentEvent(myPlayer, targetPlayer));

// Request Peace (MOBILE-04)
eventBus.emit(new SendPeaceRequestIntentEvent(myPlayer, targetPlayer));
```

**Result:** Server sees identical events from desktop and mobile clients.

---

## 9. Desktop Component Migration

| Desktop Component                          | Mobile Equivalent                        | Changes                                                       |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------- |
| **RadialMenu.ts** (entire file, 770 lines) | `MobileContextPopup.ts` (attack variant) | **Replaced entirely** - text labels instead of D3 pie slices  |
| **RadialMenu center button**               | "Ground Attack" row                      | Same `SendAttackIntentEvent`                                  |
| **RadialMenu Boat slot**                   | "Naval Assault" row                      | Same `SendBoatAttackIntentEvent` + `bestTransportShipSpawn()` |
| **RadialMenu AirAttack slot**              | "Air Strike" row                         | Same validation (`hasUpgrade(JetEngines)`)                    |
| **RadialMenu Bomber slot**                 | "Bomber Run" row                         | Same logic (`bomberTargetRange`, structure priority)          |
| **RadialMenu Info slot**                   | "View Intel" row + Long-press            | Reuses PlayerInfoOverlay logic                                |
| **ControlPanel attack ratio slider**       | Long-press ⚔️ overlay                    | Inline slider, same UIState.attackRatio                       |
| **Nuclear launch UI** (if desktop has one) | Missile Silo menu → Nuclear options      | Same `BuildUnitIntentEvent` (nukes are regular build items)   |
| **Anti-missile defense UI**                | Incoming nuke toast → Intercept/Evacuate | Real-time detection with 3-tick warning                       |

---

## 10. Implementation Checklist

### Phase 3A: Attack Popup (Week 5)

- [ ] Create `MobileAttackPopup.ts` component
- [ ] Implement Ground Attack action (SendAttackIntentEvent)
- [ ] Implement Naval Assault action (SendBoatAttackIntentEvent + bestTransportShipSpawn)
- [ ] Implement Air Strike action (SendParatrooperAttackIntentEvent)
- [ ] Implement Bomber Run action (SendBomberIntentEvent)
- [ ] Implement Declare War action (with confirmation dialog)
- [ ] Implement "View Intel" option (links to MOBILE-04 sidebar)
- [ ] Add validation for each action (conditional display)

### Phase 3B: Attack Ratio (Week 5)

- [ ] Create inline attack ratio slider overlay (long-press ⚔️)
- [ ] Wire up to UIState.attackRatio (same as desktop)
- [ ] Show real-time troop count (e.g., "450 / 1,500 troops")
- [ ] Test slider on real device (dragging accuracy)

### Phase 3C: Unit Combat (Week 6)

- [ ] Create "Attack Unit" popup variant (enemy unit selected)
- [ ] Create "Deploy Unit" popup (own unit selected)
- [ ] Implement Select Target mode (range overlay + tap destination)
- [ ] Implement Show Range toggle
- [ ] Implement Unit Upgrade flow
- [ ] Implement Disband confirmation

### Phase 3D: RadialMenu Parity Testing (Week 6)

- [ ] **Critical:** Test all 9 RadialMenu actions on mobile
- [ ] Verify event emissions match desktop (same event types)
- [ ] Verify validation logic matches (same conditions)
- [ ] Test with desktop player vs mobile player (cross-compatibility)

### Phase 3E: Nuclear Weapons (Week 7)

- [ ] Add nuclear options to Attack popup (Atom/H-Bomb/MIRV rows)
- [ ] Implement purchase validation (silo + research + gold + range check)
- [ ] Implement instant launch (BuildUnitIntentEvent with UnitType.AtomBomb etc.)
- [ ] Add automatic silo selection (closest silo in range)
- [ ] Calculate blast zone automatically (3×3, 5×5, 7×7)
- [ ] Implement incoming nuke detection toast (⚠️ warning)
- [ ] Add automated SAM intercept (no manual targeting - just auto-defend if in range)
- [ ] Implement evacuation button (save 50% troops)
- [ ] Add explosion animation + radiation overlay (green glow)
- [ ] Test nuclear launch flow on real device
- [ ] Verify nukes appear/disappear based on silo ownership + research

---

## 11. Design Clarifications

**Mobile UI Goal:** Make existing desktop mechanics touch-friendly. **DO NOT change game mechanics.**

### Confirmed Behaviors (Same as Desktop)

1. **Structure Targeting:** No separate "Target [Structure]" action - selecting enemy land/structure opens same Attack popup. Ground Attack works identically whether targeting empty land or structure.

2. **Bomber Targeting:** Works exactly as desktop:
   - **Manual:** Use "🎯 Mark Target" to set bomber priority on specific player
   - **Auto:** When at war, bombers auto-target closest structures
   - **No per-building selection:** Cannot tap specific structure to prioritize individual building types (same as desktop)

3. **Naval Assault:** No route preview - instant launch with `bestTransportShipSpawn()` calculation (same as desktop).

4. **Attack Confirmations:** No confirmation dialogs for attacks (too slow for mobile). Matches desktop behavior (instant attacks, same as clicking RadialMenu).

5. **Submarine Detection:** Works exactly as desktop:
   - If submarine is invisible (no sonar/proximity detection), "View Unit" option is grayed out
   - Attack Unit popup still appears (can still attack blind)
   - Same detection logic as desktop

### Mobile-Specific Changes

**Only touch interaction changes:**

- RadialMenu (D3 pie slices) → Text popups (easier to tap)
- Right-click → Tap ⚔️ context button
- Hover tooltips → Long-press overlays
- Mouse drag sliders → Touch-friendly 48px tall sliders

**Game mechanics unchanged:**

- Event emissions (SendAttackIntentEvent, SendBoatAttackIntentEvent, etc.) identical
- Validation logic (canGroundAttack, canNavalAssault, etc.) identical
- Server sees no difference between mobile and desktop players

---

## Next Steps

✅ **MOBILE-01:** Core interactions (foundation)  
✅ **MOBILE-02:** Build & Economy  
✅ **This doc:** Combat & Attack system (RadialMenu replacement)  
⏭️ **MOBILE-04:** Diplomacy & Intel (alliance/peace actions from RadialMenu migration)

**Critical Dependency:** MOBILE-04 must implement remaining 3 RadialMenu actions (Ally, Break Alliance, Peace).
