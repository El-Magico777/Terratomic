# Event System Reference

**Purpose:** Complete list of events mobile must emit (identical to desktop)  
**Last Updated:** February 9, 2026

---

## Critical Rule

**Mobile MUST emit the exact same events as desktop.**

Same event types, same parameters, same signatures. Server cannot tell difference between mobile and desktop players.

---

## Event Bus Pattern

```typescript
// Desktop and mobile both use the same EventBus instance:
import { EventBus } from "../core/EventBus";

// EventBus is a plain class (NOT a singleton). It's instantiated and passed
// to components. Transport.ts receives it and bridges events to WebSocket.

// Emit event:
eventBus.emit(new SendAttackIntentEvent(targetID, troops));

// Transport.ts listens for all intent events on the EventBus,
// converts them to wire-format Intent objects, and sends via WebSocket.
// Server validates and executes the intent.
```

**Key principle:** Events are player **intents**. Server validates and executes.

**Important:** All event classes are defined in `src/client/Transport.ts`.

---

## Combat Events

### Ground Attack

```typescript
class SendAttackIntentEvent {
  constructor(
    public readonly targetID: PlayerID | null,
    public readonly troops: number,
  ) {}
}
```

**Desktop trigger:** RadialMenu center button (sword icon)  
**Mobile trigger:** Attack popup → "🪖 Ground Attack" row

**Note:** Only 2 parameters — `targetID` (the player being attacked) and `troops`. There is NO `targetTile` parameter.

**Example:**

```typescript
const troops = Math.floor(attackRatio * myPlayer.troops());
const owner = game.owner(targetTile);
eventBus.emit(
  new SendAttackIntentEvent(owner.isPlayer() ? owner.id() : null, troops),
);
```

---

### Naval Assault

```typescript
class SendBoatAttackIntentEvent {
  constructor(
    public readonly targetID: PlayerID | null,
    public readonly dst: TileRef,
    public readonly troops: number,
    public readonly src: TileRef | null = null,
  ) {}
}
```

**Desktop trigger:** RadialMenu boat slot  
**Mobile trigger:** Attack popup → "🚢 Naval Assault" row

**Note:** Parameter order is `targetID, dst (destination), troops, src (spawn tile)`. The `src` is optional (null = auto-select).

**Example:**

```typescript
const troops = Math.floor(attackRatio * myPlayer.troops());
const owner = game.owner(targetTile);
eventBus.emit(
  new SendBoatAttackIntentEvent(
    owner.isPlayer() ? owner.id() : null,
    targetTile, // dst
    troops,
    null, // src (auto-select best port)
  ),
);
```

---

### Air Strike (Paratrooper)

```typescript
class SendParatrooperAttackIntentEvent {
  constructor(
    public readonly targetID: PlayerID | null,
    public readonly dst: TileRef,
    public readonly troops: number,
  ) {}
}
```

**Desktop trigger:** RadialMenu AirAttack slot  
**Mobile trigger:** Attack popup → "✈️ Air Strike" row

**Example:**

```typescript
const troops = Math.floor(attackRatio * myPlayer.troops());
const owner = game.owner(targetTile);
eventBus.emit(
  new SendParatrooperAttackIntentEvent(
    owner.isPlayer() ? owner.id() : null,
    targetTile,
    troops,
  ),
);
```

---

### Bomber Run

```typescript
class SendBomberIntentEvent {
  constructor(
    public readonly targetID: PlayerID | null,
    public readonly structures: UnitType[] | null,
    public readonly preferClosest: boolean,
  ) {}
}
```

**Desktop trigger:** RadialMenu bomber slot  
**Mobile trigger:** Attack popup → "💣 Bomber Run" row

**Note:** First param is `PlayerID | null` (not PlayerView). `structures` can be null.

**Example:**

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

