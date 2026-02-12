/**
 * MobileIntelSidebar - Side panel with Players and Events tabs
 * Swipes in from left edge, shows leaderboard and event feed
 * Part of Phase 4: Diplomacy & Intel System
 */

import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { GameView, PlayerView } from "../../../core/game/GameView";
import { HapticFeedback } from "../utils/HapticFeedback";

export type IntelTab = "players" | "events";

@customElement("mobile-intel-sidebar")
export class MobileIntelSidebar extends LitElement {
  @property({ type: Boolean, reflect: true }) visible: boolean = false;
  @property({ type: Object }) game: GameView | null = null;
  @state() private activeTab: IntelTab = "players";

  static styles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 3000;
      pointer-events: none;
    }

    :host([visible]) {
      display: block;
      pointer-events: all;
    }

    .backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.25s ease;
    }

    :host([visible]) .backdrop {
      opacity: 1;
    }

    .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 70%;
      max-width: 400px;
      background: rgba(20, 20, 30, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
      transform: translateX(-100%);
      transition: transform 0.25s ease-out;
      display: flex;
      flex-direction: column;
    }

    :host([visible]) .sidebar {
      transform: translateX(0);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.3);
    }

    .title {
      color: white;
      font-size: 18px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 4px 8px;
      -webkit-tap-highlight-color: transparent;
    }

    .close-btn:active {
      opacity: 0.6;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }

    .tab {
      flex: 1;
      padding: 12px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      position: relative;
      -webkit-tap-highlight-color: transparent;
    }

    .tab.active {
      color: white;
    }

    .tab.active::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: #3b82f6;
    }

    .tab:active {
      background: rgba(255, 255, 255, 0.05);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    /* Players tab styles */
    .player-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .player-row:active {
      background: rgba(255, 255, 255, 0.1);
    }

    .player-rank {
      font-size: 20px;
      min-width: 32px;
    }

    .player-info {
      flex: 1;
    }

    .player-name {
      color: white;
      font-weight: 500;
      font-size: 15px;
    }

    .player-stats {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      margin-top: 2px;
    }

    .player-relation {
      font-size: 18px;
    }

    /* Events tab styles */
    .event-item {
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      color: white;
    }

    .event-time {
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      margin-bottom: 4px;
    }

    .event-message {
      font-size: 14px;
    }

    .empty-state {
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      padding: 48px 16px;
      font-size: 14px;
    }

    /* Scrollbar styling */
    .content::-webkit-scrollbar {
      width: 8px;
    }

    .content::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    .content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `;

  render() {
    if (!this.visible) return null;

    return html`
      <div class="backdrop" @click="${this.handleBackdropClick}"></div>
      <div class="sidebar">
        <div class="header">
          <div class="title">Intel</div>
          <button class="close-btn" @click="${this.close}">✕</button>
        </div>
        <div class="tabs">
          <button
            class="tab ${this.activeTab === "players" ? "active" : ""}"
            @click="${() => this.switchTab("players")}"
          >
            Players
          </button>
          <button
            class="tab ${this.activeTab === "events" ? "active" : ""}"
            @click="${() => this.switchTab("events")}"
          >
            Events
          </button>
        </div>
        <div class="content">
          ${this.activeTab === "players"
            ? this.renderPlayersTab()
            : this.renderEventsTab()}
        </div>
      </div>
    `;
  }

  private renderPlayersTab() {
    if (!this.game) {
      // Show loading state while game data loads
      return html`<div class="empty-state">Loading...</div>`;
    }

    const players = this.getPlayerList();

    if (players.length === 0) {
      return html`<div class="empty-state">No players found</div>`;
    }

    return html`
      ${players.map((entry, index) => this.renderPlayerRow(entry, index))}
    `;
  }

  private renderPlayerRow(
    entry: {
      player: PlayerView;
      population: number;
      gold: number;
      relation: string;
    },
    index: number,
  ) {
    const rankIcon =
      index === 0
        ? "🥇"
        : index === 1
          ? "🥈"
          : index === 2
            ? "🥉"
            : `${index + 1}`;

    const relationIcon =
      entry.relation === "allied"
        ? "🤝"
        : entry.relation === "enemy"
          ? "⚔️"
          : "";

    return html`
      <div
        class="player-row"
        @click="${() => this.handlePlayerClick(entry.player)}"
      >
        <div class="player-rank">${rankIcon}</div>
        <div class="player-info">
          <div class="player-name">${entry.player.name()}</div>
          <div class="player-stats">
            🏠 ${entry.population} · 💰 ${entry.gold}
          </div>
        </div>
        ${relationIcon
          ? html`<div class="player-relation">${relationIcon}</div>`
          : null}
      </div>
    `;
  }

  private renderEventsTab() {
    // Events log is a desktop-only feature
    // Mobile uses a simpler notification system via toasts and action confirmations
    return html`
      <div class="empty-state">
        <div style="opacity: 0.6; margin-bottom: 16px;">📱</div>
        Events log not available on mobile
        <br /><br />
        <div style="font-size: 13px; opacity: 0.7;">
          Game notifications appear as:
          <br />
          • Player toasts (tap enemy tiles)
          <br />
          • Action confirmations
          <br />
          • Top bar updates
        </div>
      </div>
    `;
  }

  private getPlayerList() {
    if (!this.game) return [];

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return [];

    const allPlayers = this.game.players();
    return allPlayers
      .map((player) => {
        const population = player.numTilesOwned();
        const gold = Number(player.gold());

        let relation = "neutral";
        if (myPlayer.isAlliedWith(player)) {
          relation = "allied";
        } else if (myPlayer.isAtWarWith(player)) {
          relation = "enemy";
        }

        return { player, population, gold, relation };
      })
      .sort((a, b) => b.population - a.population); // Sort by population
  }

  private switchTab(tab: IntelTab): void {
    this.activeTab = tab;
    HapticFeedback.tap();
  }

  private handleBackdropClick(): void {
    this.close();
  }

  private handlePlayerClick(player: PlayerView): void {
    HapticFeedback.tap();
    // Emit event for player click - can open diplomacy actions
    this.dispatchEvent(
      new CustomEvent("player-selected", {
        detail: { player },
        bubbles: true,
        composed: true,
      }),
    );
  }

  open(): void {
    this.visible = true;
    HapticFeedback.tap();
  }

  close(): void {
    this.visible = false;
    this.dispatchEvent(
      new CustomEvent("sidebar-closed", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  toggle(): void {
    if (this.visible) {
      this.close();
    } else {
      this.open();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-intel-sidebar": MobileIntelSidebar;
  }
}
