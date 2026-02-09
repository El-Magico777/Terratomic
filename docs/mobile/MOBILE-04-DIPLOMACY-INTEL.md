# MOBILE-04: Diplomacy & Intel System

**Part of:** Terratomic Mobile UI Redesign  
**Dependencies:** MOBILE-01 (Core Interactions), MOBILE-03 (Combat - completes RadialMenu migration)  
**Status:** Design Phase  
**Last Updated:** February 9, 2026

---

## Overview

This document defines **diplomatic actions, player information, and intel gathering** on mobile. Completes the RadialMenu migration with the 3 remaining actions (Ally, Break Alliance, Peace).

### Scope & Boundaries

**CRITICAL: This is UI adaptation only**

✅ **What changes:**

- Swipe-from-left sidebar replaces GameLeftSidebar.ts
- Diplomacy popup replaces RadialMenu diplomacy actions
- Tab switching (Players/Events) replaces always-visible panels

❌ **What does NOT change:**

- Alliance/peace mechanics (request/accept/reject logic)
- Event system (same EventsDisplay data, same event types)
- Player info visibility (fog of war, stats calculations)
- Event emissions (SendAllianceRequestIntentEvent, SendPeaceRequestIntentEvent identical)
- **Desktop UI (GameLeftSidebar.ts/Leaderboard.ts untouched)**

**Approach:** Reuse existing Leaderboard component in mobile sidebar wrapper. EventsDisplay is a separate component.

---

## 1. Diplomacy Popup (Allied/Neutral Territory)

### Trigger: 🤝 Context Button (Allied/Neutral Player Selected)

```
┌───────────────────┐
### Trigger: 🤝 Context Button (Allied/Neutral Player Selected)

```

┌───────────────────┐
│ 🕊️ Request Peace │ (if at war)
│ 🤝 Propose Ally │ (if neutral/not allied)
│ 💔 Break Alliance │ (if allied)
│ ──────────────── │
│ 😀 Send Emoji │ (quick reactions always visible)
│ 🎁 Donate Troops │ (ally only)
│ ──────────────── │
│ ⋯ More Actions ▼ │ ← Advanced features
│ ──────────────── │
│ 👁️ View Player │
└───────────────────┘

When "More Actions" expanded:
│ ⋯ More Actions ▲ │
│ ──────────────── │
│ 🚫 Embargo │ (stops trade ships)
│ 💬 Full Chat │ (text messages)

````

**Popup Properties:**
- **Position:** Above 🤝 button (or left/right if near edge)
- **Background:** Semi-transparent dark (90%), green accent border
- **Dynamic content:** Only shows valid actions based on current relation
- **Core actions:** Always visible (Peace, Ally, Emoji, Donate)
- **Advanced actions:** Hidden in "More Actions" (Embargo, Full Chat)

---

---

## 2. Diplomatic Actions Detail

### 2.1 Propose Alliance