const owner = game.owner(targetTile);
eventBus.emit(
  new SendBomberIntentEvent(
    owner.isPlayer() ? owner.id() : null,
    allStructures,
    true, // preferClosest
  ),
);
```

**Related:** `SendSetAutoBombingEvent(enabled: boolean)` toggles auto-bombing mode.

---

### Nuclear Weapons (Use BuildUnitIntentEvent)

**⚠️ There is NO dedicated `SendNuclearLaunchIntentEvent`.** Nuclear weapons use the same build system as all other units.

```typescript
// Nukes are built via the SAME event as cities, ports, etc:
class BuildUnitIntentEvent {
  constructor(
    public readonly unit: UnitType,
    public readonly tile: TileRef,
  ) {}
}
```

**Desktop trigger:** ControlPanel2 Attack tab → Select nuke from build menu  
**Mobile trigger:** Attack popup → "☢️ Atom Bomb" / "💥 H-Bomb" / "🚀 MIRV" row

**Nuke UnitTypes:** `UnitType.AtomBomb`, `UnitType.HydrogenBomb`, `UnitType.MIRV`

**Example:**

```typescript
// Launch Atom Bomb at target tile
eventBus.emit(new BuildUnitIntentEvent(UnitType.AtomBomb, targetTile));

// Launch H-Bomb
eventBus.emit(new BuildUnitIntentEvent(UnitType.HydrogenBomb, targetTile));

// Launch MIRV
eventBus.emit(new BuildUnitIntentEvent(UnitType.MIRV, targetTile));
```

**Key insight:** Server handles silo selection, range check, gold deduction. Client just emits the build intent.

---

### Declare War

```typescript
class SendDeclareWarIntentEvent {
  constructor(
    public readonly requestor: PlayerView,
    public readonly recipient: PlayerView,
  ) {}
}
```

**Desktop trigger:** RadialMenu peace slot (war icon, red)  
**Mobile trigger:** Attack popup → "⚔️ Declare War" row (with confirmation)

**Example:**

```typescript
// After confirmation dialog:
eventBus.emit(new SendDeclareWarIntentEvent(myPlayer, game.owner(targetTile)));
```

---

### Set Target Player (Bomber Priority)

**⚠️ The actual event is `SendTargetPlayerIntentEvent`, NOT `SendMarkTargetIntentEvent`.**

```typescript
class SendTargetPlayerIntentEvent {
  constructor(public readonly targetID: PlayerID) {}
}
```

**Desktop trigger:** Context action on enemy player  
**Mobile trigger:** Attack popup → "🎯 Mark Target" row

**Note:** Only takes `PlayerID` (not PlayerView, not myPlayer).

**Example:**

```typescript
const owner = game.owner(targetTile) as PlayerView;
eventBus.emit(new SendTargetPlayerIntentEvent(owner.id()));
```

---

## Build Events

### Build Structure/Unit

**⚠️ The actual event is `BuildUnitIntentEvent`, NOT `SendBuildIntentEvent`.**

```typescript
class BuildUnitIntentEvent {
  constructor(
    public readonly unit: UnitType,
    public readonly tile: TileRef,
  ) {}
}
```

**Desktop trigger:** ControlPanel2 Build tab → Click item → Click tile  
**Mobile trigger:** Build popup → Select item → Placement mode → Tap tile

**Example:**

```typescript
// Build City at tile (5, 10)
eventBus.emit(new BuildUnitIntentEvent(UnitType.City, game.tile(5, 10)));
```

**Also used for nuclear weapons** (see Nuclear Weapons section above).

---

### Upgrade Structure

**⚠️ The actual event is `SendUpgradeStructureIntentEvent`, NOT `SendUpgradeIntentEvent`.**

```typescript
class SendUpgradeStructureIntentEvent {
  constructor(
    public readonly unitId: number,
    public readonly unitType: UnitType,
  ) {}
}
```

**Desktop trigger:** ControlPanel2 → Stack mode / click structure  
**Mobile trigger:** Manage popup → "⬆️ Upgrade" → Confirm

**Note:** Takes `unitId` (numeric ID) and `unitType`, NOT a UnitView + level.

**Example:**

```typescript
// Upgrade structure by ID
eventBus.emit(
  new SendUpgradeStructureIntentEvent(
    selectedStructure.id(),
    selectedStructure.type(),
  ),
);
```

**Related:** `SendUpgradeBomberIntentEvent(airfieldId: number)` for bomber upgrades.

---

## Diplomacy Events

### Propose Alliance

```typescript
class SendAllianceRequestIntentEvent {
  constructor(
    public readonly requestor: PlayerView,
    public readonly recipient: PlayerView,
  ) {}
}
```

**Desktop trigger:** RadialMenu ally slot (green handshake)  
**Mobile trigger:** Diplomacy popup → "🤝 Propose Ally" row

**Example:**

```typescript
eventBus.emit(
  new SendAllianceRequestIntentEvent(myPlayer, game.owner(targetTile)),
);
```

---

### Break Alliance

```typescript
class SendBreakAllianceIntentEvent {
  constructor(
    public readonly requestor: PlayerView,
    public readonly recipient: PlayerView,
  ) {}
}
```

**Desktop trigger:** RadialMenu ally slot (red broken handshake, "Traitor")  
**Mobile trigger:** Diplomacy popup → "💔 Break Alliance" row

**Example:**

```typescript
eventBus.emit(
  new SendBreakAllianceIntentEvent(myPlayer, game.owner(targetTile)),
);
```

---

### Request Peace

```typescript
class SendPeaceRequestIntentEvent {
  constructor(
    public readonly requestor: PlayerView,
    public readonly recipient: PlayerView,
  ) {}
}
```

**Desktop trigger:** RadialMenu peace slot (dove icon)  
**Mobile trigger:** Diplomacy popup → "🕊️ Request Peace" row

**Example:**

```typescript
eventBus.emit(
  new SendPeaceRequestIntentEvent(myPlayer, game.owner(targetTile)),
);
```

---

### Accept/Reject Alliance

**⚠️ The actual event is `SendAllianceReplyIntentEvent`, NOT `SendAllianceResponseIntentEvent`.**

```typescript
class SendAllianceReplyIntentEvent {
  constructor(
    public readonly requestor: PlayerView,
    public readonly recipient: PlayerView,
    public readonly accepted: boolean,
  ) {}
}
```

**Desktop trigger:** EventsDisplay inline "Accept" button  
**Mobile trigger:** Intel sidebar Events tab → "Accept" button

**Note:** Takes `requestor` + `recipient` PlayerViews + boolean, NOT a requestId string.

**Example:**

```typescript
// Accept alliance from Player2
eventBus.emit(
  new SendAllianceReplyIntentEvent(
    player2, // requestor (who asked)
    myPlayer, // recipient (me)
    true, // accepted
  ),
);
```

**Related:** `SendAllianceExtensionIntentEvent(recipient: PlayerView)` extends an existing alliance.

---

### Embargo Player

```typescript
class SendEmbargoIntentEvent {
  constructor(
    public readonly target: PlayerView,
    public readonly action: "start" | "stop",
  ) {}
}
```

**Desktop trigger:** Diplomacy panel / auto on war declaration  
**Mobile trigger:** Diplomacy popup → More Actions → "🚫 Embargo" row

**Note:** Only 2 params: `target` and `action` (start/stop toggle). There is NO duration param — embargo auto-lifts on peace.

**Example:**

```typescript
// Start embargo
eventBus.emit(new SendEmbargoIntentEvent(game.owner(targetTile), "start"));

