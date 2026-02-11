/**
 * Skeleton loading component for mobile UI
 * Provides animated placeholder UI while content loads
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("skeleton-loader")
export class SkeletonLoader extends LitElement {
  @property({ type: String }) type: "list" | "grid" | "card" = "list";
  @property({ type: Number }) count: number = 3;

  static styles = css`
    :host {
      display: block;
    }

    .skeleton {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 25%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.05) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    .list-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .line {
      height: 12px;
      border-radius: 4px;
    }

    .line.short {
      width: 60%;
    }

    .line.long {
      width: 90%;
    }

    .card {
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 12px;
    }

    .grid-item {
      aspect-ratio: 1;
      border-radius: 8px;
    }
  `;

  render() {
    switch (this.type) {
      case "list":
        return this.renderList();
      case "grid":
        return this.renderGrid();
      case "card":
        return this.renderCard();
      default:
        return this.renderList();
    }
  }

  private renderList() {
    return html`
      ${Array.from({ length: this.count }).map(
        () => html`
          <div class="list-item">
            <div class="skeleton avatar"></div>
            <div class="content">
              <div class="skeleton line long"></div>
              <div class="skeleton line short"></div>
            </div>
          </div>
        `,
      )}
    `;
  }

  private renderGrid() {
    return html`
      <div class="grid">
        ${Array.from({ length: this.count }).map(
          () => html` <div class="skeleton grid-item"></div> `,
        )}
      </div>
    `;
  }

  private renderCard() {
    return html`
      ${Array.from({ length: this.count }).map(
        () => html` <div class="skeleton card" style="height: 120px;"></div> `,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "skeleton-loader": SkeletonLoader;
  }
}
