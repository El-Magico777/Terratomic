/**
 * MobileAttackBar - Shows active attacks/boats/paratroopers as small bubbles
 * Positioned directly beneath the topbar, max 2 rows
 */

import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { PlayerType, UnitType } from "../../../core/game/Game";
import { GameView, PlayerView, UnitView } from "../../../core/game/GameView";
import {
  CancelAttackIntentEvent,
  CancelBoatIntentEvent,
  CancelParatrooperIntentEvent,
} from "../../Transport";
import { renderTroops } from "../../Utils";
import {
  GoToPlayerEvent,
  GoToPositionEvent,
  GoToUnitEvent,
} from "../../graphics/layers/Leaderboard";

interface AttackBubble {
  type: "incoming" | "outgoing" | "land" | "boat" | "paratrooper";
  id: string | number;
  troops: number;
  playerName?: string;
  retreating?: boolean;
  // For camera focus
  attackerID?: number;
  targetID?: number;
  attackID?: string;
  unitView?: UnitView;
}

@customElement("mobile-attack-bar")
export class MobileAttackBar extends LitElement {
  @property({ type: Object }) eventBus!: EventBus;
  @property({ type: Object }) game!: GameView;

  @state() private bubbles: AttackBubble[] = [];

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: calc(44px + env(safe-area-inset-top, 0px));
      left: 0;
      right: 0;
      z-index: 1640;
      pointer-events: none;
    }

    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 12px;
      max-height: 96px; /* ~2 rows of 36px bubbles + gaps + padding */
      overflow: hidden;
      pointer-events: auto;
    }

    .container:empty {
      display: none;
    }

    .bubble {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 10px;
      background: rgba(15, 15, 20, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 18px;
      font-size: 12px;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
      color: white;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition:
        transform 0.1s ease,
        opacity 0.15s ease;
      user-select: none;
    }

    .bubble:active {
      transform: scale(0.95);
    }

    /* Color coding */
    .bubble.incoming {
      border-left: 3px solid #ef4444;
    }

    .bubble.outgoing,
    .bubble.boat,
    .bubble.paratrooper {
      border-left: 3px solid #3b82f6;
    }

    .bubble.land {
      border-left: 3px solid #6b7280;
    }

    .bubble.retreating {
      opacity: 0.7;
    }

    .icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .troops {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .name {
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.9;
    }

    .retreating-label {
      font-size: 10px;
      opacity: 0.7;
      font-style: italic;
    }

    .cancel-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin-left: 4px;
      margin-right: -6px;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: background 0.1s ease;
    }

    .cancel-btn:active {
      background: rgba(255, 255, 255, 0.35);
    }
  `;

  /**
   * Update attack data from game state - called from MobileUI tick loop
   */
  tick(): void {
    if (!this.game) return;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer || !myPlayer.isAlive()) {
      if (this.bubbles.length > 0) {
        this.bubbles = [];
      }
      return;
    }

    const newBubbles: AttackBubble[] = [];

    // Incoming attacks (red) - exclude bot attacks
    const incomingAttacks = myPlayer.incomingAttacks().filter((a) => {
      const attacker = this.game.playerBySmallID(a.attackerID) as PlayerView;
      return attacker && attacker.type() !== PlayerType.Bot;
    });

    for (const attack of incomingAttacks) {
      const attacker = this.game.playerBySmallID(
        attack.attackerID,
      ) as PlayerView;
      newBubbles.push({
        type: "incoming",
        id: attack.id,
        troops: attack.troops,
        playerName: attacker?.name() ?? "Unknown",
        retreating: attack.retreating,
        attackerID: attack.attackerID,
        attackID: attack.id,
      });
    }

    // Outgoing attacks (blue) - against players
    const outgoingAttacks = myPlayer
      .outgoingAttacks()
      .filter((a) => a.targetID !== 0);

    for (const attack of outgoingAttacks) {
      const target = this.game.playerBySmallID(attack.targetID) as PlayerView;
      newBubbles.push({
        type: "outgoing",
        id: attack.id,
        troops: attack.troops,
        playerName: target?.name() ?? "Unknown",
        retreating: attack.retreating,
        targetID: attack.targetID,
        attackID: attack.id,
      });
    }

    // Outgoing land attacks (gray) - against wilderness
    const landAttacks = myPlayer
      .outgoingAttacks()
      .filter((a) => a.targetID === 0);

    for (const attack of landAttacks) {
      newBubbles.push({
        type: "land",
        id: attack.id,
        troops: attack.troops,
        playerName: "Wilderness",
        retreating: attack.retreating,
        attackID: attack.id,
      });
    }

    // Boats (blue)
    const boats = myPlayer
      .units()
      .filter((u) => u.type() === UnitType.TransportShip);

    for (const boat of boats) {
      newBubbles.push({
        type: "boat",
        id: boat.id(),
        troops: boat.troops(),
        retreating: boat.retreating(),
        unitView: boat,
      });
    }

    // Paratroopers (blue)
    const paratroopers = myPlayer
      .units()
      .filter((u) => u.type() === UnitType.Paratrooper);

    for (const para of paratroopers) {
      newBubbles.push({
        type: "paratrooper",
        id: para.id(),
        troops: para.troops(),
        unitView: para,
      });
    }

    // Only update if changed (shallow comparison of length and IDs)
    if (this.hasBubblesChanged(newBubbles)) {
      this.bubbles = newBubbles;
    }
  }

  private hasBubblesChanged(newBubbles: AttackBubble[]): boolean {
    if (this.bubbles.length !== newBubbles.length) return true;

    for (let i = 0; i < newBubbles.length; i++) {
      const oldB = this.bubbles[i];
      const newB = newBubbles[i];
      if (
        oldB.id !== newB.id ||
        oldB.type !== newB.type ||
        oldB.troops !== newB.troops ||
        oldB.retreating !== newB.retreating
      ) {
        return true;
      }
    }
    return false;
  }

  private getIcon(type: AttackBubble["type"]): string {
    switch (type) {
      case "incoming":
        return "⚔️";
      case "outgoing":
      case "land":
        return "🗡️";
      case "boat":
        return "⛵";
      case "paratrooper":
        return "🪂";
    }
  }

  private async handleBubbleTap(bubble: AttackBubble, e: Event): Promise<void> {
    e.stopPropagation();

    switch (bubble.type) {
      case "incoming":
        // Focus on attacker - try to get attack position first
        if (bubble.attackerID !== undefined) {
          const attacker = this.game.playerBySmallID(
            bubble.attackerID,
          ) as PlayerView;
          if (attacker && bubble.attackID) {
            const avgPos = await attacker.attackAveragePosition(
              bubble.attackerID,
              bubble.attackID,
            );
            if (avgPos) {
              this.eventBus.emit(new GoToPositionEvent(avgPos.x, avgPos.y));
              return;
            }
          }
          if (attacker) {
            this.eventBus.emit(new GoToPlayerEvent(attacker));
          }
        }
        break;

      case "outgoing":
        // Focus on target player
        if (bubble.targetID !== undefined) {
          const target = this.game.playerBySmallID(
            bubble.targetID,
          ) as PlayerView;
          if (target) {
            this.eventBus.emit(new GoToPlayerEvent(target));
          }
        }
        break;

      case "land":
        // No specific focus for wilderness attacks
        break;

      case "boat":
      case "paratrooper":
        // Focus on unit
        if (bubble.unitView) {
          this.eventBus.emit(new GoToUnitEvent(bubble.unitView));
        }
        break;
    }
  }

  private handleCancel(bubble: AttackBubble, e: Event): void {
    e.stopPropagation();

    // Immediately remove the bubble from UI for instant feedback
    this.bubbles = this.bubbles.filter((b) => b.id !== bubble.id);

    switch (bubble.type) {
      case "outgoing":
      case "land":
        if (bubble.attackID) {
          this.eventBus.emit(new CancelAttackIntentEvent(bubble.attackID));
        }
        break;

      case "boat":
        this.eventBus.emit(new CancelBoatIntentEvent(bubble.id as number));
        break;

      case "paratrooper":
        this.eventBus.emit(
          new CancelParatrooperIntentEvent(bubble.id as number),
        );
        break;
    }
  }

  private renderBubble(bubble: AttackBubble): TemplateResult {
    const canCancel =
      bubble.type !== "incoming" &&
      !(bubble.type === "boat" && bubble.retreating);

    return html`
      <div
        class="bubble ${bubble.type} ${bubble.retreating ? "retreating" : ""}"
        @click=${(e: Event) => this.handleBubbleTap(bubble, e)}
      >
        <span class="icon">${this.getIcon(bubble.type)}</span>
        <span class="troops">${renderTroops(bubble.troops)}</span>
        ${bubble.playerName
          ? html`<span class="name">${bubble.playerName}</span>`
          : ""}
        ${bubble.retreating
          ? html`<span class="retreating-label">↩</span>`
          : ""}
        ${canCancel
          ? html`
              <button
                class="cancel-btn"
                @click=${(e: Event) => this.handleCancel(bubble, e)}
                aria-label="Cancel"
              >
                ✕
              </button>
            `
          : ""}
      </div>
    `;
  }

  render() {
    if (this.bubbles.length === 0) {
      return html``;
    }

    return html`
      <div class="container">
        ${this.bubbles.map((b) => this.renderBubble(b))}
      </div>
    `;
  }
}
