# Mobile Feature Matrix

> Last updated: 2026-02-12

## Desktop → Mobile Feature Mapping

| Desktop Feature              | Desktop Mechanism                                                                  | Mobile Equivalent                             | Mobile Trigger                                   |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| **Radial/Context Menu**      | Right-click on tile → D3 radial menu (6 slots + center)                            | `MobileActionGrid`                            | Tap any tile → bottom sheet                      |
| **Ground Attack**            | Radial center button (sword) / `G` key                                             | ActionGrid `attack:ground`                    | Tap enemy tile → "Ground Attack" tile            |
| **Boat / Naval Assault**     | Radial Boat slot                                                                   | ActionGrid `attack:naval`                     | Tap enemy tile → "Naval Assault" tile            |
| **Alliance Request**         | Radial Ally slot (green)                                                           | ActionGrid `diplomacy:propose-ally`           | Tap enemy tile → "Propose Alliance"              |
| **Break Alliance**           | Radial Ally slot (red)                                                             | ActionGrid `diplomacy:break-alliance`         | Tap allied tile → "Break Alliance"               |
| **Request Peace**            | Radial Peace slot (dove)                                                           | ActionGrid `diplomacy:request-peace`          | Tap enemy-at-war tile → "Request Peace"          |
| **Declare War**              | Radial Peace slot (war icon)                                                       | ActionGrid `attack:declare-war`               | Tap enemy tile → "Declare War"                   |
| **Paratroopers**             | Radial AirAttack slot                                                              | Handler exists in MobileUI                    | **Not yet in ActionGrid**                        |
| **Bomber Run**               | Radial Bomber slot                                                                 | Handler exists in MobileUI                    | **Not yet in ActionGrid**                        |
| **Spawn**                    | Radial center button (spawn phase)                                                 | Direct tap or ActionGrid `spawn`              | Tap unclaimed land tile                          |
| **Build Structures**         | Hotkeys (`Y`=City, `U`=Port, `I`=Airfield…) / Ctrl+click / ControlPanel2 Build tab | ActionGrid `build:*` tiles                    | Tap own tile → grid shows buildable structures   |
| **Build Nukes**              | Hotkeys (`5`=Atom, `6`=H-Bomb, `7`=MIRV)                                           | ActionGrid `attack:nuke-*`                    | Tap enemy tile → nuke tiles (if silo + research) |
| **Build Naval Units**        | Hotkeys (`9`=Warship, `0`=Sub) / ControlPanel2 Build tab                           | ActionGrid `build:Warship`, `build:Submarine` | Tap own water tile (requires Port)               |
| **Build Fighter Jet**        | Hotkey `8` / ControlPanel2 Build tab                                               | ActionGrid `build:FighterJet`                 | Tap own tile (requires Airfield + Jet Engines)   |
| **Build Artillery**          | Hotkey `4`                                                                         | —                                             | **Not yet in mobile**                            |
| **Troop/Worker Ratio**       | ControlPanel slider                                                                | `MobileEconomyOverlay`                        | Long-press map or Economy edge-tab               |
| **Attack Ratio**             | ControlPanel slider / `1`/`2` keys / Shift+scroll                                  | `MobileEconomyOverlay`                        | Economy overlay slider                           |
| **Investment Sliders**       | ControlPanel / ControlPanel2 Economy tab                                           | `MobileEconomyOverlay`                        | Long-press or Economy edge-tab                   |
| **Population & Gold**        | `TopBar` / ControlPanel stats                                                      | `MobileTopBar`                                | Always visible at top                            |
| **Leaderboard**              | `GameLeftSidebar` → `leader-board`                                                 | `MobileIntelSidebar`                          | ≡ button or swipe from left edge                 |
| **Player Info**              | Radial Info slot → `PlayerPanel`                                                   | `MobileIntelSidebar`                          | ≡ button or swipe from left edge                 |
| **Events Log**               | `events-display`                                                                   | —                                             | **Not yet in mobile**                            |
| **Chat**                     | `chat-display`                                                                     | —                                             | **Not yet in mobile**                            |
| **Heads-Up Messages**        | `heads-up-message`                                                                 | —                                             | **Hidden on mobile**                             |
| **Options / Settings**       | `options-menu`                                                                     | `MobileSettingsSidebar`                       | ⚙️ button or swipe from right edge               |
| **Replay Panel**             | `replay-panel`                                                                     | —                                             | **Not yet in mobile**                            |
| **Research Toggle**          | `research-toggle-button`                                                           | `MobileResearchSidebar`                       | 🔬 button or swipe from right edge               |
| **Alternate View**           | Hold `Space` key                                                                   | —                                             | **Not available on mobile**                      |
| **Center Camera**            | `C` key                                                                            | —                                             | **Not available on mobile**                      |
| **Pan / Zoom**               | WASD/arrows + Q/E + scroll + pinch                                                 | GestureDetector drag + pinch                  | Touch drag/pinch (pan partial, zoom TODO)        |
| **Emoji Table**              | Alt+click → `EmojiTable`                                                           | —                                             | **Not yet in mobile** (TODO)                     |
| **Upgrade Mode**             | ControlPanel2 toggle                                                               | —                                             | **Not yet in mobile**                            |
| **Multi-Build Mode**         | ControlPanel2 toggle                                                               | —                                             | **Not yet in mobile**                            |
| **Tutorial Toast**           | `tutorial-toast` (desktop position)                                                | Same component, CSS overridden                | Auto-shown, repositioned top-center              |
| **Tech Unlock Notification** | `tech-unlock-notification` (desktop position)                                      | Same component, CSS overridden                | Auto-shown, repositioned top-center              |