// Lift embargo
eventBus.emit(new SendEmbargoIntentEvent(game.owner(targetTile), "stop"));
```

---

### Donate Troops to Ally

```typescript
class SendDonateTroopsIntentEvent {
  constructor(
    public readonly recipient: PlayerView,
    public readonly troops: number | null,
  ) {}
}
```

**Desktop trigger:** PlayerPanel diplomacy actions  
**Mobile trigger:** Diplomacy popup → "🎁 Donate Troops" row

**Note:** Only 2 params: `recipient` and `troops` (number or null). Does NOT take a units array or destination city.

**Example:**

```typescript
eventBus.emit(
  new SendDonateTroopsIntentEvent(
    game.owner(targetTile),
    500, // troops count, or null for all
  ),
);
```

**Related:** `SendDonateGoldIntentEvent(recipient: PlayerView, gold: Gold | null)` for gold donations.

---

## Research Events

### Toggle Research Priority

```typescript
class SendResearchTreeSelectIntentEvent {
  constructor(public techId: string) {}
}
```

**Desktop trigger:** ResearchTreeModal → Click tech row (toggles ⭐/☆)  
**Mobile trigger:** Research sidebar → Tap tech row (toggles ⭐/☆)

**Example:**

```typescript
// Toggle priority for "Roads" tech
eventBus.emit(new SendResearchTreeSelectIntentEvent("roads"));
```

**Note:** Server tracks priorities as `Set<string>`. Emitting same tech ID twice toggles it off.

---

## Economy Events

### Investment System (DOM CustomEvents, NOT EventBus)

**⚠️ Investment events use DOM `CustomEvent` via `window.dispatchEvent`, NOT the game EventBus.**

Defined in `src/client/events/InvestmentEvents.ts`:

```typescript
// String constants (not classes):
export const INVESTMENT_REQUEST_EVENT = "investment-request-change";
export const INVESTMENT_SYNC_EVENT = "investment-sync";

