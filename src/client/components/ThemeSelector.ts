import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { UserSettings } from "../../core/game/UserSettings";
import { AllianceThemes, ThemeId } from "../../core/theme/AllianceThemes";
import { translateText } from "../Utils";

@customElement("theme-selector")
export class ThemeSelector extends LitElement {
  @state()
  private selectedTheme: ThemeId = "neutral";

  @state()
  private locked: boolean = false;

  static styles = css`
    :host {
      display: block;
    }

    .options-section {
      margin-bottom: 1.4rem;
      padding: 1.2rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
    }

    .option-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--ui-text-light);
      text-align: center;
      margin-bottom: 0.8rem;
    }

    .option-cards {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      gap: 16px;
    }

    .option-card {
      width: 100%;
      min-width: 100px;
      max-width: 120px;
      padding: 4px 4px 0 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      background: rgba(24, 49, 82, 0.95);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }

    .option-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(20, 20, 40, 0.95);
    }

    .option-card.selected {
      border-color: var(--ui-primary);
      background: rgba(14, 26, 51, 0.35);
      box-shadow:
        0 0 0 2px rgba(39, 71, 110, 0.5),
        0 0 12px rgba(39, 71, 110, 0.35);
    }

    .option-card-title {
      font-size: 14px;
      color: var(--ui-text-muted);
      text-align: center;
      margin: 0 0 4px 0;
    }

    .locked-indicator {
      margin-top: 8px;
      font-size: 12px;
      color: #ffa500;
      font-style: italic;
      text-align: center;
    }

    .checkbox-icon {
      width: 16px;
      height: 16px;
      border: 2px solid var(--ui-border-muted);
      border-radius: 6px;
      margin: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease-in-out;
    }

    .option-card.selected .checkbox-icon {
      border-color: var(--ui-primary);
      background: var(--ui-primary);
    }

    .option-card.selected .checkbox-icon::after {
      content: "✓";
      color: var(--ui-button-text);
      font-size: 12px;
      font-weight: bold;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Get initial theme from UserSettings if available
    const userSettings = new UserSettings();
    if (userSettings.enableAllianceThemes()) {
      this.selectedTheme = userSettings.themeId() as ThemeId;
      this.locked = userSettings.isThemeLocked();
    } else {
      // Set default to first theme
      this.selectedTheme = AllianceThemes[0].id;
    }
  }

  private handleThemeSelect(themeId: ThemeId) {
    if (this.locked) return;
    this.selectedTheme = themeId;
    const userSettings = new UserSettings();
    userSettings.setThemeId(themeId);
    this.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: { themeId },
        bubbles: true,
        composed: true,
      }),
    );
    this.requestUpdate();
  }

  render() {
    const userSettings = new UserSettings();
    if (!userSettings.enableAllianceThemes()) {
      return html``;
    }

    return html`
      <div class="options-section">
        <div class="option-title">${translateText("theme_selector.title")}</div>
        <div class="option-cards">
          ${AllianceThemes.map(
            (theme) => html`
              <div
                class="option-card ${this.selectedTheme === theme.id
                  ? "selected"
                  : ""} ${this.locked ? "disabled" : ""}"
                @click=${() => this.handleThemeSelect(theme.id)}
              >
                <div class="checkbox-icon"></div>
                <div class="option-card-title">
                  ${translateText(theme.displayNameKey)}
                </div>
              </div>
            `,
          )}
        </div>
        ${this.locked
          ? html`<div class="locked-indicator">
              ${translateText("theme_selector.locked")}
            </div>`
          : html``}
      </div>
    `;
  }
}
