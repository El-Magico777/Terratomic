/**
 * MobileResearchSidebar - Research tech tree sidebar for mobile
 * Wraps the existing ResearchTreeModal in a slide-from-right container
 * Part of Phase 5: Research & Progression System
 */

import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import type { EventBus } from "../../../core/EventBus";
import type { GameView } from "../../../core/game/GameView";
import type { ResearchTreeModal } from "../../ResearchTreeModal";
import { HapticFeedback } from "../utils/HapticFeedback";
import "../utils/SkeletonLoader";

@customElement("mobile-research-sidebar")
export class MobileResearchSidebar extends LitElement {
  @property({ type: Boolean }) visible: boolean = false;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) eventBus: EventBus | null = null;

  @query("research-tree-modal") private researchModal!: ResearchTreeModal;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 3000;
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
    }

    /* Make research modal fill the sidebar */
    research-tree-modal {
      width: 100%;
      height: 100%;
    }

    /* Override modal styles for sidebar embedding */
    research-tree-modal::part(modal) {
      position: static;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      border-radius: 0;
      box-shadow: none;
    }

    research-tree-modal::part(backdrop) {
      display: none;
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
        <div class="content">${this.renderResearchModal()}</div>
      </div>
    `;
  }

  private renderResearchModal() {
    if (!this.game || !this.eventBus) {
      return html`
        <div style="padding: 16px;">
          <skeleton-loader type="grid" count="8"></skeleton-loader>
        </div>
      `;
    }

    return html`
      <research-tree-modal
        .visible="${this.visible}"
        .game="${this.game}"
        .eventBus="${this.eventBus}"
      ></research-tree-modal>
    `;
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // When sidebar opens, open the modal
    if (changedProperties.has("visible")) {
      if (this.visible && this.researchModal) {
        // Give the DOM a chance to render first
        setTimeout(() => {
          this.researchModal?.open?.();
        }, 50);
      } else if (!this.visible && this.researchModal) {
        this.researchModal?.close?.();
      }
    }
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
