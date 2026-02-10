/**
 * MobileAttackRatioSlider - Inline slider for adjusting attack ratio
 * Triggered by long-press on ⚔️ context button
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("mobile-attack-ratio-slider")
export class MobileAttackRatioSlider extends LitElement {
  @property({ type: Boolean }) visible: boolean = false;
  @property({ type: Number }) ratio: number = 0.3; // Default 30%
  @property({ type: Number }) totalTroops: number = 0;

  static styles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1900;
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
      transition: opacity 0.2s ease;
    }

    :host([visible]) .backdrop {
      opacity: 1;
    }

    .panel {
      position: absolute;
      bottom: calc(env(safe-area-inset-bottom, 0) + 80px);
      left: 16px;
      right: 16px;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      padding: 20px;
      transform: translateY(20px);
      opacity: 0;
      transition:
        transform 0.25s ease,
        opacity 0.25s ease;
    }

    :host([visible]) .panel {
      transform: translateY(0);
      opacity: 1;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .title {
      color: white;
      font-size: 16px;
      font-weight: 600;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
    }

    .close-button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }

    .close-button:active {
      color: white;
    }

    .ratio-display {
      color: #ef4444;
      font-size: 32px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 8px;
      font-variant-numeric: tabular-nums;
    }

    .troops-info {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
      margin-bottom: 20px;
      font-variant-numeric: tabular-nums;
    }

    .troops-total {
      color: white;
    }

    .slider-container {
      position: relative;
      height: 48px;
      display: flex;
      align-items: center;
      margin-bottom: 16px;
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
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.15s ease;
    }

    .slider::-webkit-slider-thumb:active {
      transform: scale(1.2);
    }

    .slider::-moz-range-thumb {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .description {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
    }
  `;

  render() {
    const attackTroops = Math.floor(this.totalTroops * this.ratio);
    const ratioPercent = Math.round(this.ratio * 100);

    return html`
      <div class="backdrop" @click="${this.close}"></div>
      <div class="panel">
        <div class="header">
          <div class="title">⚔️ Attack Ratio</div>
          <button class="close-button" @click="${this.close}">✕</button>
        </div>

        <div class="ratio-display">${ratioPercent}%</div>
        <div class="troops-info">
          ${attackTroops.toLocaleString()} /
          <span class="troops-total"
            >${this.totalTroops.toLocaleString()} troops</span
          >
        </div>

        <div class="slider-container">
          <input
            type="range"
            class="slider"
            min="0"
            max="100"
            step="1"
            .value="${ratioPercent.toString()}"
            @input="${this.handleSliderChange}"
          />
        </div>

        <div class="description">
          Adjust how many troops participate in attacks
        </div>
      </div>
    `;
  }

  private handleSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value);
    this.ratio = value / 100;

    // Emit event for parent to update UIState
    this.dispatchEvent(
      new CustomEvent("ratio-changed", {
        detail: { ratio: this.ratio },
        bubbles: true,
        composed: true,
      }),
    );
  }

  open(totalTroops: number, currentRatio: number): void {
    this.totalTroops = totalTroops;
    this.ratio = currentRatio;
    this.visible = true;
  }

  close(): void {
    this.visible = false;

    this.dispatchEvent(
      new CustomEvent("slider-closed", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  toggle(totalTroops: number, currentRatio: number): void {
    if (this.visible) {
      this.close();
    } else {
      this.open(totalTroops, currentRatio);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-attack-ratio-slider": MobileAttackRatioSlider;
  }
}
