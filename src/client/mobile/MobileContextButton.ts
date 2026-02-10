/**
 * Mobile context button - morphing FAB that changes based on selection
 * 6 states: build, attack, manage, diplomacy, deploy, water
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { HapticFeedback } from "./utils/HapticFeedback";

export type ButtonState =
  | "build"
  | "attack"
  | "manage"
  | "diplomacy"
  | "deploy"
  | "water"
  | "hidden";

interface ButtonConfig {
  icon: string;
  color: string;
  label: string;
}

@customElement("mobile-context-button")
export class MobileContextButton extends LitElement {
  @property({ type: String }) state: ButtonState = "build";
  @property({ type: Number }) size: number = 64; // Responsive size

  private readonly stateConfig: Record<ButtonState, ButtonConfig> = {
    build: {
      icon: "🏗️",
      color: "#10b981", // Green
      label: "Build structures",
    },
    attack: {
      icon: "⚔️",
      color: "#ef4444", // Red
      label: "Attack enemy",
    },
    manage: {
      icon: "⚙️",
      color: "#3b82f6", // Blue
      label: "Manage territory",
    },
    diplomacy: {
      icon: "🤝",
      color: "#f59e0b", // Orange
      label: "Diplomacy",
    },
    deploy: {
      icon: "✈️",
      color: "#8b5cf6", // Purple
      label: "Deploy unit",
    },
    water: {
      icon: "🌊",
      color: "#06b6d4", // Cyan
      label: "Build naval units",
    },
    hidden: {
      icon: "",
      color: "transparent",
      label: "",
    },
  };

  static styles = css`
    :host {
      position: fixed;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
      right: 16px;
      z-index: 1000;
      display: block;
    }

    .button {
      width: var(--button-size, 64px);
      height: var(--button-size, 64px);
      border-radius: 50%;
      background: var(--button-bg);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.3),
        0 2px 4px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: calc(var(--button-size, 64px) * 0.44);
      transition:
        transform 0.15s ease,
        background 0.2s ease,
        opacity 0.2s ease;
      cursor: pointer;
      border: none;
      padding: 0;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .button:active {
      transform: scale(0.9);
    }

    .button[aria-hidden="true"] {
      opacity: 0;
      pointer-events: none;
      transform: scale(0);
    }

    .icon {
      display: block;
      transition: opacity 0.1s ease;
      line-height: 1;
    }

    /* Accessibility */
    .button:focus-visible {
      outline: 3px solid white;
      outline-offset: 4px;
    }

    /* Ensure smooth color transitions */
    .button {
      will-change: background, transform;
    }
  `;

  render() {
    const config = this.stateConfig[this.state];
    const isHidden = this.state === "hidden";

    return html`
      <button
        class="button"
        style="--button-size: ${this.size}px; --button-bg: ${config.color}"
        aria-label="${config.label}"
        aria-hidden="${isHidden}"
        @click="${this.handleClick}"
      >
        <span class="icon">${config.icon}</span>
      </button>
    `;
  }

  private handleClick(): void {
    if (this.state === "hidden") return;

    // Haptic feedback for button tap
    HapticFeedback.tap();

    this.dispatchEvent(
      new CustomEvent("button-click", {
        detail: { state: this.state },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Update button state based on tile selection
   */
  updateState(newState: ButtonState): void {
    if (this.state === newState) return;
    this.state = newState;
  }

  /**
   * Hide the button
   */
  hide(): void {
    this.state = "hidden";
  }

  /**
   * Show the button with a specific state
   */
  show(state: ButtonState): void {
    this.state = state;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-context-button": MobileContextButton;
  }
}
