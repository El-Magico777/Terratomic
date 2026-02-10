/**
 * MobilePlacementMode - Visual overlay for building placement
 * Shows valid/invalid tiles, structure icon following finger, and cancel button
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { UnitType } from "../../../core/game/Game";

@customElement("mobile-placement-mode")
export class MobilePlacementMode extends LitElement {
  @property({ type: Boolean, reflect: true }) active: boolean = false;
  @property({ type: String }) unitType: UnitType | null = null;
  @property({ type: Number }) cost: number = 0;
  @property({ type: String }) unitIcon: string = "";
  @property({ type: Object }) fingerPosition: { x: number; y: number } | null =
    null;

  static styles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1500;
      pointer-events: none;
    }

    :host([active]) {
      display: block;
      pointer-events: all;
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    .header {
      position: absolute;
      top: calc(env(safe-area-inset-top, 0) + 8px);
      left: 0;
      right: 0;
      height: 48px;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      color: white;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
    }

    .cancel-button {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      -webkit-tap-highlight-color: transparent;
    }

    .cancel-button:active {
      background: rgba(239, 68, 68, 0.3);
    }

    .build-info {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      font-weight: 500;
    }

    .build-icon {
      font-size: 24px;
    }

    .build-cost {
      color: #fbbf24;
      font-variant-numeric: tabular-nums;
    }

    .floating-icon {
      position: absolute;
      width: 64px;
      height: 64px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      pointer-events: none;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition:
        left 0.05s ease,
        top 0.05s ease;
    }

    .floating-icon.visible {
      opacity: 1;
    }

    .icon {
      font-size: 32px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    }

    .cost-badge {
      background: rgba(0, 0, 0, 0.8);
      color: #fbbf24;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .instructions {
      position: absolute;
      bottom: calc(env(safe-area-inset-bottom, 0) + 80px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      text-align: center;
      pointer-events: none;
      white-space: nowrap;
    }
  `;

  render() {
    return html`
      <div class="overlay">
        <div class="header">
          <button class="cancel-button" @click="${this.handleCancel}">
            ✕ <span>Cancel</span>
          </button>
          <div class="build-info">
            <span class="build-icon">${this.unitIcon}</span>
            <span>Building ${this.getUnitName()}</span>
            <span class="build-cost">$${this.cost}</span>
          </div>
        </div>

        ${this.fingerPosition
          ? html`
              <div
                class="floating-icon visible"
                style="left: ${this.fingerPosition.x}px; top: ${this
                  .fingerPosition.y}px"
              >
                <div class="icon">${this.unitIcon}</div>
                <div class="cost-badge">$${this.cost}</div>
              </div>
            `
          : null}

        <div class="instructions">Tap valid tile to build</div>
      </div>
    `;
  }

  /**
   * Enter placement mode for a specific unit type
   */
  enter(unitType: UnitType, cost: number, icon: string): void {
    this.active = true;
    this.unitType = unitType;
    this.cost = cost;
    this.unitIcon = icon;
    this.fingerPosition = null;
  }

  /**
   * Exit placement mode
   */
  exit(): void {
    this.active = false;
    this.unitType = null;
    this.fingerPosition = null;

    this.dispatchEvent(
      new CustomEvent("placement-cancelled", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Update finger position to show floating icon
   */
  updateFingerPosition(x: number, y: number): void {
    this.fingerPosition = { x, y };
  }

  private handleCancel(): void {
    this.exit();

    // Light haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  private getUnitName(): string {
    if (!this.unitType) return "";

    // Convert enum value to display name
    const nameMap: Record<string, string> = {
      [UnitType.City]: "City",
      [UnitType.Hospital]: "Hospital",
      [UnitType.Factory]: "Factory",
      [UnitType.DefensePost]: "Defense Post",
      [UnitType.MissileSilo]: "Missile Silo",
      [UnitType.Airfield]: "Airfield",
      [UnitType.ResearchLab]: "Research Lab",
      [UnitType.Academy]: "Academy",
      [UnitType.SAMLauncher]: "SAM Launcher",
      [UnitType.DoomsdayDevice]: "Doomsday Device",
      [UnitType.Port]: "Port",
      [UnitType.Warship]: "Warship",
      [UnitType.Submarine]: "Submarine",
      [UnitType.FighterJet]: "Fighter Jet",
      [UnitType.AtomBomb]: "Atom Bomb",
      [UnitType.HydrogenBomb]: "H-Bomb",
      [UnitType.MIRV]: "MIRV",
    };

    return nameMap[this.unitType] || this.unitType;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-placement-mode": MobilePlacementMode;
  }
}