---

## ActionGrid: Tile-Tap → Actions Matrix

### Spawn Phase

| Tile Condition     | Actions                   |
| ------------------ | ------------------------- |
| Unclaimed land     | `spawn` 🎯 **Spawn Here** |
| Water / owned tile | _(empty — no actions)_    |

### Own Tiles

#### Own Land

All unlocked land structures shown. Disabled (greyed) if gold insufficient.

| Action                 | Icon | Priority | Condition                         |
| ---------------------- | ---- | -------- | --------------------------------- |
| `build:City`           | 🏙️   | **high** | Always                            |
| `build:Factory`        | 🏭   | **high** | Always                            |
| `build:DefensePost`    | 🛡️   | normal   | Always                            |
| `build:Airfield`       | ✈️   | **high** | Always                            |
| `build:Hospital`       | 🏥   | normal   | Requires `HospitalResearch`       |
| `build:MissileSilo`    | ⚛️   | normal   | Requires `NuclearFission`         |
| `build:ResearchLab`    | 🔬   | normal   | Always                            |
| `build:Academy`        | 🏛️   | normal   | Always                            |
| `build:SAMLauncher`    | 🎯   | normal   | Always                            |
| `build:DoomsdayDevice` | 💀   | normal   | Requires `DoomsdayDeviceResearch` |
| `build:FighterJet`     | 🛩️   | normal   | Requires Airfield + `JetEngines`  |

#### Own Shore

Same as **Own Land** with Port prepended:

| Action                   | Icon | Priority | Condition           |
| ------------------------ | ---- | -------- | ------------------- |
| `build:Port`             | ⚓   | **high** | Always (first item) |
| _(all Own Land actions)_ |      |          |                     |

#### Own Water

Naval builds only. Requires a Port.

| Action             | Icon | Priority | Condition                           |
| ------------------ | ---- | -------- | ----------------------------------- |
| `build:Warship`    | 🚢   | **high** | Requires Port                       |
| `build:Submarine`  | 🔱   | **high** | Requires Port + `SubmarineResearch` |
| `build:FighterJet` | 🛩️   | normal   | Requires Airfield + `JetEngines`    |

### Enemy Tiles

#### Enemy — Can Ground Attack

Adjacent / reachable by land.

| Action                     | Icon | Priority | Condition                     |
| -------------------------- | ---- | -------- | ----------------------------- |
| `attack:ground`            | 🪖   | **high** | Disabled if 0 troops          |
| `diplomacy:request-peace`  | 🕊️   | normal   | Only if at war                |
| `diplomacy:break-alliance` | 💔   | normal   | Only if allied                |
| `diplomacy:propose-ally`   | 🤝   | normal   | Only if neutral relationship  |
| `attack:declare-war`       | ⚔️   | normal   | Only if NOT at war            |
| `attack:nuke-atom`         | ☢️   | normal   | Silo + `NuclearFission`       |
| `attack:nuke-hbomb`        | 💥   | normal   | Silo + `ThermonuclearStaging` |
| `attack:nuke-mirv`         | 🚀   | normal   | Silo + `MIRVTechnology`       |
| `build:FighterJet`         | 🛩️   | normal   | Airfield + `JetEngines`       |

