/**
 * MobileSettingsPanel - Native mobile settings panel
 * Focused on core in-game toggles and replay actions
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import type { GameView } from "../../../core/game/GameView";
import { UserSettings } from "../../../core/game/UserSettings";
import { RefreshGraphicsEvent } from "../../InputHandler";
import { SaveReplayRequestEvent } from "../../Transport";
import { translateText } from "../../Utils";
import { HapticFeedback } from "../utils/HapticFeedback";

@customElement("mobile-settings-panel")
export class MobileSettingsPanel extends LitElement {
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) eventBus: EventBus | null = null;

  private userSettings = new UserSettings();

  static styles = css`
    :host {
      display: block;
      height: 100%;
      color: #e5e7eb;
      font-family: "Oswald", "Trebuchet MS", sans-serif;
      background:
        radial-gradient(120% 120% at 0% 0%, #1f2a44 0%, #111827 60%),
        linear-gradient(180deg, #0f172a 0%, #0b1220 100%);
    }

    .panel {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .section {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .section-title {
      font-size: 12px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 10px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.15);
      margin-bottom: 10px;
    }

    .setting-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .setting-icon {
      font-size: 18px;
    }

    .setting-label {
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
    }

    .toggle {
      width: 54px;
      height: 30px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.25);
      border: 1px solid rgba(148, 163, 184, 0.3);
      position: relative;
      cursor: pointer;
      transition:
        background 0.2s ease,
        border-color 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .toggle.on {
      background: rgba(56, 189, 248, 0.25);
      border-color: rgba(56, 189, 248, 0.6);
    }

    .toggle-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: #e2e8f0;
      transition:
        transform 0.2s ease,
        background 0.2s ease;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    }

    .toggle.on .toggle-thumb {
      transform: translateX(24px);
      background: #38bdf8;
    }

    .actions {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .action-button {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid rgba(59, 130, 246, 0.5);
      background: linear-gradient(
        135deg,
        rgba(37, 99, 235, 0.6),
        rgba(59, 130, 246, 0.8)
      );
      color: #f8fafc;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition:
        transform 0.15s ease,
        box-shadow 0.2s ease;
    }

    .action-button:active {
      transform: scale(0.98);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4) inset;
    }

    .action-button.danger {
      border-color: rgba(248, 113, 113, 0.6);
      background: linear-gradient(
        135deg,
        rgba(220, 38, 38, 0.7),
        rgba(248, 113, 113, 0.85)
      );
    }

    .muted-note {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      padding: 0 16px 12px;
    }
  `;

  private handleToggleDarkMode(): void {
    this.userSettings.toggleDarkMode();
    if (this.eventBus) {
      this.eventBus.emit(new RefreshGraphicsEvent());
    }
    this.requestUpdate();
    HapticFeedback.tap();
  }

  private handleToggleTutorials(): void {
    this.userSettings.toggleTutorialEnabled();
    this.requestUpdate();
    HapticFeedback.tap();
  }

  private handleToggleLobbyNotifications(): void {
    this.userSettings.toggleLobbyNotifications();
    this.requestUpdate();
    HapticFeedback.tap();
  }

  private handleToggleRandomName(): void {
    this.userSettings.toggleRandomName();
    this.requestUpdate();
    HapticFeedback.tap();
  }

  private handleSaveReplay(): void {
    if (!this.eventBus) return;
    this.eventBus.emit(new SaveReplayRequestEvent());
    HapticFeedback.success();
  }

  private handleExitGame(): void {
    const isAlive = this.game?.myPlayer()?.isAlive();
    if (isAlive) {
      const isConfirmed = confirm(
        translateText("help_modal.exit_confirmation"),
      );
      if (!isConfirmed) return;
    }
    window.location.href = "/";
  }

  private renderToggle(
    label: string,
    icon: string,
    enabled: boolean,
    onToggle: () => void,
  ) {
    return html`
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-icon">${icon}</div>
          <div class="setting-label">${label}</div>
        </div>
        <button
          class="toggle ${enabled ? "on" : ""}"
          aria-pressed="${enabled}"
          @click="${onToggle}"
        >
          <span class="toggle-thumb"></span>
        </button>
      </div>
    `;
  }

  render() {
    const isReplay = this.game?.config().isReplay() ?? false;

    return html`
      <div class="panel">
        <div class="section">
          <div class="section-title">Preferences</div>
          ${this.renderToggle(
            "Dark Mode",
            "🌙",
            this.userSettings.darkMode(),
            () => this.handleToggleDarkMode(),
          )}
          ${this.renderToggle(
            "Tutorial Tips",
            "💡",
            this.userSettings.tutorialEnabled(),
            () => this.handleToggleTutorials(),
          )}
          ${this.renderToggle(
            "Lobby Notifications",
            "🔔",
            this.userSettings.lobbyNotificationsEnabled(),
            () => this.handleToggleLobbyNotifications(),
          )}
          ${this.renderToggle(
            "Random Name Mode",
            "🥷",
            this.userSettings.anonymousNames(),
            () => this.handleToggleRandomName(),
          )}
        </div>

        <div class="actions">
          ${!isReplay
            ? html`
                <button class="action-button" @click="${this.handleSaveReplay}">
                  💾 Save Replay
                </button>
              `
            : ""}
          <button class="action-button danger" @click="${this.handleExitGame}">
            🚪 Exit Game
          </button>
        </div>
        ${isReplay
          ? html`<div class="muted-note">Replay mode: saving is disabled.</div>`
          : ""}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-settings-panel": MobileSettingsPanel;
  }
}
