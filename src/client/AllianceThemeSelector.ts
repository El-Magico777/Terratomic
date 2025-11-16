import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { UserSettings } from "../core/game/UserSettings";
import { AllianceThemes, ThemeId } from "../core/theme/AllianceThemes";
import { translateText } from "./Utils";

@customElement("alliance-theme-selector")
export class AllianceThemeSelector extends LitElement {
  @state()
  private selectedTheme: ThemeId = "neutral";

  @state()
  private isOpen: boolean = false;

  private userSettings = new UserSettings();
  private dropdownPortal: HTMLElement | null = null;

  private themeFlags: Record<ThemeId, string> = {
    neutral: "un",
    nato: "NATO",
    russia: "ru",
    china: "cn",
  };

  static styles = css`
    :host {
      display: inline-block;
    }

    .theme-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(24, 49, 82, 0.95);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: var(--ui-text-light);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      min-width: 100px;
      white-space: nowrap;
    }

    .theme-button:hover {
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(20, 20, 40, 0.95);
    }

    .theme-button:focus {
      outline: none;
      border-color: var(--ui-primary);
      box-shadow: 0 0 8px rgba(39, 71, 110, 0.3);
    }

    .flag-icon {
      width: 28px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .flag-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 2px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    if (this.userSettings.enableAllianceThemes()) {
      this.selectedTheme = this.userSettings.themeId() as ThemeId;
    }
    document.addEventListener("click", this.handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleDocumentClick);
    if (this.dropdownPortal) {
      this.dropdownPortal.remove();
    }
  }

  private handleDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (
      !this.contains(target) &&
      this.dropdownPortal &&
      !this.dropdownPortal.contains(target)
    ) {
      this.closeDropdown();
    }
  };

  createRenderRoot() {
    return this;
  }

  private handleThemeChange(themeId: ThemeId) {
    this.selectedTheme = themeId;
    this.userSettings.setThemeId(themeId);
    this.closeDropdown();

    this.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: { themeId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.isOpen = true;
      this.updateComplete.then(() => this.createDropdownPortal());
    }
  }

  private createDropdownPortal() {
    const button = this.querySelector(".theme-button") as HTMLElement;
    if (!button) return;

    // Remove existing portal if any
    if (this.dropdownPortal) {
      this.dropdownPortal.remove();
    }

    const buttonRect = button.getBoundingClientRect();

    // Create portal container
    this.dropdownPortal = document.createElement("div");
    this.dropdownPortal.className = "alliance-theme-dropdown-portal";
    this.dropdownPortal.style.cssText = `
      position: fixed;
      top: ${buttonRect.bottom + 4}px;
      left: ${buttonRect.left}px;
      width: ${buttonRect.width}px;
      z-index: 1000;
      background: rgba(24, 49, 82, 0.98);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      max-height: 250px;
      overflow-y: auto;
    `;

    // Render options into portal
    const optionsHTML = AllianceThemes.map(
      (theme) => `
        <div class="dropdown-option ${theme.id === this.selectedTheme ? "selected" : ""}" data-theme="${theme.id}" title="${translateText(theme.displayNameKey)}">
          <img src="/flags/${this.themeFlags[theme.id as ThemeId]}.svg" alt="${theme.id}" style="width: 40px; height: 26px; border-radius: 2px;" />
        </div>
      `,
    ).join("");

    this.dropdownPortal.innerHTML = `
      <style>
        .dropdown-option {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .dropdown-option:last-child {
          border-bottom: none;
        }
        .dropdown-option:hover {
          background: rgba(39, 71, 110, 0.5);
        }
        .dropdown-option.selected {
          background: rgba(39, 71, 110, 0.8);
        }
      </style>
      ${optionsHTML}
    `;

    // Add click handlers
    this.dropdownPortal
      .querySelectorAll(".dropdown-option")
      .forEach((option) => {
        option.addEventListener("click", () => {
          const themeId = option.getAttribute("data-theme") as ThemeId;
          this.handleThemeChange(themeId);
        });
      });

    document.body.appendChild(this.dropdownPortal);
  }

  private closeDropdown() {
    this.isOpen = false;
    if (this.dropdownPortal) {
      this.dropdownPortal.remove();
      this.dropdownPortal = null;
    }
  }

  render() {
    if (!this.userSettings.enableAllianceThemes()) {
      return html``;
    }

    const selectedTheme = AllianceThemes.find(
      (t) => t.id === this.selectedTheme,
    );
    const selectedThemeName =
      selectedTheme?.displayNameKey ?? this.selectedTheme;
    const flagCode = this.themeFlags[this.selectedTheme];

    return html`
      <button
        class="theme-button"
        @click=${this.toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded=${this.isOpen}
      >
        <div class="flag-icon">
          <img src="/flags/${flagCode}.svg" alt="${this.selectedTheme}" />
        </div>
        <span>${translateText(selectedThemeName)}</span>
      </button>
    `;
  }
}
