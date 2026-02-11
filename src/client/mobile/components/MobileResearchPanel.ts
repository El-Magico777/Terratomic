/**
 * MobileResearchPanel - Native mobile research interface
 * Designed from scratch for mobile touch interaction
 */

import { LitElement, css, html, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import airIcon from "../../../../resources/icons/research/air.svg";
import landIcon from "../../../../resources/icons/research/land.svg";
import nuclearIcon from "../../../../resources/icons/research/nuclear.svg";
import seaIcon from "../../../../resources/icons/research/sea.svg";
import type { EventBus } from "../../../core/EventBus";
import type { GameView } from "../../../core/game/GameView";
import {
  getTechNodes,
  isTechAvailable,
  type Category,
  type TechNode,
} from "../../../core/tech/ResearchTree";
import { getTechMeta } from "../../../core/tech/TechEffects";
import {
  INVESTMENT_REQUEST_EVENT,
  INVESTMENT_SYNC_EVENT,
  INVESTMENT_SYNC_REQUEST_EVENT,
  type InvestmentRequestDetail,
  type InvestmentSyncDetail,
} from "../../events/InvestmentEvents";
import { SendResearchTreeSelectIntentEvent } from "../../Transport";
import { HapticFeedback } from "../utils/HapticFeedback";

const categoryIconSources: Record<Category, string> = {
  Land: landIcon,
  Sea: seaIcon,
  Air: airIcon,
  Nuclear: nuclearIcon,
};

@customElement("mobile-research-panel")
export class MobileResearchPanel extends LitElement {
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) eventBus: EventBus | null = null;

  @state() private researchInvestmentRate = 0;
  @state() private lockResearch = false;
  @state() private activeCategory: Category | "all" = "all";

  private techs: TechNode[] = [...getTechNodes()];
  private categories: Category[] = ["Land", "Sea", "Air", "Nuclear"];
  private refreshTimer: number | null = null;

  static styles = css`
    :host {
      display: grid;
      grid-template-rows: auto auto 1fr;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      background: linear-gradient(to bottom, #1a2332, #0f1419);
      color: white;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
    }

    /* Investment slider section */
    .investment-section {
      padding: 16px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .investment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .investment-label {
      font-size: 13px;
      color: #bdc3c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .investment-value {
      font-size: 20px;
      font-weight: 700;
      color: #3498db;
    }

    .slider-container {
      position: relative;
      height: 44px;
      display: flex;
      align-items: center;
    }

    .investment-slider {
      width: 100%;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(to right, #2c3e50 0%, #3498db 100%);
      border-radius: 4px;
      outline: none;
    }

    .investment-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3498db, #2980b9);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border: 3px solid white;
    }

    .investment-slider::-moz-range-thumb {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3498db, #2980b9);
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border: 3px solid white;
    }

    /* Category filter tabs */
    .category-tabs {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      flex-shrink: 0;
    }

    .category-tab {
      padding: 8px 16px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid transparent;
      color: #bdc3c7;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .category-tab.cat-land {
      color: #2ecc71;
    }

    .category-tab.cat-sea {
      color: #3498db;
    }

    .category-tab.cat-air {
      color: #9b59b6;
    }

    .category-tab.cat-nuclear {
      color: #e74c3c;
    }

    .category-tab-icon,
    .category-icon {
      width: 18px;
      height: 18px;
      background-color: currentColor;
      -webkit-mask-image: var(--icon-url);
      mask-image: var(--icon-url);
      -webkit-mask-size: contain;
      mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      display: inline-block;
      flex-shrink: 0;
    }

    .category-tab-icon {
      width: 16px;
      height: 16px;
    }

    .category-tab.active {
      background: rgba(52, 152, 219, 0.2);
      border-color: #3498db;
      color: #3498db;
    }

    .category-tab:active {
      transform: scale(0.95);
    }

    /* Tech grid */
    .tech-scroll {
      height: 100%;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
    }

    .tech-grid {
      padding: 16px;
    }

    .category-section {
      margin-bottom: 24px;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border-left: 4px solid;
    }

    .category-header.land {
      border-color: #2ecc71;
      color: #2ecc71;
    }

    .category-header.sea {
      border-color: #3498db;
      color: #3498db;
    }

    .category-header.air {
      border-color: #9b59b6;
      color: #9b59b6;
    }

    .category-header.nuclear {
      border-color: #e74c3c;
      color: #e74c3c;
    }

    .category-title {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .category-header.land .category-title {
      color: #2ecc71;
    }

    .category-header.sea .category-title {
      color: #3498db;
    }

    .category-header.air .category-title {
      color: #9b59b6;
    }

    .category-header.nuclear .category-title {
      color: #e74c3c;
    }

    /* Tech card */
    .tech-card {
      background: linear-gradient(
        135deg,
        rgba(52, 73, 94, 0.4),
        rgba(44, 62, 80, 0.6)
      );
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 10px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
      position: relative;
      overflow: hidden;
    }

    .tech-card:active {
      transform: scale(0.98);
    }

    .tech-card.researched {
      background: linear-gradient(
        135deg,
        rgba(46, 204, 113, 0.2),
        rgba(39, 174, 96, 0.3)
      );
      border-color: #2ecc71;
    }

    .tech-card.prioritized {
      border-color: #f39c12;
      box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.3);
    }

    .tech-card.unavailable {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 4px;
      background: linear-gradient(to right, #3498db, #2ecc71);
      transition: width 0.3s;
    }

    .tech-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .tech-name {
      font-size: 15px;
      font-weight: 700;
      color: white;
      line-height: 1.3;
      flex: 1;
    }

    .tech-status {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 600;
      margin-left: 8px;
      white-space: nowrap;
    }

    .tech-status.complete {
      background: rgba(46, 204, 113, 0.3);
      color: #2ecc71;
    }

    .tech-status.priority {
      background: rgba(243, 156, 18, 0.3);
      color: #f39c12;
    }

    .tech-status.progress {
      background: rgba(52, 152, 219, 0.3);
      color: #3498db;
    }

    .tech-description {
      font-size: 12px;
      color: #bdc3c7;
      line-height: 1.4;
      margin-bottom: 6px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #7f8c8d;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-text {
      font-size: 14px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(
      INVESTMENT_SYNC_EVENT,
      this.handleInvestmentSync as EventListener,
    );
    this.requestInvestmentSync();
    this.startRefreshTimer();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(
      INVESTMENT_SYNC_EVENT,
      this.handleInvestmentSync as EventListener,
    );
    this.stopRefreshTimer();
  }

  private startRefreshTimer(): void {
    this.syncResearchInvestmentFromGame();
    this.refreshTimer = window.setInterval(() => {
      this.syncResearchInvestmentFromGame();
      this.requestUpdate();
    }, 500);
  }

  private stopRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private syncResearchInvestmentFromGame(): void {
    const me = this.game?.myPlayer?.();
    if (!me) return;
    const serverRate = me.researchInvestmentRate?.() ?? 0;
    if (Math.abs(serverRate - this.researchInvestmentRate) > 1e-6) {
      this.researchInvestmentRate = serverRate;
    }
  }

  private handleInvestmentSync = (e: Event): void => {
    const detail = (e as CustomEvent<InvestmentSyncDetail>).detail;
    if (!detail) return;
    this.researchInvestmentRate = detail.research;
    this.lockResearch = detail.lockResearch;
  };

  private requestInvestmentSync(): void {
    window.dispatchEvent(new CustomEvent(INVESTMENT_SYNC_REQUEST_EVENT));
  }

  private handleInvestmentChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = Math.max(
      0,
      Math.min(1, (parseInt(target.value || "0", 10) || 0) / 100),
    );
    if (this.lockResearch) {
      target.value = Math.round(this.researchInvestmentRate * 100).toString();
      return;
    }

    this.researchInvestmentRate = value;

    this.dispatchInvestmentRequest({
      type: "set",
      slider: "research",
      value,
    });

    HapticFeedback.tap();
  }

  private dispatchInvestmentRequest(detail: InvestmentRequestDetail) {
    window.dispatchEvent(
      new CustomEvent<InvestmentRequestDetail>(INVESTMENT_REQUEST_EVENT, {
        detail,
      }),
    );
  }

  private handleCategoryClick(category: Category | "all"): void {
    this.activeCategory = category;
    HapticFeedback.tap();
  }

  private researchedIDsFromGame(): Set<string> {
    const res = new Set<string>();
    const me = this.game?.myPlayer?.();
    if (!me) return res;
    for (const t of this.techs) if (me.hasResearchedTech(t.id)) res.add(t.id);
    return res;
  }

  private handleTechClick(tech: TechNode): void {
    if (!this.game || !this.eventBus) return;
    const me = this.game.myPlayer();
    if (!me) return;

    const researched = this.researchedIDsFromGame();
    if (researched.has(tech.id)) return;

    const clickedTech = this.techs.find((t) => t.id === tech.id);
    if (!clickedTech) return;

    const priorities = me.researchPriorities?.() ?? new Set<string>();
    const willBePrioritized = !priorities.has(tech.id);

    if (willBePrioritized) {
      // Remove priorities from same-level techs in other categories
      for (const t of this.techs) {
        if (
          t.level === clickedTech.level &&
          t.category !== clickedTech.category &&
          priorities.has(t.id)
        ) {
          this.eventBus.emit(new SendResearchTreeSelectIntentEvent(t.id));
        }
      }
    }

    this.eventBus.emit(new SendResearchTreeSelectIntentEvent(tech.id));
    HapticFeedback.tap();
  }

  render() {
    const me = this.game?.myPlayer?.();
    if (!me) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">🔬</div>
          <div class="empty-text">Loading research data...</div>
        </div>
      `;
    }

    const researched = this.researchedIDsFromGame();
    const priorities = me.researchPriorities?.() ?? new Set<string>();

    const percentByTechId = new Map<string, number>();
    for (const tech of this.techs) {
      const cost = Math.max(1, tech.cost || 1);
      const beakers = me.researchBeakers?.(tech.id) ?? 0;
      let pct = Math.floor((beakers / cost) * 100);
      if (!Number.isFinite(pct)) pct = 0;
      pct = Math.max(0, Math.min(100, pct));
      if (researched.has(tech.id)) pct = 100;
      percentByTechId.set(tech.id, pct);
    }

    return html`
      <!-- Investment slider -->
      <div class="investment-section">
        <div class="investment-header">
          <div class="investment-label">Research Investment</div>
          <div class="investment-value">
            ${Math.round(this.researchInvestmentRate * 100)}%
          </div>
        </div>
        <div class="slider-container">
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            .value="${String(Math.round(this.researchInvestmentRate * 100))}"
            class="investment-slider"
            @input="${this.handleInvestmentChange}"
          />
        </div>
      </div>

      <!-- Category filter tabs -->
      <div class="category-tabs">
        <button
          class="category-tab ${this.activeCategory === "all" ? "active" : ""}"
          @click="${() => this.handleCategoryClick("all")}"
        >
          All
        </button>
        ${this.categories.map(
          (cat) => html`
            <button
              class="category-tab cat-${cat.toLowerCase()} ${this
                .activeCategory === cat
                ? "active"
                : ""}"
              @click="${() => this.handleCategoryClick(cat)}"
            >
              <span
                class="category-tab-icon"
                style="--icon-url: url('${categoryIconSources[cat]}')"
              ></span>
              ${cat}
            </button>
          `,
        )}
      </div>

      <!-- Tech grid -->
      <div class="tech-scroll">
        <div class="tech-grid">
          ${this.categories
            .filter(
              (cat) =>
                this.activeCategory === "all" || this.activeCategory === cat,
            )
            .map((cat) =>
              this.renderCategory(cat, researched, priorities, percentByTechId),
            )}
        </div>
      </div>
    `;
  }

  private renderCategory(
    category: Category,
    researched: Set<string>,
    priorities: Set<string>,
    percentByTechId: Map<string, number>,
  ) {
    const categoryTechs = this.techs.filter((t) => t.category === category);

    return html`
      <div class="category-section">
        <div class="category-header ${category.toLowerCase()}">
          <div
            class="category-icon"
            style="--icon-url: url('${categoryIconSources[category]}')"
          ></div>
          <div class="category-title">${category}</div>
        </div>
        ${categoryTechs.map((tech) =>
          this.renderTechCard(tech, researched, priorities, percentByTechId),
        )}
      </div>
    `;
  }

  private renderTechCard(
    tech: TechNode,
    researched: Set<string>,
    priorities: Set<string>,
    percentByTechId: Map<string, number>,
  ) {
    const meta = getTechMeta(tech.id, { strict: false });
    const name = meta?.name ?? tech.id;
    const description = meta?.shortDescription ?? meta?.description ?? "";

    const isResearched = researched.has(tech.id);
    const isPrioritized = priorities.has(tech.id);
    const isAvailable = isTechAvailable(tech.id, researched);
    const progress = percentByTechId.get(tech.id) ?? 0;

    let statusBadge: TemplateResult | null = null;
    if (isResearched) {
      statusBadge = html`<div class="tech-status complete">✓ Complete</div>`;
    } else if (isPrioritized) {
      statusBadge = html`<div class="tech-status priority">★ Priority</div>`;
    } else if (progress > 0) {
      statusBadge = html`<div class="tech-status progress">${progress}%</div>`;
    }

    const classes = [
      "tech-card",
      isResearched ? "researched" : "",
      isPrioritized ? "prioritized" : "",
      !isAvailable ? "unavailable" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div
        class="${classes}"
        @click="${() =>
          isAvailable && !isResearched && this.handleTechClick(tech)}"
      >
        ${progress > 0 && !isResearched
          ? html`<div class="progress-bar" style="width: ${progress}%"></div>`
          : null}
        <div class="tech-header">
          <div class="tech-name">${name}</div>
          ${statusBadge}
        </div>
        ${description
          ? html`<div class="tech-description">${description}</div>`
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-research-panel": MobileResearchPanel;
  }
}
