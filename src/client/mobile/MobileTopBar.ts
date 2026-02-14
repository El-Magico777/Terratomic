/**
 * Mobile top bar - minimal status bar showing stats and controls
 * 32px height, translucent background
 */

import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { renderNumber, renderTroops } from "../Utils";

export interface TopBarStats {
  population: number;
  maxPopulation: number;
  gold: number;
  populationGrowth?: number;
  goldIncome?: number;
  gameDurationSeconds?: number; // Game time in seconds (only counts after spawn phase)
  inSpawnPhase?: boolean; // Whether game is still in spawn phase
}

@customElement("mobile-top-bar")
export class MobileTopBar extends LitElement {
  @property({ type: Object }) stats: TopBarStats = {
    population: 0,
    maxPopulation: 0,
    gold: 0,
  };

  @property({ type: Boolean }) showDetails: boolean = false;

  @state() private tradeIncomeAmount: number | bigint | null = null;
  @state() private tradeIncomeAnimating: boolean = false;

  private tradeIncomeHideTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private tradeIncomeAnimationTimeoutId: ReturnType<typeof setTimeout> | null =
    null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1650;
    }

    .top-bar {
      min-height: 44px;
      padding-top: env(safe-area-inset-top, 0);
      padding-left: max(16px, env(safe-area-inset-left, 0));
      padding-right: max(16px, env(safe-area-inset-right, 0));
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
      font-size: 14px;
      user-select: none;
    }

    .menu-button,
    .research-button,
    .settings-button {
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .menu-button:active,
    .research-button:active,
    .settings-button:active {
      opacity: 0.6;
    }

    .game-clock {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.3px;
    }

    .buttons-right {
      display: flex;
      gap: 4px;
    }

    .stats {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      justify-content: center;
      cursor: pointer;
      padding: 12px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .stats:active {
      background: rgba(255, 255, 255, 0.1);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
      font-variant-numeric: tabular-nums;
    }

    .stat.gold-stat {
      gap: 6px;
      position: relative;
    }

    .icon {
      font-size: 16px;
    }

    .value {
      font-weight: 500;
    }

    .trade-income-indicator {
      position: absolute;
      left: calc(100% + 6px);
      top: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 18px;
      padding: 0 6px;
      border-radius: 999px;
      border: 1px solid rgba(74, 222, 128, 0.75);
      background: rgba(10, 30, 14, 0.9);
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.35),
        0 2px 6px rgba(0, 0, 0, 0.35);
      font-size: 12px;
      font-weight: 800;
      color: #4ade80;
      text-shadow: 0 0 6px rgba(74, 222, 128, 0.35);
      font-variant-numeric: tabular-nums;
      transform: translateY(-50%);
      transform-origin: center;
      will-change: transform;
      pointer-events: none;
      white-space: nowrap;
    }

    .trade-income-indicator.animating {
      animation: tradeIncomePulse 0.6s ease-out;
    }

    @keyframes tradeIncomePulse {
      0% {
        transform: translateY(-50%) scale(1);
      }
      30% {
        transform: translateY(-50%) scale(1.2);
      }
      60% {
        transform: translateY(-50%) scale(1.08);
      }
      100% {
        transform: translateY(-50%) scale(1);
      }
    }

    /* Details tooltip */
    .details-tooltip {
      position: absolute;
      top: calc(44px + env(safe-area-inset-top, 0) + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-size: 13px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 101;
    }

    .details-tooltip.visible {
      opacity: 1;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 4px 0;
    }

    .detail-label {
      color: #9ca3af;
    }

    .detail-value {
      color: white;
      font-weight: 500;
    }

    .growth-positive {
      color: #10b981;
    }

    .growth-negative {
      color: #ef4444;
    }

    /* Accessibility */
    .settings-button:focus-visible,
    .research-button:focus-visible,
    .menu-button:focus-visible {
      outline: 2px solid white;
      outline-offset: 2px;
    }
  `;

  render() {
    const { gameDurationSeconds = 0, inSpawnPhase = true } = this.stats;

    // Format time like desktop: "1h2m3s", "2m3s", "3s"
    let timeDisplay = "";
    if (!inSpawnPhase && gameDurationSeconds > 0) {
      const hours = Math.floor(gameDurationSeconds / 3600);
      const minutes = Math.floor((gameDurationSeconds % 3600) / 60);
      const seconds = gameDurationSeconds % 60;

      if (hours > 0) timeDisplay = `${hours}h`;
      if (minutes > 0) timeDisplay += `${minutes}m`;
      timeDisplay += `${seconds}s`;
    }

    return html`
      <div class="top-bar">
        ${timeDisplay
          ? html`<div class="game-clock" title="Game Time">${timeDisplay}</div>`
          : ""}

        <div class="stats" @click="${this.handleStatsClick}">
          <div class="stat" title="Population">
            <span class="icon">🏠</span>
            <span class="value"
              >${renderTroops(this.stats.population)}/${renderTroops(
                this.stats.maxPopulation,
              )}</span
            >
          </div>
          <div class="stat gold-stat" title="Gold">
            <span class="icon">💰</span>
            <span class="value">${this.formatNumber(this.stats.gold)}</span>
            ${this.tradeIncomeAmount !== null
              ? html`<span
                  class="trade-income-indicator ${this.tradeIncomeAnimating
                    ? "animating"
                    : ""}"
                  >+${this.formatNumber(this.tradeIncomeAmount)}</span
                >`
              : ""}
          </div>
        </div>

        <div class="buttons-right">
          <button
            class="settings-button"
            aria-label="Settings"
            @click="${this.handleSettingsClick}"
          >
            ⚙️
          </button>
        </div>
      </div>

      ${this.renderDetailsTooltip()}
    `;
  }

  private renderDetailsTooltip() {
    if (!this.showDetails) return null;

    const {
      population,
      maxPopulation,
      gold,
      populationGrowth = 0,
      goldIncome = 0,
    } = this.stats;

    return html`
      <div class="details-tooltip visible">
        <div class="detail-row">
          <span class="detail-label">Population:</span>
          <span class="detail-value"
            >${renderTroops(population)} / ${renderTroops(maxPopulation)}</span
          >
        </div>
        <div class="detail-row">
          <span class="detail-label">Growth:</span>
          <span
            class="detail-value ${populationGrowth >= 0
              ? "growth-positive"
              : "growth-negative"}"
          >
            ${populationGrowth >= 0 ? "+" : ""}${this.formatNumber(
              populationGrowth,
            )}/tick
          </span>
        </div>
        <div
          class="detail-row"
          style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; padding-top: 8px;"
        >
          <span class="detail-label">Gold:</span>
          <span class="detail-value">${this.formatNumber(gold)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Income:</span>
          <span
            class="detail-value ${goldIncome >= 0
              ? "growth-positive"
              : "growth-negative"}"
          >
            ${goldIncome >= 0 ? "+" : ""}${this.formatNumber(goldIncome)}/tick
          </span>
        </div>
      </div>
    `;
  }

  private formatNumber(value: number | bigint): string {
    return renderNumber(value);
  }

  showTradeIncomeIndicator(amount: number | bigint): void {
    const normalized = Number(amount);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return;
    }

    this.tradeIncomeAmount = normalized;

    if (this.tradeIncomeHideTimeoutId !== null) {
      clearTimeout(this.tradeIncomeHideTimeoutId);
    }
    this.tradeIncomeHideTimeoutId = setTimeout(() => {
      this.tradeIncomeAmount = null;
      this.tradeIncomeAnimating = false;
      this.tradeIncomeHideTimeoutId = null;
      this.requestUpdate();
    }, 5000);

    this.tradeIncomeAnimating = false;
    this.requestUpdate();
    requestAnimationFrame(() => {
      this.tradeIncomeAnimating = true;
      this.requestUpdate();
    });

    if (this.tradeIncomeAnimationTimeoutId !== null) {
      clearTimeout(this.tradeIncomeAnimationTimeoutId);
    }
    this.tradeIncomeAnimationTimeoutId = setTimeout(() => {
      this.tradeIncomeAnimating = false;
      this.tradeIncomeAnimationTimeoutId = null;
      this.requestUpdate();
    }, 650);
  }

  clearTradeIncomeIndicator(): void {
    this.tradeIncomeAmount = null;
    this.tradeIncomeAnimating = false;

    if (this.tradeIncomeHideTimeoutId !== null) {
      clearTimeout(this.tradeIncomeHideTimeoutId);
      this.tradeIncomeHideTimeoutId = null;
    }
    if (this.tradeIncomeAnimationTimeoutId !== null) {
      clearTimeout(this.tradeIncomeAnimationTimeoutId);
      this.tradeIncomeAnimationTimeoutId = null;
    }

    this.requestUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearTradeIncomeIndicator();
  }

  private handleSettingsClick(): void {
    this.dispatchEvent(
      new CustomEvent("settings-click", {
        bubbles: true,
        composed: true,
      }),
    );

    // Light haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  private handleStatsClick(): void {
    this.showDetails = !this.showDetails;

    // Auto-hide after 3 seconds
    if (this.showDetails) {
      setTimeout(() => {
        this.showDetails = false;
      }, 3000);
    }

    // Light haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  /**
   * Update displayed stats
   */
  updateStats(stats: TopBarStats): void {
    this.stats = { ...stats };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-top-bar": MobileTopBar;
  }
}
