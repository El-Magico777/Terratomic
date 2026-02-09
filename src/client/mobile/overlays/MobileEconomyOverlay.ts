/**
 * MobileEconomyOverlay - Investment sliders for production, road, and research
 * Swipes up from bottom to adjust economic settings
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  INVESTMENT_REQUEST_EVENT,
  type InvestmentRequestDetail,
  type InvestmentSlider,
} from "../../events/InvestmentEvents";

export interface EconomyStats {
  production: number; // 0-100
  road: number; // 0-100
  research: number; // 0-100
  productionLocked: boolean;
  roadLocked: boolean;
  researchLocked: boolean;
}

@customElement("mobile-economy-overlay")
export class MobileEconomyOverlay extends LitElement {
  @property({ type: Boolean }) visible: boolean = false;
  @property({ type: Number }) production: number = 50;
  @property({ type: Number }) road: number = 0;
  @property({ type: Number }) research: number = 0;
  @property({ type: Boolean }) productionLocked: boolean = false;
  @property({ type: Boolean }) roadLocked: boolean = false;
  @property({ type: Boolean }) researchLocked: boolean = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1800;
      pointer-events: none;
    }

    :host([visible]) {
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

    .panel {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top-left-radius: 24px;
      border-top-right-radius: 24px;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
      padding-bottom: env(safe-area-inset-bottom, 0);
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-height: 80vh;
      overflow-y: auto;
    }

    :host([visible]) .panel {
      transform: translateY(0);
    }

    .handle {
      width: 48px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      margin: 12px auto;
    }

    .header {
      padding: 16px 24px 8px;
      color: white;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
    }

    .title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }

    .content {
      padding: 0 24px 24px;
    }

    .slider-group {
      margin-bottom: 32px;
    }

    .slider-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .slider-label {
      color: white;
      font-size: 15px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .slider-icon {
      font-size: 18px;
    }

    .slider-value {
      color: #fbbf24;
      font-size: 16px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      min-width: 48px;
      text-align: right;
    }

    .lock-button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.6);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      margin-left: 8px;
      -webkit-tap-highlight-color: transparent;
    }

    .lock-button.locked {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
      color: #3b82f6;
    }

    .lock-button:active {
      background: rgba(255, 255, 255, 0.1);
    }

    .slider-container {
      position: relative;
      height: 48px;
      display: flex;
      align-items: center;
    }

    .slider {
      width: 100%;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      outline: none;
      cursor: pointer;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.15s ease;
    }

    .slider::-webkit-slider-thumb:active {
      transform: scale(1.2);
    }

    .slider::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .constraint-warning {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-top: 16px;
      color: #fca5a5;
      font-size: 13px;
      line-height: 1.5;
    }

    .constraint-sum {
      font-weight: 600;
      color: #ef4444;
    }

    .close-button {
      position: sticky;
      bottom: 16px;
      width: calc(100% - 48px);
      margin: 16px 24px;
      padding: 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .close-button:active {
      background: #2563eb;
    }
  `;

  render() {
    const total = this.production + this.road + this.research;
    const exceeds = total > 100;

    return html`
      <div class="backdrop" @click="${this.close}"></div>
      <div class="panel">
        <div class="handle"></div>

        <div class="header">
          <div class="title">💰 Economy Settings</div>
          <div class="subtitle">Manage production and investments</div>
        </div>

        <div class="content">
          <!-- Production Slider -->
          <div class="slider-group">
            <div class="slider-header">
              <div class="slider-label">
                <span class="slider-icon">🏭</span>
                <span>Production</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div class="slider-value">${this.production}%</div>
                <button
                  class="lock-button ${this.productionLocked ? "locked" : ""}"
                  @click="${() => this.toggleLock("prod")}"
                >
                  ${this.productionLocked ? "🔒" : "🔓"}
                </button>
              </div>
            </div>
            <div class="slider-container">
              <input
                type="range"
                class="slider"
                min="0"
                max="100"
                step="1"
                .value="${this.production.toString()}"
                @input="${(e: Event) => this.handleSliderChange("prod", e)}"
              />
            </div>
          </div>

          <!-- Road Slider -->
          <div class="slider-group">
            <div class="slider-header">
              <div class="slider-label">
                <span class="slider-icon">🛣️</span>
                <span>Road Investment</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div class="slider-value">${this.road}%</div>
                <button
                  class="lock-button ${this.roadLocked ? "locked" : ""}"
                  @click="${() => this.toggleLock("road")}"
                >
                  ${this.roadLocked ? "🔒" : "🔓"}
                </button>
              </div>
            </div>
            <div class="slider-container">
              <input
                type="range"
                class="slider"
                min="0"
                max="100"
                step="1"
                .value="${this.road.toString()}"
                @input="${(e: Event) => this.handleSliderChange("road", e)}"
              />
            </div>
          </div>

          <!-- Research Slider -->
          <div class="slider-group">
            <div class="slider-header">
              <div class="slider-label">
                <span class="slider-icon">🔬</span>
                <span>Research Investment</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div class="slider-value">${this.research}%</div>
                <button
                  class="lock-button ${this.researchLocked ? "locked" : ""}"
                  @click="${() => this.toggleLock("research")}"
                >
                  ${this.researchLocked ? "🔒" : "🔓"}
                </button>
              </div>
            </div>
            <div class="slider-container">
              <input
                type="range"
                class="slider"
                min="0"
                max="100"
                step="1"
                .value="${this.research.toString()}"
                @input="${(e: Event) => this.handleSliderChange("research", e)}"
              />
            </div>
          </div>

          <!-- Constraint Warning -->
          ${exceeds
            ? html`
                <div class="constraint-warning">
                  ⚠️ Total investment (<span class="constraint-sum"
                    >${total}%</span
                  >) exceeds 100%. Unlocked sliders will be reduced
                  automatically.
                </div>
              `
            : null}

          <button class="close-button" @click="${this.close}">Done</button>
        </div>
      </div>
    `;
  }

  private handleSliderChange(slider: InvestmentSlider, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value);

    // Update local state
    switch (slider) {
      case "prod":
        this.production = value;
        break;
      case "road":
        this.road = value;
        break;
      case "research":
        this.research = value;
        break;
    }

    // Emit DOM CustomEvent (desktop compatibility)
    window.dispatchEvent(
      new CustomEvent(INVESTMENT_REQUEST_EVENT, {
        detail: {
          type: "set",
          slider,
          value,
        } as InvestmentRequestDetail,
      }),
    );
  }

  private toggleLock(slider: InvestmentSlider): void {
    // Update local state
    switch (slider) {
      case "prod":
        this.productionLocked = !this.productionLocked;
        break;
      case "road":
        this.roadLocked = !this.roadLocked;
        break;
      case "research":
        this.researchLocked = !this.researchLocked;
        break;
    }

    // Emit DOM CustomEvent (desktop compatibility)
    window.dispatchEvent(
      new CustomEvent(INVESTMENT_REQUEST_EVENT, {
        detail: {
          type: "toggle-lock",
          slider,
        } as InvestmentRequestDetail,
      }),
    );

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;

    this.dispatchEvent(
      new CustomEvent("overlay-closed", {
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

  /**
   * Update slider values from game state
   */
  updateStats(stats: EconomyStats): void {
    this.production = stats.production;
    this.road = stats.road;
    this.research = stats.research;
    this.productionLocked = stats.productionLocked;
    this.roadLocked = stats.roadLocked;
    this.researchLocked = stats.researchLocked;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-economy-overlay": MobileEconomyOverlay;
  }
}
