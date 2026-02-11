/**
 * MobileEconomyOverlay - Investment sliders for production, road, and research
 * Swipes up from bottom to adjust economic settings
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { EventBus } from "../../../core/EventBus";
import { UpgradeType } from "../../../core/game/Game";
import type { GameView } from "../../../core/game/GameView";
import {
  INVESTMENT_REQUEST_EVENT,
  INVESTMENT_SYNC_EVENT,
  type InvestmentRequestDetail,
  type InvestmentSlider,
  type InvestmentSyncDetail,
} from "../../events/InvestmentEvents";
import { SendSetTargetTroopRatioEvent } from "../../Transport";

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
  @property({ type: Boolean, reflect: true }) visible: boolean = false;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) eventBus: EventBus | null = null;
  @property({ type: Number }) production: number = 0;
  @property({ type: Number }) road: number = 0;
  @property({ type: Number }) research: number = 0;
  @property({ type: Boolean }) productionLocked: boolean = false;
  @property({ type: Boolean }) roadLocked: boolean = false;
  @property({ type: Boolean }) researchLocked: boolean = false;
  @property({ type: Number }) troopRatio: number = 0.6;
  @property({ type: Number }) attackRatio: number = 0.3;
  @property({ type: Boolean }) roadEnabled: boolean = false;

  private defaultsInitialized = false;

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
      transition: opacity 0.25s ease-out;
    }

    :host([visible]) .backdrop {
      opacity: 1;
    }

    .panel {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: min(78vw, 360px);
      max-width: 360px;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top-right-radius: 24px;
      border-bottom-right-radius: 24px;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
      padding-top: max(16px, env(safe-area-inset-top, 0));
      padding-bottom: env(safe-area-inset-bottom, 0);
      transform: translateX(-100%);
      transition: transform 0.25s ease-out;
      height: 100%;
      overflow-y: auto;
    }

    :host([visible]) .panel {
      transform: translateX(0);
    }

    .handle {
      width: 4px;
      height: 48px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      margin: 12px 16px 8px;
    }

    .header {
      padding: 8px 24px 8px;
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

    .section-title {
      color: rgba(255, 255, 255, 0.75);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin: 16px 0 8px;
    }

    .content {
      padding: 0 24px 24px;
    }

    .slider-group {
      margin-bottom: 32px;
    }

    .slider-group.disabled {
      opacity: 0.55;
    }

    .slider-group.disabled .slider {
      cursor: not-allowed;
    }

    .lock-note {
      margin-top: 8px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
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
    const troopPercent = Math.round(this.troopRatio * 100);
    const workerPercent = 100 - troopPercent;
    const attackPercent = Math.round(this.attackRatio * 100);
    const productionMax = this.productionMaxPercent();
    const roadEnabled = this.isRoadsUnlocked();

    return html`
      <div class="backdrop" @click="${this.close}"></div>
      <div class="panel">
        <div class="handle"></div>

        <div class="header">
          <div class="title">💰 Economy</div>
          <div class="subtitle">Production and investments</div>
        </div>

        <div class="content">
          <div class="section-title">Controls</div>

          <div class="slider-group">
            <div class="slider-header">
              <div class="slider-label">
                <span class="slider-icon">🪖</span>
                <span>Troop / Worker Ratio</span>
              </div>
              <div class="slider-value">${troopPercent}%</div>
            </div>
            <div class="slider-container">
              <input
                type="range"
                class="slider"
                min="0"
                max="100"
                step="1"
                .value="${troopPercent.toString()}"
                @input="${this.handleTroopRatioChange}"
              />
            </div>
            <div class="subtitle">
              ${troopPercent}% troops • ${workerPercent}% workers
            </div>
          </div>

          <div class="slider-group">
            <div class="slider-header">
              <div class="slider-label">
                <span class="slider-icon">⚔️</span>
                <span>Attack Ratio</span>
              </div>
              <div class="slider-value">${attackPercent}%</div>
            </div>
            <div class="slider-container">
              <input
                type="range"
                class="slider"
                min="1"
                max="100"
                step="1"
                .value="${attackPercent.toString()}"
                @input="${this.handleAttackRatioChange}"
              />
            </div>
          </div>

          <div class="section-title">Economy</div>

          <!-- Production Slider -->
          <div class="slider-group">
            <div class="slider-header">
              <div class="slider-label">
                <span class="slider-icon">🏭</span>
                <span>Production Investment</span>
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
                max="${productionMax}"
                step="1"
                .value="${this.production.toString()}"
                @input="${(e: Event) => this.handleSliderChange("prod", e)}"
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
                max="50"
                step="1"
                .value="${this.research.toString()}"
                @input="${(e: Event) => this.handleSliderChange("research", e)}"
              />
            </div>
          </div>

          <!-- Road Slider -->
          <div class="slider-group ${roadEnabled ? "" : "disabled"}">
            <div class="slider-header">
              <div class="slider-label">
                <span class="slider-icon">🛣️</span>
                <span>Road Investment</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div class="slider-value">${roadEnabled ? this.road : 0}%</div>
                <button
                  class="lock-button ${this.roadLocked || !roadEnabled
                    ? "locked"
                    : ""}"
                  ?disabled=${!roadEnabled}
                  @click="${() => this.toggleLock("road")}"
                >
                  ${this.roadLocked || !roadEnabled ? "🔒" : "🔓"}
                </button>
              </div>
            </div>
            <div class="slider-container">
              <input
                type="range"
                class="slider"
                min="0"
                max="50"
                step="1"
                .value="${(roadEnabled ? this.road : 0).toString()}"
                ?disabled=${!roadEnabled}
                @input="${(e: Event) => this.handleSliderChange("road", e)}"
              />
            </div>
            ${!roadEnabled
              ? html`<div class="lock-note">
                  Locked: Research Roads to unlock
                </div>`
              : null}
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
    if (slider === "road" && !this.isRoadsUnlocked()) {
      target.value = "0";
      return;
    }
    const value = parseInt(target.value, 10);
    const max = slider === "prod" ? this.productionMaxPercent() : 50;
    const clamped = Math.max(0, Math.min(max, value));

    // Update local state
    switch (slider) {
      case "prod":
        this.production = clamped;
        break;
      case "road":
        this.road = clamped;
        break;
      case "research":
        this.research = clamped;
        break;
    }

    this.persistInvestmentDefaults();

    // Emit DOM CustomEvent (desktop compatibility)
    window.dispatchEvent(
      new CustomEvent(INVESTMENT_REQUEST_EVENT, {
        detail: {
          type: "set",
          slider,
          value: clamped / 100,
        } as InvestmentRequestDetail,
      }),
    );
  }

  private toggleLock(slider: InvestmentSlider): void {
    if (slider === "road" && !this.isRoadsUnlocked()) {
      return;
    }
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
    this.ensureDefaults();
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

  resetInvestmentDefaults(): void {
    const defaultResearch =
      this.game?.config()?.defaultResearchInvestment?.() ?? 0;
    this.production = 0;
    this.road = 0;
    this.research = Math.round(defaultResearch * 100);
    this.persistInvestmentDefaults();
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(
      INVESTMENT_SYNC_EVENT,
      this.handleInvestmentSync as EventListener,
    );
    this.ensureDefaults();
  }

  disconnectedCallback(): void {
    window.removeEventListener(
      INVESTMENT_SYNC_EVENT,
      this.handleInvestmentSync as EventListener,
    );
    super.disconnectedCallback();
  }

  private handleInvestmentSync = (event: Event): void => {
    const detail = (event as CustomEvent<InvestmentSyncDetail>).detail;
    if (!detail) return;
    this.production = Math.round(detail.prod * 100);
    this.roadEnabled = detail.roadEnabled;
    this.road = Math.round((detail.roadEnabled ? detail.road : 0) * 100);
    this.research = Math.round(detail.research * 100);
    this.productionLocked = detail.lockProd;
    this.roadLocked = detail.lockRoad;
    this.researchLocked = detail.lockResearch;
  };

  private handleTroopRatioChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const ratio = Math.max(0, Math.min(1, parseInt(target.value, 10) / 100));
    this.troopRatio = ratio;
    localStorage.setItem("settings.troopRatio", ratio.toString());
    if (this.eventBus) {
      this.eventBus.emit(new SendSetTargetTroopRatioEvent(ratio));
    }
  };

  private handleAttackRatioChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    let ratio = Math.max(0.01, Math.min(1, parseInt(target.value, 10) / 100));
    if (ratio === 0.11 && this.attackRatio === 0.01) {
      ratio = 0.1;
    }
    this.attackRatio = ratio;
    localStorage.setItem("settings.attackRatio", ratio.toString());
    this.dispatchEvent(
      new CustomEvent("attack-ratio-changed", {
        detail: { ratio },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private ensureDefaults(): void {
    if (this.defaultsInitialized) return;
    this.defaultsInitialized = true;

    const storedProd = this.parseStoredRate("settings.investmentRate");
    const storedRoad = this.parseStoredRate("settings.roadInvestmentRate");
    const storedResearch = this.parseStoredRate(
      "settings.researchInvestmentRate",
    );
    const storedAttack = this.parseStoredRate("settings.attackRatio", 0.3);
    const storedTroop = this.parseStoredRate("settings.troopRatio", 0.6);

    const defaultResearch =
      this.game?.config()?.defaultResearchInvestment?.() ?? 0;
    const productionRate = storedProd ?? 0;
    const roadRate = storedRoad ?? 0;
    const researchRate = storedResearch ?? defaultResearch;

    this.production = Math.round(productionRate * 100);
    if (!this.isRoadsUnlocked()) {
      this.road = 0;
    } else {
      this.road = Math.round(roadRate * 100);
    }
    this.research = Math.round(researchRate * 100);
    this.attackRatio = storedAttack ?? 0.3;
    this.troopRatio = storedTroop ?? 0.6;

    this.persistInvestmentDefaults();
    localStorage.setItem("settings.attackRatio", this.attackRatio.toString());
    localStorage.setItem("settings.troopRatio", this.troopRatio.toString());
  }

  private persistInvestmentDefaults(): void {
    localStorage.setItem(
      "settings.investmentRate",
      (this.production / 100).toString(),
    );
    localStorage.setItem(
      "settings.roadInvestmentRate",
      ((this.isRoadsUnlocked() ? this.road : 0) / 100).toString(),
    );
    localStorage.setItem(
      "settings.researchInvestmentRate",
      (this.research / 100).toString(),
    );
  }

  private parseStoredRate(key: string, fallback?: number): number | null {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback ?? null;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback ?? null;
    return Math.max(0, Math.min(1, parsed));
  }

  private productionMaxPercent(): number {
    const maxRate = this.game?.config()?.maxInvestmentRate?.() ?? 0.5;
    return Math.round(Math.max(0, Math.min(1, maxRate)) * 100);
  }

  private isRoadsUnlocked(): boolean {
    if (this.roadEnabled) return true;
    return Boolean(this.game?.myPlayer?.()?.hasUpgrade?.(UpgradeType.Roads));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-economy-overlay": MobileEconomyOverlay;
  }
}