// Detail types:
export type InvestmentSlider = "prod" | "road" | "research";
export type InvestmentRequestDetail =
  | { type: "set"; slider: InvestmentSlider; value: number }
  | { type: "toggle-lock"; slider: InvestmentSlider };
```

**Desktop trigger:** ControlPanel2 Economy tab → Drag slider  
**Mobile trigger:** Economy overlay → Drag slider

**Example (set slider value):**

```typescript
window.dispatchEvent(
  new CustomEvent(INVESTMENT_REQUEST_EVENT, {
    detail: {
      type: "set",
      slider: "prod",
      value: 50,
    } as InvestmentRequestDetail,
  }),
);
```

**Example (toggle lock):**

```typescript
window.dispatchEvent(
  new CustomEvent(INVESTMENT_REQUEST_EVENT, {
    detail: {
      type: "toggle-lock",
      slider: "research",
    } as InvestmentRequestDetail,
  }),
);
```

**Lock toggle:** Desktop uses double-click on slider to lock/unlock.

**Actual server events (via EventBus):** Individual slider changes are sent as:

- `SendSetInvestmentRateEvent(rate: number)` — production
- `SendSetRoadInvestmentEvent(rate: number)` — road
- `SendSetResearchInvestmentEvent(rate: number)` — research

**Constraint:** `production + road + research <= 100`

---

## UI State Events (Local Only)

Some events are **client-side only** (don't go to server):

### Attack Ratio Change

**⚠️ The actual event class is `AttackRatioEvent`, NOT `ATTACK_RATIO_CHANGED_EVENT`.**

```typescript
class AttackRatioEvent {
  constructor(
    public readonly attackRatio: number, // 0.0 - 1.0
  ) {}
}
```

**Storage:** `UIState.attackRatio` + localStorage key `"settings.attackRatio"`  
**Mobile trigger:** Long-press ⚔️ → Drag slider  
**Desktop trigger:** ControlPanel slider + keyboard shortcuts (via InputHandler)

### Troop Ratio

```typescript
class SendSetTargetTroopRatioEvent {
  constructor(public readonly ratio: number) {}
}
```

**Desktop trigger:** ControlPanel/ControlPanel2 troop slider  
**Mobile trigger:** Economy overlay troop slider

---

## Event Verification Checklist

For each mobile action, verify:

- [ ] Desktop emits this event?
- [ ] Exact same event class name?
- [ ] Same constructor parameters?
- [ ] Same parameter types?
- [ ] Same parameter order?
- [ ] No added parameters?
- [ ] No removed parameters?

**If any answer is "no" → mobile implementation is wrong.**

---

## Server Response Events

These are **received** from server (not emitted by client):

### Game Updates

```typescript
class GameUpdateEvent {
  // Contains: troop changes, gold changes, structure updates, etc.
}
```

**Mobile handling:** Same as desktop (update game state, re-render)

---

### Event Notifications

```typescript
class GameEventNotification {
  // War declared, alliance formed, nuke launched, etc.
}
```

**Mobile handling:** Show in Intel sidebar Events tab (same as EventsDisplay)

---

## Event Bus Location

```typescript
// Shared across desktop and mobile:
import { eventBus } from '../EventBus'; // Relative path

// Usage:
eventBus.emit(new SomeIntentEvent(...));

