/**
 * MobilePlayerToast - Quick player info toast (long-press trigger)
 * Shows player name, relation, population, gold
 * Part of Phase 4: Diplomacy & Intel System
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { EventBus } from "../../../core/EventBus";
import type { GameView, PlayerView } from "../../../core/game/GameView";
import {
  SendDeclareWarIntentEvent,
  SendPeaceRequestIntentEvent,
} from "../../Transport";
import { HapticFeedback } from "../utils/HapticFeedback";

@customElement("mobile-player-toast")
export class MobilePlayerToast extends LitElement {
  @property({ type: Boolean, reflect: true }) visible: boolean = false;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) player: PlayerView | null = null;
  @property({ type: Object }) eventBus: EventBus | null = null;

  private autoHideTimeout: number | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 64px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      z-index: 2500;
      pointer-events: none;
      opacity: 0;
      transition:
        transform 0.25s ease-out,
        opacity 0.25s ease-out;
    }

    :host([visible]) {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    .toast {
      background: rgba(20, 20, 30, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 12px;
      padding: 16px 20px;
      min-width: 240px;
      box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.4),
        0 4px 8px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .toast:active {
      transform: scale(0.98);
    }

    .player-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .player-name {
      color: white;
      font-size: 16px;
      font-weight: 600;
      flex: 1;
    }

    .relation-badge {
      font-size: 18px;
    }

    .player-stats {
      display: flex;
      gap: 16px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .relation-text {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      margin-top: 4px;
    }

    .relation-text.allied {
      color: #10b981;
    }

    .relation-text.enemy {
      color: #ef4444;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 12px;
    }

    .action-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      transition: all 0.15s;
    }

    .action-btn:active {
      transform: scale(0.95);
    }

    .action-btn.peace {
      background: #3b82f6;
      color: white;
    }

    .action-btn.war {
      background: #ef4444;
      color: white;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  render() {
    if (!this.visible || !this.player || !this.game) return null;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return null;

    const isAllied = myPlayer.isAlliedWith(this.player);
    const isEnemy = myPlayer.isAtWarWith(this.player);

    const relation = isAllied ? "allied" : isEnemy ? "enemy" : "neutral";
    const relationText = isAllied ? "Allied" : isEnemy ? "At War" : "Neutral";
    const relationIcon = isAllied ? "🤝" : isEnemy ? "⚔️" : "";

    const population = this.player.numTilesOwned();
    const gold = Number(this.player.gold());

    return html`
      <div class="toast" @click="${this.handleClick}">
        <div class="player-header">
          <div class="player-name">${this.player.name()}</div>
          ${relationIcon
            ? html`<div class="relation-badge">${relationIcon}</div>`
            : null}
        </div>
        <div class="player-stats">
          <div class="stat">🏠 ${population}</div>
          <div class="stat">💰 ${gold}</div>
        </div>
        <div class="relation-text ${relation}">${relationText}</div>
        ${this.renderActions()}
      </div>
    `;
  }

  private renderActions() {
    if (!this.player || !this.game || !this.eventBus) return null;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return null;

    const isAllied = myPlayer.isAlliedWith(this.player);
    const isAtWar = myPlayer.isAtWarWith(this.player);

    // Can't interact with yourself
    if (this.player === myPlayer) return null;

    return html`
      <div class="actions" @click="${(e: Event) => e.stopPropagation()}">
        ${isAtWar
          ? html`
              <button class="action-btn peace" @click="${this.handlePeace}">
                ⚔️ Peace
              </button>
            `
          : !isAllied
            ? html`
                <button class="action-btn peace" @click="${this.handlePeace}">
                  🕊️ Peace
                </button>
              `
            : null}
        ${!isAtWar && !isAllied
          ? html`
              <button class="action-btn war" @click="${this.handleWar}">
                ☠️ War
              </button>
            `
          : null}
      </div>
    `;
  }

  private handlePeace = () => {
    if (!this.player || !this.game || !this.eventBus) return;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return;

    this.eventBus.emit(new SendPeaceRequestIntentEvent(myPlayer, this.player));

    HapticFeedback.success();
    this.hide();
  };

  private handleWar = () => {
    if (!this.player || !this.game || !this.eventBus) return;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return;

    this.eventBus.emit(new SendDeclareWarIntentEvent(myPlayer, this.player));

    HapticFeedback.error();
    this.hide();
  };

  show(player: PlayerView, duration: number = 3000): void {
    this.player = player;
    this.visible = true;
    this.requestUpdate(); // Force re-render

    // Auto-hide after duration
    if (this.autoHideTimeout !== null) {
      clearTimeout(this.autoHideTimeout);
    }
    this.autoHideTimeout = window.setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide(): void {
    this.visible = false;
    this.requestUpdate(); // Force re-render
    if (this.autoHideTimeout !== null) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
  }

  private handleClick(): void {
    // Emit event to expand to full player details (opens Intel sidebar)
    this.dispatchEvent(
      new CustomEvent("toast-clicked", {
        detail: { player: this.player },
        bubbles: true,
        composed: true,
      }),
    );
    this.hide();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-player-toast": MobilePlayerToast;
  }
}