#### Enemy — Can Boat Attack

Land tile reachable only by transport ship.

| Action                     | Icon | Priority | Condition                     |
| -------------------------- | ---- | -------- | ----------------------------- |
| `attack:naval`             | 🚢   | **high** | Disabled if 0 troops          |
| `diplomacy:request-peace`  | 🕊️   | normal   | Only if at war                |
| `diplomacy:break-alliance` | 💔   | normal   | Only if allied                |
| `diplomacy:propose-ally`   | 🤝   | normal   | Only if neutral relationship  |
| `attack:declare-war`       | ⚔️   | normal   | Only if NOT at war            |
| `attack:nuke-atom`         | ☢️   | normal   | Silo + `NuclearFission`       |
| `attack:nuke-hbomb`        | 💥   | normal   | Silo + `ThermonuclearStaging` |
| `attack:nuke-mirv`         | 🚀   | normal   | Silo + `MIRVTechnology`       |

#### Enemy — No Attack Possible

Out of range for ground and naval. Diplomacy + nukes only.

| Action                     | Icon | Priority | Condition                     |
| -------------------------- | ---- | -------- | ----------------------------- |
| `diplomacy:request-peace`  | 🕊️   | **high** | Only if at war                |
| `diplomacy:propose-ally`   | 🤝   | **high** | Only if neutral relationship  |
| `diplomacy:break-alliance` | 💔   | normal   | Only if allied                |
| `attack:declare-war`       | ⚔️   | normal   | Only if NOT at war            |
| `attack:nuke-atom`         | ☢️   | normal   | Silo + `NuclearFission`       |
| `attack:nuke-hbomb`        | 💥   | normal   | Silo + `ThermonuclearStaging` |
| `attack:nuke-mirv`         | 🚀   | normal   | Silo + `MIRVTechnology`       |

### Neutral Tiles

#### Neutral Land — Can Attack

| Action          | Icon | Priority | Condition            |
| --------------- | ---- | -------- | -------------------- |
| `attack:ground` | 🪖   | **high** | Disabled if 0 troops |

#### Neutral Land — Can Boat Attack

| Action         | Icon | Priority | Condition            |
| -------------- | ---- | -------- | -------------------- |
| `attack:naval` | 🚢   | **high** | Disabled if 0 troops |

#### Neutral Ocean

| Action             | Icon | Priority | Condition                           |
| ------------------ | ---- | -------- | ----------------------------------- |
| `build:Warship`    | 🚢   | **high** | Requires Port                       |
| `build:Submarine`  | 🔱   | **high** | Requires Port + `SubmarineResearch` |
| `build:FighterJet` | 🛩️   | normal   | Requires Airfield + `JetEngines`    |

---

## Category Resolution Logic

`MobileActionGrid.determineTileCategory()` resolves which scenario applies:

1. **Spawn phase** → `spawn-phase`
2. **Own tile** → `own-water` / `own-shore` / `own-land` (via `isLand()` + `isShoreline()`)
3. **Neutral (no player owner)** → fetch `myPlayer.actions(tile)`:
   - Ocean → `neutral-can-attack` (ship building)
   - Land + `canAttack` → `neutral-can-attack`
   - Land + transport ship buildable → `neutral-can-boat-attack`
   - Fallback → `neutral-can-attack`
4. **Enemy player** → fetch `myPlayer.actions(tile)`:
   - `canAttack` → `enemy-can-attack`
   - Transport ship buildable on land → `enemy-can-boat-attack`
   - Otherwise → `enemy-no-attack`

---

## Gaps (Desktop features not yet in ActionGrid)

| Feature                   | Status                                  |
| ------------------------- | --------------------------------------- |
| Paratroopers (air attack) | Handler in MobileUI, no ActionGrid tile |
| Bomber run                | Handler in MobileUI, no ActionGrid tile |
| Artillery                 | Not in mobile at all                    |
| Emoji sending             | TODO stub                               |
| Troop donation            | TODO stub                               |
| Upgrade mode              | Not in mobile                           |
| Multi-build mode          | Not in mobile                           |
| Center camera             | Not in mobile                           |
| Alternate view (Space)    | Not in mobile                           |
| Events log                | Not in mobile                           |
| Chat                      | Not in mobile                           |
| Replay panel              | Not in mobile                           |
