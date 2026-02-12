/**
 * MobileAllianceNotifications - Prominent notification bubbles for alliance requests
 * Displays under the top bar with Accept/Reject actions
 */

import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { EventBus } from "../../../core/EventBus";
import {
  AllianceRequestUpdate,
  GameUpdateType,
} from "../../../core/game/GameUpdates";
import type { GameView } from "../../../core/game/GameView";
import { PlayerView } from "../../../core/game/GameView";
import {
  SendAllianceExtensionIntentEvent,
  SendAllianceReplyIntentEvent,
} from "../../Transport";
import { HapticFeedback } from "../utils/HapticFeedback";

interface AllianceRequest {
  requestorID: number;
  recipientID: number;
  createdAt: number;
  requestorName: string;
}

interface AllianceExtensionWarning {
  allyID: number;
  allyName: string;
  allianceCreatedAt: number;
  tag: string; // Unique identifier
}

@customElement("mobile-alliance-notifications")
export class MobileAllianceNotifications extends LitElement {
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) eventBus: EventBus | null = null;

  @state() private requests: AllianceRequest[] = [];
  @state() private extensionWarnings: AllianceExtensionWarning[] = [];

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 60px);
      left: 50%;
      transform: translateX(-50%);
      width: min(85vw, 280px);
      z-index: 1500;
      pointer-events: none;
    }

    .notification {
      background: linear-gradient(
        135deg,
        rgba(74, 222, 128, 0.95) 0%,
        rgba(34, 197, 94, 0.95) 100%
      );
      border: 1.5px solid rgba(74, 222, 128, 0.8);
      border-radius: 8px;
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.3),
        0 0 12px rgba(74, 222, 128, 0.25);
      pointer-events: all;
      animation: slideDown 0.3s ease-out;
    }

    .notification.warning {
      background: linear-gradient(
        135deg,
        rgba(251, 191, 36, 0.95) 0%,
        rgba(245, 158, 11, 0.95) 100%
      );
      border: 1.5px solid rgba(251, 191, 36, 0.8);
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.3),
        0 0 12px rgba(251, 191, 36, 0.25);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .notification-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .notification-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .notification-title {
      flex: 1;
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .notification-close {
      background: rgba(0, 0, 0, 0.2);
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      flex-shrink: 0;
    }

    .notification-close:active {
      background: rgba(0, 0, 0, 0.4);
    }

    .notification-message {
      color: rgba(255, 255, 255, 0.95);
      font-size: 0.7rem;
      margin-bottom: 0.4rem;
      line-height: 1.3;
    }

    .notification-actions {
      display: flex;
      gap: 0.35rem;
    }

    .action-btn {
      flex: 1;
      padding: 0.4rem 0.5rem;
      border: none;
      border-radius: 5px;
      font-size: 0.65rem;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .action-btn:active {
      transform: scale(0.96);
    }

    .action-accept {
      background: white;
      color: #16a34a;
    }

    .action-accept:active {
      background: rgba(255, 255, 255, 0.9);
    }

    .action-reject {
      background: rgba(0, 0, 0, 0.3);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .action-reject:active {
      background: rgba(0, 0, 0, 0.5);
    }

    .action-renew {
      background: white;
      color: #d97706;
    }

    .action-renew:active {
      background: rgba(255, 255, 255, 0.9);
    }
  `;

  tick() {
    if (!this.game) return;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer || !myPlayer.isAlive()) {
      this.requests = [];
      this.extensionWarnings = [];
      return;
    }

    const updates = this.game.updatesSinceLastTick();
    if (updates && updates[GameUpdateType.AllianceRequest]) {
      updates[GameUpdateType.AllianceRequest].forEach(
        (update: AllianceRequestUpdate) => {
          // Only show if we're the recipient
          if (update.recipientID !== myPlayer.smallID()) return;

          const requestor = this.game!.playerBySmallID(update.requestorID);
          if (!requestor || !(requestor instanceof PlayerView)) return;

          // Check if already in list
          const exists = this.requests.some(
            (r) =>
              r.requestorID === update.requestorID &&
              r.recipientID === update.recipientID,
          );

          if (!exists) {
            this.requests = [
              ...this.requests,
              {
                requestorID: update.requestorID,
                recipientID: update.recipientID,
                createdAt: update.createdAt,
                requestorName: requestor.name(),
              },
            ];
          }
        },
      );
    }

    // Remove old requests (older than 5 minutes)
    const currentTick = this.game.ticks();
    this.requests = this.requests.filter(
      (r) => currentTick - r.createdAt < 300,
    );

    // ---- Alliance Extension Warnings ----
    const alliances = this.game.alliances();
    const duration = this.game.config().allianceDuration();
    const promptOffset = this.game.config().allianceExtensionPromptOffset();

    const newWarnings: AllianceExtensionWarning[] = [];

    for (const alliance of alliances) {
      const timeSinceCreation = currentTick - alliance.createdAt;
      const ticksLeft = duration - timeSinceCreation;

      // Show warning when close to expiry (within promptOffset ticks)
      if (ticksLeft >= promptOffset || ticksLeft <= 0) continue;

      // Only for alliances involving the local player
      if (
        alliance.requestorID !== myPlayer.smallID() &&
        alliance.recipientID !== myPlayer.smallID()
      ) {
        continue;
      }

      const otherID =
        alliance.requestorID === myPlayer.smallID()
          ? alliance.recipientID
          : alliance.requestorID;

      const other = this.game.playerBySmallID(otherID);
      if (
        !other ||
        !(other instanceof PlayerView) ||
        !myPlayer.isAlive() ||
        !other.isAlive()
      )
        continue;

      const tag = `about_to_expire_${alliance.requestorID}_${alliance.recipientID}_${alliance.createdAt}`;

      newWarnings.push({
        allyID: otherID,
        allyName: other.name(),
        allianceCreatedAt: alliance.createdAt,
        tag,
      });
    }

    this.extensionWarnings = newWarnings;
  }

  private handleAccept(request: AllianceRequest) {
    if (!this.game || !this.eventBus) return;

    const myPlayer = this.game.myPlayer();
    const requestor = this.game.playerBySmallID(request.requestorID);
    if (!myPlayer || !requestor || !(requestor instanceof PlayerView)) return;

    this.eventBus.emit(
      new SendAllianceReplyIntentEvent(requestor, myPlayer, true),
    );

    HapticFeedback.success();
    this.removeRequest(request);
  }

  private handleReject(request: AllianceRequest) {
    if (!this.game || !this.eventBus) return;

    const myPlayer = this.game.myPlayer();
    const requestor = this.game.playerBySmallID(request.requestorID);
    if (!myPlayer || !requestor || !(requestor instanceof PlayerView)) return;

    this.eventBus.emit(
      new SendAllianceReplyIntentEvent(requestor, myPlayer, false),
    );

    HapticFeedback.tap();
    this.removeRequest(request);
  }

  private handleDismiss(request: AllianceRequest) {
    HapticFeedback.tap();
    this.removeRequest(request);
  }

  private handleRenew(warning: AllianceExtensionWarning) {
    if (!this.game || !this.eventBus) return;

    const ally = this.game.playerBySmallID(warning.allyID);
    if (!ally || !(ally instanceof PlayerView)) return;

    this.eventBus.emit(new SendAllianceExtensionIntentEvent(ally));

    HapticFeedback.success();
    this.removeExtensionWarning(warning);
  }

  private handleDismissExtension(warning: AllianceExtensionWarning) {
    HapticFeedback.tap();
    this.removeExtensionWarning(warning);
  }

  private removeRequest(request: AllianceRequest) {
    this.requests = this.requests.filter(
      (r) =>
        !(
          r.requestorID === request.requestorID &&
          r.recipientID === request.recipientID &&
          r.createdAt === request.createdAt
        ),
    );
  }

  private removeExtensionWarning(warning: AllianceExtensionWarning) {
    this.extensionWarnings = this.extensionWarnings.filter(
      (w) => w.tag !== warning.tag,
    );
  }

  render() {
    if (this.requests.length === 0 && this.extensionWarnings.length === 0)
      return null;

    return html`
      ${this.extensionWarnings.map(
        (warning) => html`
          <div class="notification warning">
            <div class="notification-header">
              <div class="notification-icon">⏰</div>
              <div class="notification-title">Alliance Expiring Soon</div>
              <button
                class="notification-close"
                @click="${() => this.handleDismissExtension(warning)}"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            <div class="notification-message">
              Alliance with ${warning.allyName} is about to expire!
            </div>
            <div class="notification-actions">
              <button
                class="action-btn action-renew"
                @click="${() => this.handleRenew(warning)}"
              >
                Renew
              </button>
              <button
                class="action-btn action-reject"
                @click="${() => this.handleDismissExtension(warning)}"
              >
                Dismiss
              </button>
            </div>
          </div>
        `,
      )}
      ${this.requests.map(
        (request) => html`
          <div class="notification">
            <div class="notification-header">
              <div class="notification-icon">🤝</div>
              <div class="notification-title">Alliance Request</div>
              <button
                class="notification-close"
                @click="${() => this.handleDismiss(request)}"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
            <div class="notification-message">
              ${request.requestorName} wants to form an alliance
            </div>
            <div class="notification-actions">
              <button
                class="action-btn action-accept"
                @click="${() => this.handleAccept(request)}"
              >
                Accept
              </button>
              <button
                class="action-btn action-reject"
                @click="${() => this.handleReject(request)}"
              >
                Reject
              </button>
            </div>
          </div>
        `,
      )}
    `;
  }
}