**Desktop Equivalent:** RadialMenu Ally slot (handshake icon, green #53ac75)

**Triggers When:**
- Neutral or enemy territory selected
- NOT currently allied with them
- Can send alliance request

**Action Flow:**
1. User taps "🤝 Propose Ally"
2. Confirmation dialog: "Send alliance request to Player2?" [Cancel] [Send]
3. If confirmed → `SendAllianceRequestIntentEvent(myPlayer, targetPlayer)`
4. Toast: "Alliance request sent to Player2" (3s)
5. Target player receives notification (in their Events - see §4)

**Validation:**
```typescript
function canProposeAlliance(target: TileRef): boolean {
  const owner = game.owner(target);
  if (!owner.isPlayer()) return false;
  if (owner === game.myPlayer()) return false;

  // Check game state for alliance permission
  const actions = await game.myPlayer().actions(target);
  return actions?.interaction?.canSendAllianceRequest === true;
}
````

**Desktop Parity:**

- Same icon color (green)
- Same event emission
- Same validation logic from `PlayerActions.interaction.canSendAllianceRequest`

---

### 2.2 Break Alliance

**Desktop Equivalent:** RadialMenu Ally slot (traitor icon, red #c74848)

**Triggers When:**

- Allied player's territory selected
- Currently have active alliance
- Can break alliance

**Action Flow:**

1. User taps "💔 Break Alliance"
2. **Warning dialog:** "Break alliance with Player2? They will be notified." [Cancel] [Break]
3. If confirmed → `SendBreakAllianceIntentEvent(myPlayer, targetPlayer)`
4. Toast: "Alliance broken with Player2" (3s)
5. Both players receive notification

**Validation:**

```typescript
function canBreakAlliance(target: TileRef): boolean {
  const owner = game.owner(target);
  if (!owner.isPlayer()) return false;

  const actions = await game.myPlayer().actions(target);
  return actions?.interaction?.canBreakAlliance === true;
}
```

**UI Styling:**

- Shows in **red color** (#c74848) instead of green
- Uses broken heart / traitor icon
- Warning dialog more prominent (breaking alliance is significant action)

**Desktop Parity:**

- Same red color (#c74848)
- Same traitor icon from desktop
- Same `SendBreakAllianceIntentEvent`

---

### 2.3 Request Peace

**Desktop Equivalent:** RadialMenu Peace slot (dove icon, light gray #e5e7eb)

**Triggers When:**

- Enemy player's territory selected
- Currently at war with them
- Can request peace

**Action Flow:**

1. User taps "🕊️ Request Peace"
2. Confirmation: "Request peace with Player2?" [Cancel] [Request]
3. If confirmed → `SendPeaceRequestIntentEvent(myPlayer, targetPlayer)`
4. Toast: "Peace request sent to Player2" (3s)
5. Target player receives notification (can accept/reject)

**Validation:**

```typescript
function canRequestPeace(target: TileRef): boolean {
  const owner = game.owner(target);
  if (!owner.isPlayer()) return false;

  const actions = await game.myPlayer().actions(target);
  return actions?.interaction?.canRequestPeace === true;
}
```

**UI Styling:**

- Light gray / neutral color (#e5e7eb)
- Dove icon (peace symbol)

**Desktop Parity:**

- Same dove icon
- Same light gray color
- Same `SendPeaceRequestIntentEvent`

---

### 2.4 Send Emoji/Reaction

**Trigger:** Tap "😀 Send Emoji" in diplomacy popup

**Action Flow:**

1. User taps "😀 Send Emoji"
2. Emoji picker sheet appears (bottom 30% of screen)

```
┌─────────────────────────────┐
│ 😀 😂 😍 😎 😡 😭 🔥 💀    │ ← Top row (common)
│ 👍 👎 ✌️ 🤝 🏆 ⚔️ 🚀 🎉   │ ← 2nd row
│ 💩 🙈 🤡 👑 💰 ❤️ 🌟 ⚡   │ ← 3rd row
│ [More Emojis...] or swipe → │
│ ────────────────────────────│
│ [Cancel]                    │
└─────────────────────────────┘
```

3. User taps emoji → Sends to target player
4. Event emitted: `SendEmojiIntentEvent(myPlayer, targetPlayer, emoji)`
5. Toast: "Sent 😂 to Player2"
6. Other player sees emoji popup on their map (floating above their capital for 3s)

**Emoji Visibility:**

- Appears above target player's capital city
- Floats up with fade animation (3s duration)
- Visible to both sender and recipient
- Multiple emojis stack vertically

**Use Cases:**

- Friendly banter ("😂" after successful defense)
- Taunting enemy ("👎" before attack)
- Congratulations ("🏆" when ally takes city)
- Warning ("⚔️" before declaring war)

---

### 2.5 Embargo Player

**Trigger:** Tap "🚫 Embargo" in diplomacy popup

**Action Flow:**

1. User taps "🚫 Embargo"
2. Confirmation: "Embargo Player2? Stops trade ships for 10 ticks." [Cancel] [Embargo]
3. If confirmed → `SendEmbargoIntentEvent(targetPlayer, "start")`
4. Toast: "Embargo applied to Player2"
5. Trade ships from/to Player2 despawn immediately
6. Embargo timer shown in Intel sidebar (Players tab)

**Embargo Effects:**

- Trade ships between players despawn
- No new trade routes until embargo expires
- Can be lifted early by sender (tap "🚫 Lift Embargo")
- Both players see embargo status in player list

**Validation:**

```typescript
function canEmbargo(target: TileRef): boolean {
  const owner = game.owner(target);
  if (!owner.isPlayer()) return false;

  const actions = await game.myPlayer().actions(target);
  return actions?.interaction?.canEmbargo === true;
}
```

**Desktop Parity:**

- Uses same embargo system as desktop (10-tick default)
- Same event: `SendEmbargoIntentEvent(target, "start" | "stop")`

---

### 2.6 Donate Troops to Ally

**Trigger:** Tap "🎁 Donate Troops" in diplomacy popup (ally only)

**Action Flow:**

1. User taps "🎁 Donate Troops"
2. Donation picker appears:

```
┌─────────────────────────────┐
│ Donate to Player3:          │
│ ┌─────────────────────────┐ │
│ │ Infantry x5   ☑️         │ │ ← Checkboxes
│ │ Tank x2       ☑️         │ │
│ │ Artillery x1  ☐          │ │
│ └─────────────────────────┘ │
│ Select destination city:    │
│ • Capital (Player3)         │ ← Radio select
│ • Frontline City            │
│ ────────────────────────────│
│ [Cancel] [Donate 7 units]   │
└─────────────────────────────┘
```

3. User selects units + destination → Tap "Donate"
4. Event: `SendDonateTroopsIntentEvent(targetPlayer, troopCount)`
5. Units teleport to ally's city instantly
6. Both players get notification: "You donated 7 units" / "Player1 donated 7 units"

**Constraints:**

- Only own units can be donated
- Only to allied players
- Destination must be ally's city (cannot donate to empty tiles)
- Cannot donate units currently in combat
- Cannot donate structures (only mobile units)

**Validation:**

```typescript
function canDonateTroops(target: TileRef): boolean {
  const owner = game.owner(target);
  if (!owner.isPlayer()) return false;

  const actions = await game.myPlayer().actions(target);
  return actions?.interaction?.canDonateTroops === true;
}
```

---

### 2.7 Quick Chat Messages

**Trigger:** Tap "💬 Chat" button in top bar (new addition)

Opens chat sidebar (similar to Intel sidebar):

```
┌─────────────────┐
│ ✕ Chat          │
├─────────────────┤
│ 2 min ago       │
│ Player2: gg wp  │ ← Message bubble
│                 │
│ 5 min ago       │
│ You: thx!       │
│                 │
│ 10 min ago      │
│ Player3: ally?  │
│                 │
├─────────────────┤
│ [Quick Chat ▼]  │ ← Quick replies dropdown
│ Type message... │ ← Text input
└─────────────────┘
```

**Quick Chat Dropdown:**

- "gg wp" (good game well played)
- "thx" (thanks)
- "ally?" (want to ally?)
- "attack here 👉" (sends ping on selected tile)
- "wait" (hold position)
- "help!" (send reinforcements)

**Full Chat:**

- Tap "Type message..." → Opens keyboard
- Max 100 characters
- Enter → Sends message
- Visible to all players (global chat)

**Event:**

```typescript
eventBus.emit(new SendChatMessageIntentEvent(myPlayer, message, targetPlayer?));
```

**Note:** Chat may be game-wide or player-specific depending on desktop implementation. If desktop has restricted chat, follow same rules.

---

### 2.8 View Player (from Diplomacy popup)

**Action Flow:**

1. User taps "👁️ View Player"
2. Popup closes
3. Opens Intel Sidebar (§3) with selected player highlighted
4. Shows detailed stats, units, relations

---

## 3. Intel Sidebar (Swipe from Left)

### Trigger: Swipe from left edge OR tap [≡] hamburger

```
┌─────────────────┐─────────────┐
│ ✕ Intel         │             │
│ Players│Events  │             │ ← Tabs: Players / Events
├─────────────────┤             │
│ 🥇 Player1  2.4k│             │
│ 🥈 Player2  1.9k│             │   70% screen width
│ 🥉 You      1.2k│    MAP      │   Slides in from left
│ 4  Bot3    890  │  (dimmed    │   Map stays visible (30% opacity)
│ 5  Player4  670 ⚔️ 50%)       │   Tap outside → Dismisses
│                 │             │
│ ─────────────── │             │
│ Tap player row: │             │
│ • View Details  │             │
│ • Quick Actions │             │
└─────────────────┴─────────────┘
```

**Sidebar Properties:**

- **Width:** 70% screen (portrait), 50% (landscape)
- **Background:** Dark semi-transparent (95% opacity)
- **Map behind:** Dimmed to 30% opacity (still visible)
- **Slide animation:** 0.25s ease-out from left
- **Dismissal:** Swipe right, tap outside, tap ✕ button

---

## 4. Intel Sidebar - Players Tab

### Leaderboard Section

**Content:**

- Rankings (🥇🥈🥉 medals for top 3)
- Player name
- Population count (🏠 icon + number)
- Relation indicators:
  - 🤝 Allied (green)
  - ⚔️ At war (red)
  - 🕊️ Neutral (gray)

**Interaction:**

```
Tap player row → Bottom sheet appears with quick actions:

┌─────────────────┐
│ Player2 (Enemy) │ ← Header with relation
├─────────────────┤
│ 👁️ View Details │ → Opens detailed stats
│ ⚔️ Declare War  │   (if neutral/allied)
│ 🤝 Propose Ally │   (if neutral)
│ 🕊️ Request Peace│   (if at war)
│ 💰 Send Gold    │   (if allied)
└─────────────────┘
```

**Quick Actions:**

- Same diplomatic actions as Diplomacy popup (🤝 button)
- Convenient access without map selection
- Filtered by current relation (only valid actions shown)

**Desktop Source:** Leaderboard.ts + GameLeftSidebar.ts

---

## 5. Intel Sidebar - Events Tab

### Scrollable Event Feed

```
┌─────────────────┐
│ ✕ Intel         │
│ Players│Events  │ ← Events tab active
├─────────────────┤
│ 🔴 5 new        │ ← Badge count
│                 │
│ 2 min ago       │
│ ⚔️ Player2 is   │
│    attacking    │   Tap event → Center map on location
│    your City    │
│                 │
│ 5 min ago       │
│ 🤝 Player3 sent │
│    alliance req │ → [Accept] [Reject] buttons
│                 │
│ 10 min ago      │
│ 💰 Player4 sent │
│    you 500 gold │
│                 │
│ 15 min ago      │
│ 🔬 Research     │
│    complete:    │
│    Jet Engines  │
│                 │
│ [Load more...]  │
└─────────────────┘
```

**Event Types:**

- **Attacks** (incoming/outgoing)
  - ⚔️ "Player2 is attacking your City" (red)
  - Tap → Centers map on attacked tile
- **Alliance Requests**
  - 🤝 "Player3 sent alliance request" (green)
  - [Accept] [Reject] inline buttons
- **Donations/Trade**
  - 💰 "Player4 sent you 500 gold" (yellow)
- **Research Complete**
  - 🔬 "Research complete: Jet Engines" (blue)
- **War Declarations**
  - ⚔️ "Player2 declared war on you!" (red, bold)
- **Peace Accepted**
  - 🕊️ "Player3 accepted your peace request" (green)

**Desktop Source:** EventsDisplay.ts

---

## 6. Player Info Toast (Long-Press)

### Trigger: Long-press tile (0.6s hold)

```
┌─────────────────────┐
│ Player2 (Enemy)     │ ← Toast slides from top
│ 🏠 890  💰 450      │   Semi-transparent
│ ⚔️ At war           │   Auto-dismiss after 3s
│ Units: 12 🏙️ 3 ⚛️  │
└─────────────────────┘
```

**Toast Properties:**

- **Position:** Slides from top (below top bar)
- **Duration:** 3s auto-dismiss
- **Tap toast:** Expands to full player details (opens Intel sidebar)
- **Tap outside:** Dismisses immediately

**Content:**

- Player name
- Relation status (Enemy, Allied, Neutral)
- Population + Gold (if visible)
- Unit counts (if intel available)

**Desktop Source:** PlayerInfoOverlay.ts (hover → long-press trigger change)

---

## 7. Structure/Unit Info Overlays

### 7.1 Structure Info (Long-Press Own Structure)

```
┌─────────────────────┐
│ City (Level 3)      │
│ ❤️ Health: 850/1000 │
│ 🏠 +20 pop/tick     │
│ 💰 +5 gold/tick     │
│ Upgrade: $120       │
└─────────────────────┘
```

**Tap toast:** Opens Manage popup (⚙️) with upgrade option

---

### 7.2 Enemy Structure Info (Long-Press Enemy Structure)

```
┌─────────────────────┐
│ Missile Silo        │
│ ⚠️ Threat: High     │
│ Range: ~500 tiles   │
│ 🎯 Priority target  │
└─────────────────────┘
```

**Tap toast:** Opens Attack popup (⚔️) with structure targeting emphasized

---

### 7.3 Unit Info (Long-Press Own/Enemy Unit)

```
┌─────────────────────┐
│ Warship (Yours)     │
│ ❤️ Health: 100%     │
│ 📍 Movement: 15     │
│ 🔫 Attack: 50       │
└─────────────────────┘
```

**Tap toast:** Opens Deploy popup (✈️) for own units, Attack popup (⚔️) for enemy units

---

## 8. RadialMenu Migration (Final 3 Actions)

| Desktop RadialMenu Slot     | Mobile Context Popup               | Trigger                 | Status         |
| --------------------------- | ---------------------------------- | ----------------------- | -------------- |
| **Ally (Alliance Request)** | 🤝 Diplomacy → "🤝 Propose Ally"   | Select neutral → Tap 🤝 | ✅ Implemented |
| **Ally (Break Alliance)**   | 🤝 Diplomacy → "💔 Break Alliance" | Select ally → Tap 🤝    | ✅ Implemented |
| **Peace (Peace Request)**   | 🤝 Diplomacy → "🕊️ Request Peace"  | Select enemy → Tap 🤝   | ✅ Implemented |

**Combined with MOBILE-03:**

- ✅ **100% RadialMenu coverage** (9/9 actions)
- ✅ All event emissions match desktop
- ✅ All validation logic preserved

---

## 9. Event Emissions (Desktop Parity)

```typescript
// Alliance Request
eventBus.emit(new SendAllianceRequestIntentEvent(myPlayer, targetPlayer));

// Break Alliance
eventBus.emit(new SendBreakAllianceIntentEvent(myPlayer, targetPlayer));

// Request Peace
eventBus.emit(new SendPeaceRequestIntentEvent(myPlayer, targetPlayer));
```

**Result:** Server sees identical events from desktop and mobile clients.

---

## 10. Desktop Component Migration

| Desktop Component         | Mobile Equivalent                                 | Changes                                                            |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| **RadialMenu Ally slot**  | Diplomacy popup "Propose Ally" / "Break Alliance" | Text labels instead of icon-only                                   |
| **RadialMenu Peace slot** | Diplomacy popup "Request Peace"                   | Text label, dove icon preserved                                    |
| **Leaderboard.ts**        | Intel sidebar (Players tab)                       | Reused component, embedded in sidebar                              |
| **EventsDisplay.ts**      | Intel sidebar (Events tab)                        | Reused component, embedded in sidebar                              |
| **GameLeftSidebar.ts**    | Intel sidebar                                     | GameLeftSidebar embeds Leaderboard + TeamStats (not EventsDisplay) |
| **PlayerInfoOverlay.ts**  | Player Info Toast                                 | Hover → long-press trigger, toast UI                               |
| **PlayerPanel.ts**        | Quick actions in Players tab                      | Integrated into player row tap action                              |

---

## 11. Implementation Checklist

### Phase 4A: Diplomacy Popup (Week 7)

- [ ] Create `MobileDiplomacyPopup.ts` component
- [ ] Implement Propose Ally action (SendAllianceRequestIntentEvent)
- [ ] Implement Break Alliance action (SendBreakAllianceIntentEvent)
- [ ] Implement Request Peace action (SendPeaceRequestIntentEvent)
- [ ] Implement "View Player" option (opens Intel sidebar)
- [ ] Add validation for each action (conditional display)
- [ ] Add confirmation dialogs (especially for Break Alliance)
- [ ] Test color styling (green for ally, red for break, gray for peace)

### Phase 4B: Intel Sidebar (Week 7)

- [ ] Create `MobileIntelSidebar.ts` component
- [ ] Implement edge swipe detection (left, 20px threshold)
- [ ] Create Players tab (embed Leaderboard.ts)
- [ ] Create Events tab (embed EventsDisplay.ts)
- [ ] Add player row tap → quick actions sheet
- [ ] Add tab switching UI
- [ ] Test sidebar slide animation (0.25s ease-out)
- [ ] Test swipe-to-dismiss gesture

### Phase 4C: Player Info Toasts (Week 8)

- [ ] Create `MobilePlayerToast.ts` component
- [ ] Wire up long-press detection (from MOBILE-01)
- [ ] Fetch player data for toast content
- [ ] Implement 3s auto-dismiss
- [ ] Add tap-to-expand (opens Intel sidebar)
- [ ] Create structure info toast variant
- [ ] Create unit info toast variant
- [ ] Test on real device (long-press reliability)

### Phase 4D: Events Integration (Week 8)

- [ ] Wire up event notifications to Events tab
- [ ] Implement inline action buttons (Accept/Reject alliance)
- [ ] Add badge count on Intel sidebar hamburger (🔴 5 new)
- [ ] Implement tap event → center map on location
- [ ] Test real-time event updates (when new event arrives)

---

## 12. Design Decisions

**D1: Alliance/peace request expiration timers**

- **Decision:** Match desktop behavior (check if desktop has expiration)
- **Assumption:** Events likely stay until dismissed (no auto-expiration)
- **Implementation:** Use same event persistence logic as desktop EventsDisplay component

**D2: Player info toast with fog of war**

- **Decision:** Show toast with "???" for unknown stats (same as desktop)
- **Reasoning:** Gives feedback that player exists, maintains mystery for unrevealed info
- **Implementation:** Use game.myPlayer().canSee(targetPlayer) to gate data visibility

**D3: Events tab initial load**

- **Decision:** Last 20 events (infinite scroll to load more)
- **Reasoning:** Balance performance vs usability (20 events = ~2 screens on mobile)
- **Implementation:** Lazy load batches of 20 when scrolled to bottom

**D4: Quick actions from Players tab**

- **Decision:** Allow direct action without map selection first
- **Reasoning:** Faster UX - sidebar already shows player info, can act immediately
- **Implementation:** Emit events directly (SendAllianceRequestIntentEvent, etc.) without map interaction

**D5: Event notifications auto-open sidebar**

- **Decision:** Badge count only (no auto-open)
- **Reasoning:** Less intrusive - user chooses when to view events
- **Exception:** Consider toast notification for critical events (war declared on you) without auto-opening sidebar

---

## 13. Accessibility

### ARIA Labels

```html
<button class="diplomacy-action" aria-label="Propose alliance with Player2">
  🤝 Propose Ally
</button>

<div
  class="intel-sidebar"
  role="dialog"
  aria-label="Player intelligence and events"
>
  ...
</div>
```

### Keyboard Support

- **Tab:** Navigate between player rows / event rows
- **Enter:** Activate quick action
- **Escape:** Close sidebar

---

## Next Steps

✅ **MOBILE-01:** Core interactions  
✅ **MOBILE-02:** Build & Economy  
✅ **MOBILE-03:** Combat & Attack (RadialMenu 6/9 actions)  
✅ **This doc:** Diplomacy & Intel (RadialMenu 3/3 remaining actions)  
⏭️ **MOBILE-05:** Research & Progression (tech tree sidebar)

**RadialMenu Migration:** ✅ **COMPLETE** (9/9 actions covered across MOBILE-03 + MOBILE-04)
