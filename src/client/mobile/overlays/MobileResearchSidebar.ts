/**
 * MobileResearchSidebar - Research tech tree sidebar for mobile
 * Uses native mobile research panel designed for touch
 * Part of Phase 5: Research & Progression System
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { EventBus } from "../../../core/EventBus";
import type { GameView } from "../../../core/game/GameView";
import "../components/MobileResearchPanel";
import { HapticFeedback } from "../utils/HapticFeedback";

@customElement("mobile-research-sidebar")
export class MobileResearchSidebar extends LitElement {
  @property({ type: Boolean, reflect: true }) visible: boolean = false;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) eventBus: EventBus | null = null;

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
      right: 0;
      bottom: 0;
      width: 70%;
      max-width: 400px;
      background: rgba(20, 20, 30, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
      transform: translateX(100%);
      transition: transform 0.25s ease-out;
      display: flex;
      flex-direction: column;
      overflow: hidden;
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
      flex-shrink: 0;
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

    .content {
      flex: 1;
      overflow: hidden;
      position: relative;
      min-height: 0;
      display: flex;
      touch-action: pan-y;
    }

    /* Mobile research panel fills the content area */
    mobile-research-panel {
      flex: 1;
      min-height: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  render() {
    if (!this.visible) return null;

    return html`
      <div class="backdrop" @click="${this.handleBackdropClick}"></div>
      <div class="sidebar">
        <div class="header">
          <div class="title">🔬 Research</div>
          <button class="close-btn" @click="${this.close}">✕</button>
        </div>
        <div class="content">
          <mobile-research-panel
            .game="${this.game}"
            .eventBus="${this.eventBus}"
          ></mobile-research-panel>
        </div>
      </div>
    `;
  }

  private handleBackdropClick(): void {
    this.close();
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
    "mobile-research-sidebar": MobileResearchSidebar;
  }
}
