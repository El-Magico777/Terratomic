# Mobile Action Grid - Complete Action Catalog

This document catalogs all actions available in the mobile action grid, organized by category.

## Overview

The mobile action grid displays context-appropriate actions based on:

- Tile ownership (own, enemy, neutral)
- Tile type (land, shore, water)
- Player research progress
- Available resources (gold, troops)
- Diplomatic relationships

---

## Action Categories

### 1. Initial Spawn

| Action     | ID      | Icon | Cost | Requirements                   | Priority |
| ---------- | ------- | ---- | ---- | ------------------------------ | -------- |
| Spawn Here | `spawn` | 🏳️   | -    | Unowned land tile, spawn phase | High     |

---

### 2. Infrastructure & Buildings

#### Land Structures (High Priority)

| Action   | ID               | Icon | Cost    | Requirements                   | Priority |
| -------- | ---------------- | ---- | ------- | ------------------------------ | -------- |
| City     | `build:City`     | 🏙️   | Dynamic | Owned land                     | High     |
| Factory  | `build:Factory`  | 🏭   | Dynamic | Owned land                     | High     |
| Airfield | `build:Airfield` | ✈️   | Dynamic | Owned land                     | High     |
| Port     | `build:Port`     | ⚓   | Dynamic | Nearby ocean shore (≤10 tiles) | High     |

#### Land Structures (Standard Priority)

| Action       | ID                  | Icon | Cost    | Requirements | Priority |
| ------------ | ------------------- | ---- | ------- | ------------ | -------- |
| Defense Post | `build:DefensePost` | 🛡️   | Dynamic | Owned land   | Normal   |
| Research Lab | `build:ResearchLab` | 🔬   | Dynamic | Owned land   | Normal   |
| Academy      | `build:Academy`     | 🏛️   | Dynamic | Owned land   | Normal   |
| SAM Launcher | `build:SAMLauncher` | 🎯   | Dynamic | Owned land   | Normal   |

#### Research-Locked Structures

| Action          | ID                     | Icon | Cost    | Requirements             | Priority |
| --------------- | ---------------------- | ---- | ------- | ------------------------ | -------- |
| Hospital        | `build:Hospital`       | 🏥   | Dynamic | Hospital Research        | Normal   |
| Missile Silo    | `build:MissileSilo`    | ⚛️   | Dynamic | Nuclear Fission          | Normal   |
| Doomsday Device | `build:DoomsdayDevice` | 💀   | Dynamic | Doomsday Device Research | Normal   |

---

### 3. Military Units

#### Land Units

| Action    | ID                | Icon | Cost    | Requirements                 | Priority |
| --------- | ----------------- | ---- | ------- | ---------------------------- | -------- |
| Artillery | `build:Artillery` | 🎯   | Dynamic | Factory + Artillery Research | Normal   |

#### Naval Units

| Action    | ID                | Icon | Cost    | Requirements              | Priority |
| --------- | ----------------- | ---- | ------- | ------------------------- | -------- |
| Warship   | `build:Warship`   | 🚢   | Dynamic | Port exists               | High     |
| Submarine | `build:Submarine` | 🔱   | Dynamic | Port + Submarine Research | High     |

#### Air Units

| Action      | ID                 | Icon | Cost    | Requirements           | Priority |
| ----------- | ------------------ | ---- | ------- | ---------------------- | -------- |
| Fighter Jet | `build:FighterJet` | ✈️   | Dynamic | Airfield + Jet Engines | Normal   |

---

### 4. Combat Actions

#### Direct Attacks

| Action        | ID                 | Icon | Cost | Requirements                          | Priority      |
| ------------- | ------------------ | ---- | ---- | ------------------------------------- | ------------- |
| Ground Attack | `attack:ground`    | ⚔️   | -    | Troops > 0, adjacent enemy/neutral    | High          |
| Naval Assault | `attack:naval`     | ⚓   | -    | Troops > 0, transport ships available | High          |
| Paratroopers  | `attack:airstrike` | 🪂   | -    | Airfield + Jet Engines + Troops       | Normal/High\* |
| Bomber Run    | `attack:bomber`    | 💣   | -    | Airfield + War declared               | Normal/High\* |

