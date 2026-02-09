/**
 * Mobile top bar - minimal status bar showing stats and controls
 * 32px height, translucent background
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface TopBarStats {
  population: number;
  gold: number;
  populationGrowth?: number;
  goldIncome?: number;
}

@customElement("mobile-top-bar")
export class MobileTopBar extends LitElement {
  @property({ type: Object }) stats: TopBarStats = {
    population: 0,
    gold: 0,
  };

  @property({ type: Boolean }) showDetails: boolean = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }

    .top-bar {
      height: 32px;
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
    .settings-button {
      width: 44px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    .menu-button:active,
    .settings-button:active {
      opacity: 0.6;
    }

    .stats {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      justify-content: center;
      cursor: pointer;
      padding: 4px 8px;
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

    .icon {
      font-size: 16px;
    }

    .value {
      font-weight: 500;
    }

    /* Details tooltip */
    .details-tooltip {
      position: absolute;
      top: calc(32px + env(safe-area-inset-top, 0) + 8px);
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
    .menu-button:focus-visible {
      outline: 2px solid white;
      outline-offset: 2px;
    }
  `;

  render() {
    return html`
      <div class="top-bar">
        <button
          class="menu-button"
          aria-label="Open menu"
          @click="${this.handleMenuClick}"
        >
          ≡
        </button>

        <div class="stats" @click="${this.handleStatsClick}">
          <div class="stat" title="Population">
            <span class="icon">🏠</span>
            <span class="value"
              >${this.formatNumber(this.stats.population)}</span
            >
          </div>
          <div class="stat" title="Gold">
            <span class="icon">💰</span>
            <span class="value">${this.formatNumber(this.stats.gold)}</span>
          </div>
        </div>

        <button
          class="settings-button"
          aria-label="Settings"
          @click="${this.handleSettingsClick}"
        >
          ⚙️
        </button>
      </div>

      ${this.renderDetailsTooltip()}
    `;
  }

  private renderDetailsTooltip() {
    if (!this.showDetails) return null;

    const {
      population,
      gold,
      populationGrowth = 0,
      goldIncome = 0,
    } = this.stats;

    return html`
      <div class="details-tooltip visible">
        <div class="detail-row">
          <span class="detail-label">Population:</span>
          <span class="detail-value">${this.formatNumber(population)}</span>
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

  private formatNumber(value: number): string {
    // Format with commas for thousands
    return Math.floor(value).toLocaleString();
  }

  private handleMenuClick(): void {
    this.dispatchEvent(
      new CustomEvent("menu-click", {
        bubbles: true,
        composed: true,
      }),
    );

    // Light haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
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