eventBus.on(GameUpdateEvent, (event) => {
  // Handle update
});
```

**Critical:** Use same EventBus instance (passed via dependency injection, NOT a singleton)

---

## Testing Event Parity

### Unit Test Template

```typescript
describe("Mobile Attack Popup", () => {
  it("emits SendAttackIntentEvent with same params as desktop", () => {
    const spy = jest.spyOn(eventBus, "emit");

    // Trigger mobile attack
    mobileAttackPopup.tapGroundAttack();

    // Verify event (2 params: targetID, troops)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetID: expect.any(String), // PlayerID
        troops: expect.any(Number),
      }),
    );
  });
});
```

---

## Event Emission Patterns

### Emit Then Close

```typescript
// Pattern: Emit event, then close popup
function onGroundAttackTap() {
  const troops = Math.floor(attackRatio * myPlayer.troops());
  const owner = game.owner(targetTile);
  eventBus.emit(
    new SendAttackIntentEvent(owner.isPlayer() ? owner.id() : null, troops),
  );

  closeAttackPopup(); // Close after emitting
  showToast(`Attacking with ${troops} troops`, 3000);
}
```

### Emit After Confirmation

```typescript
// Pattern: Show dialog, then emit
function onDeclareWarTap() {
  showConfirmation("Declare war on Player2?", () => {
    // Only emit if confirmed
    eventBus.emit(new SendDeclareWarIntentEvent(myPlayer, targetPlayer));
    closeDiplomacyPopup();
    showToast("War declared on Player2", 3000);
  });
}
```

### Emit With Validation

```typescript
// Pattern: Validate first, then emit
function onBuildCityTap(tile: TileRef) {
  if (!canBuild(UnitType.City, tile)) {
    showToast("Cannot build City here", 3000);
    return;
  }

  if (myPlayer.gold() < 500) {
    showToast("Not enough gold ($500 required)", 3000);
    return;
  }

  eventBus.emit(new BuildUnitIntentEvent(UnitType.City, tile));
  exitPlacementMode();
  showToast("City built!", 3000);
}
```

---

## Missing Events (Also Needed for Mobile)

These events exist in the codebase and mobile should support where applicable:

### Unit Movement Events

```typescript
class MoveWarshipIntentEvent {
  constructor(
    public readonly unitId: number,
    public readonly tile: TileRef,
  ) {}
}

class MoveSubmarineIntentEvent {
  constructor(
    public readonly unitId: number,
    public readonly tile: TileRef,
  ) {}
}

class MoveFighterJetIntentEvent {
  constructor(
    public readonly unitId: number,
    public readonly tile: TileRef,
  ) {}
}

class MoveArtilleryIntentEvent {
  constructor(
    public readonly unitId: number,
    public readonly tile: TileRef,
  ) {}
}
```

**Mobile trigger:** "Deploy Unit" popup → Select Target → Tap destination

### Cancel Actions

```typescript
class CancelAttackIntentEvent {
  constructor(public readonly attackID: string) {}
}

class CancelBoatIntentEvent {
  constructor(public readonly unitID: number) {}
}

class CancelParatrooperIntentEvent {
  constructor(public readonly unitID: number) {}
}
```

**Mobile trigger:** Tap active attack marker → "Cancel" button

### Communication Events

```typescript
class SendEmojiIntentEvent {
  constructor(
    public readonly recipient: PlayerView | typeof AllPlayers,
    public readonly emoji: number,
  ) {}
}

class SendQuickChatEvent {
  constructor(
    public readonly recipient: PlayerView,
    public readonly quickChatKey: string,
    public readonly target?: PlayerID,
  ) {}
}
```

**Mobile trigger:** Diplomacy popup → Emoji/Chat actions

### Gold Donation

```typescript
class SendDonateGoldIntentEvent {
  constructor(
    public readonly recipient: PlayerView,
    public readonly gold: Gold | null,
  ) {}
}
```

**Mobile trigger:** Diplomacy popup → "💰 Donate Gold" row

### Other Events

```typescript
class SendSpawnIntentEvent {
  constructor(public readonly tile: TileRef) {}
}
// Used during initial spawn phase

class SendAllianceExtensionIntentEvent {
  constructor(public readonly recipient: PlayerView) {}
}
// Extend an existing alliance that's about to expire

class SendSetAutoBombingEvent {
  constructor(public readonly enabled: boolean) {}
}
// Toggle automatic bomber runs

class SendUpgradeBomberIntentEvent {
  constructor(public readonly airfieldId: number) {}
}
// Upgrade bomber level at specific airfield
```

---

## Related Documents

- `REFERENCE-01-DESKTOP-COMPONENTS.md` - Which components emit which events
- `REFERENCE-02-GAME-MECHANICS.md` - What events should accomplish
- `REFERENCE-03-PROJECT-SCOPE.md` - Event parity requirements
