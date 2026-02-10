/**
 * MobileBasePopup - Base class for all mobile popups
 * Provides common popup functionality: positioning, backdrop, animations
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface PopupMenuItem {
  icon: string;
  label: string;
  cost?: number;
  action: string;
  locked?: boolean;
  lockedReason?: string;
  disabled?: boolean;
  disabledReason?: string;
}

@customElement("mobile-base-popup")
export class MobileBasePopup extends LitElement {
  @property({ type: String }) title: string = "";
  @property({ type: Boolean }) visible: boolean = false;
  @property({ type: Array }) items: PopupMenuItem[] = [];
  @property({ type: Object }) position: { x: number; y: number } | null = null;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2000;
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
      transition: opacity 0.2s ease;
    }

    :host([visible]) .backdrop {
      opacity: 1;
    }

    .popup {
      position: absolute;
      background: rgba(20, 20, 30, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 12px;
      box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.4),
        0 4px 8px rgba(0, 0, 0, 0.2);
      min-width: 240px;
      max-width: 320px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      transform: scale(0.8) translateY(20px);
      opacity: 0;
      transition:
        transform 0.2s ease,
        opacity 0.2s ease;
    }

    :host([visible]) .popup {
      transform: scale(1) translateY(0);
      opacity: 1;
    }

    .header {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      font-weight: 600;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .menu {
      padding: 8px 0;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: white;
      font-size: 15px;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      min-height: 72px;
      -webkit-tap-highlight-color: transparent;
    }

    .menu-item:last-child {
      border-bottom: none;
    }

    .menu-item:active {
      background: rgba(255, 255, 255, 0.1);
    }

    .menu-item.locked {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .menu-item.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .menu-item.locked:active,
    .menu-item.disabled:active {
      background: transparent;
    }

    .menu-icon {
      font-size: 24px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .menu-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .menu-label {
      font-weight: 500;
    }

    .menu-sublabel {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }

    .menu-cost {
      color: #fbbf24;
      font-weight: 600;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }

    .menu-cost.insufficient {
      color: #ef4444;
    }

    .lock-icon {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 14px;
      color: #ef4444;
    }

    /* Scrollbar styling */
    .popup::-webkit-scrollbar {
      width: 8px;
    }

    .popup::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    .popup::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .popup::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `;

  render() {
    if (!this.visible) return null;

    return html`
      <div class="backdrop" @click="${this.handleBackdropClick}"></div>
      <div class="popup" style="${this.getPopupStyle()}">
        ${this.title ? html`<div class="header">${this.title}</div>` : null}
        <div class="menu">
          ${this.items.map((item) => this.renderMenuItem(item))}
        </div>
      </div>
    `;
  }

  protected renderMenuItem(item: PopupMenuItem) {
    const classes = [
      "menu-item",
      item.locked ? "locked" : "",
      item.disabled ? "disabled" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <button
        class="${classes}"
        @click="${() => this.handleItemClick(item)}"
        ?disabled="${item.locked ?? item.disabled}"
      >
        <div class="menu-icon">${item.icon}</div>
        <div class="menu-content">
          <div class="menu-label">${item.label}</div>
          ${(item.lockedReason ?? item.disabledReason)
            ? html`<div class="menu-sublabel">
                ${item.lockedReason ?? item.disabledReason}
              </div>`
            : null}
        </div>
        ${item.cost !== undefined
          ? html`<div class="menu-cost ${item.disabled ? "insufficient" : ""}">
              $${this.formatCost(item.cost)}
            </div>`
          : null}
        ${item.locked ? html`<div class="lock-icon">🔒</div>` : null}
      </button>
    `;
  }

  protected formatCost(cost: number): string {
    if (cost >= 1000) {
      return `${(cost / 1000).toFixed(1)}k`;
    }
    return cost.toString();
  }

  protected getPopupStyle(): string {
    if (!this.position) {
      // Center on screen if no position provided
      return "top: 50%; left: 50%; transform: translate(-50%, -50%);";
    }

    // Position near the provided coordinates
    const { x, y } = this.position;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Simple positioning logic - position above or below based on screen space
    const positionAbove = y > screenHeight / 2;
    const positionLeft = x > screenWidth / 2;

    const styles: string[] = [];

    if (positionAbove) {
      styles.push(`bottom: ${screenHeight - y + 16}px`);
    } else {
      styles.push(`top: ${y + 16}px`);
    }

    if (positionLeft) {
      styles.push(`right: ${screenWidth - x}px`);
    } else {
      styles.push(`left: ${x}px`);
    }

    return styles.join("; ");
  }

  protected handleBackdropClick(): void {
    this.close();
  }

  protected handleItemClick(item: PopupMenuItem): void {
    if (item.locked || item.disabled) return;

    this.dispatchEvent(
      new CustomEvent("item-selected", {
        detail: { action: item.action, item },
        bubbles: true,
        composed: true,
      }),
    );

    // Light haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  open(position?: { x: number; y: number }): void {
    if (position) {
      this.position = position;
    }
    this.visible = true;
  }

  close(): void {
    this.visible = false;
    this.dispatchEvent(
      new CustomEvent("popup-closed", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  toggle(position?: { x: number; y: number }): void {
    if (this.visible) {
      this.close();
    } else {
      this.open(position);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-base-popup": MobileBasePopup;
  }
}