\*Priority varies by context (enemy-no-attack vs enemy-can-attack)

---

### 5. Nuclear Weapons

| Action    | ID                  | Icon | Cost   | Requirements                                | Priority |
| --------- | ------------------- | ---- | ------ | ------------------------------------------- | -------- |
| Atom Bomb | `attack:nuke-atom`  | ⚛️   | 5,000  | Missile Silo + Nuclear Fission + Gold       | Normal   |
| H-Bomb    | `attack:nuke-hbomb` | 💥   | 15,000 | Missile Silo + Thermonuclear Staging + Gold | Normal   |
| MIRV      | `attack:nuke-mirv`  | 🚀   | 50,000 | Missile Silo + MIRV Technology + Gold       | Normal   |

---

### 6. Diplomacy

| Action           | ID                         | Icon | Cost | Requirements                             | Priority      |
| ---------------- | -------------------------- | ---- | ---- | ---------------------------------------- | ------------- |
| Propose Alliance | `diplomacy:propose-ally`   | 🤝   | -    | Target is player, not allied, not at war | Normal/High\* |
| Break Alliance   | `diplomacy:break-alliance` | 💔   | -    | Currently allied with target             | Normal        |
| Request Peace    | `diplomacy:request-peace`  | 🕊️   | -    | Currently at war with target             | Normal/High\* |
| Declare War      | `attack:declare-war`       | ⚔️   | -    | Target is player, not at war             | Normal        |

\*Priority is High in enemy-no-attack scenarios

---

## Context-Based Action Availability

### Spawn Phase

- **Spawn Here** (on unowned land tiles)

### Own Territory - Land

- All infrastructure buildings
- Artillery (if factory exists)
- Fighter Jet (if airfield + research)
- Port (if ocean shore nearby)

### Own Territory - Shore

- Same as land (includes port by default)

### Own Territory - Water

- Port (if shore nearby)
- Warship (if port exists)
- Submarine (if port + research)
- Fighter Jet (if airfield + research)

### Enemy Territory - Can Attack

- Ground Attack
- Paratroopers (if airfield + jets)
- Bomber Run (if at war + airfield)
- Fighter Jet (buildable)
- All diplomacy options
- All nukes (if unlocked)

### Enemy Territory - Can Boat Attack

- Naval Assault
- Paratroopers (if airfield + jets)
- Bomber Run (if at war + airfield)
- All diplomacy options
- All nukes (if unlocked)

### Enemy Territory - Cannot Attack

- Paratroopers (if airfield + jets) - HIGH PRIORITY
- Bomber Run (if at war + airfield) - HIGH PRIORITY
- Propose Alliance / Request Peace - HIGH PRIORITY
- All other diplomacy
- All nukes (if unlocked)

### Neutral Territory - Can Attack

- Ground Attack (land only)
- Port + Water units (ocean only)
- Fighter Jet (if airfield + research)

### Neutral Territory - Boat Attack

- Naval Assault

---

## Design Patterns

### Priority System

- **High Priority**: Larger tiles (2-column span), larger icons/text
- **Normal Priority**: Standard tile size

### Cost Display

- Shown in gold (💰) with K/M abbreviations
- Updates based on tech level and stack count

### Disabled States

- Grayed out with reason displayed
- Haptic error feedback on tap

### Locked States

- Red tint with 🔒 icon
- Shows research requirement

### Dynamic Costs

- Calculated based on:
  - Base unit cost
  - Stack count (for stackable structures)
  - Tech level (for upgradeable units)
  - Upgrade cost multipliers

---

## Implementation Notes

- Actions dispatch `action-selected` custom events with action ID
- Closing dispatches `grid-closed` events
- 300ms debounce prevents accidental backdrop closure
- Haptic feedback for all interactions
- Grid has 60vh max height with touch scrolling
- Auto-fill grid with 65px minimum tile width
- Safe area inset padding for notched devices
