/**
 * MobileUnitActionPopup - Actions for own units (Deploy, Upgrade, Show Range, Disband)
 * Used when selecting own military units (boats, jets, etc.)
 */

import { customElement, property } from "lit/decorators.js";
import { UnitType } from "../../../core/game/Game";
import type { GameView } from "../../../core/game/GameView";
import { MobileBasePopup, type PopupMenuItem } from "./MobileBasePopup";

export type UnitActionCategory =
  | "warship"
  | "submarine"
  | "fighter-jet"
  | "airfield"
  | "port"
  | "other";

@customElement("mobile-unit-action-popup")
export class MobileUnitActionPopup extends MobileBasePopup {
  @property({ type: Object }) unit: any | null = null;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: String }) category: UnitActionCategory = "other";

  /**
   * Open the unit action popup for a specific unit
   */
  openForUnit(
    unit: any,
    game: GameView,
    position?: { x: number; y: number },
  ): void {
    this.unit = unit;
    this.game = game;
    this.category = this.determineUnitCategory(unit);
    this.title = this.getTitle();
    this.items = this.getMenuItems();
    this.open(position);
  }

  private determineUnitCategory(unit: any): UnitActionCategory {
    const type = unit.type();

    switch (type) {
      case UnitType.Warship:
        return "warship";
      case UnitType.Submarine:
        return "submarine";
      case UnitType.FighterJet:
        return "fighter-jet";
      case UnitType.Airfield:
        return "airfield";
      case UnitType.Port:
        return "port";
      default:
        return "other";
    }
  }

  private getTitle(): string {
    if (!this.unit) return "⚙️ Unit Actions";

    const type = this.unit.type();
    const typeNames: Record<string, string> = {
      [UnitType.Warship]: "⛵ Warship",
      [UnitType.Submarine]: "🚢 Submarine",
      [UnitType.FighterJet]: "✈️ Fighter Jet",
      [UnitType.Airfield]: "✈️ Airfield",
      [UnitType.Port]: "⚓ Port",
    };

    return typeNames[type] || "⚙️ Unit Actions";
  }

  private getMenuItems(): PopupMenuItem[] {
    if (!this.unit || !this.game) return [];

    const items: PopupMenuItem[] = [];

    // Select Target (for movable units)
    if (this.canSelectTarget()) {
      items.push({
        icon: "🎯",
        label: "Select Target",
        action: "unit:select-target",
      });
    }

    // Show Range
    items.push({
      icon: "🗺️",
      label: "Show Range",
      action: "unit:show-range",
    });

    // Upgrade Unit (if upgradeable)
    if (this.canUpgrade()) {
      items.push({
        icon: "⚙️",
        label: "Upgrade Unit",
        action: "unit:upgrade",
      });
    }

    // Patrol/Move (for mobile units)
    if (this.canPatrol()) {
      items.push({
        icon: "🧭",
        label: "Set Patrol",
        action: "unit:patrol",
      });
    }

    // Disband
    items.push({
      icon: "🚮",
      label: "Disband",
      action: "unit:disband",
    });

    return items;
  }

  private canSelectTarget(): boolean {
    if (!this.unit) return false;

    const type = this.unit.type();
    return (
      type === UnitType.Warship ||
      type === UnitType.Submarine ||
      type === UnitType.FighterJet
    );
  }

  private canUpgrade(): boolean {
    if (!this.unit) return false;

    const type = this.unit.type();
    // Structures like Airfield, Port can be upgraded
    return (
      type === UnitType.Airfield ||
      type === UnitType.Port ||
      type === UnitType.Warship ||
      type === UnitType.Submarine
    );
  }

  private canPatrol(): boolean {
    if (!this.unit) return false;

    const type = this.unit.type();
    return (
      type === UnitType.Warship ||
      type === UnitType.Submarine ||
      type === UnitType.Artillery
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-unit-action-popup": MobileUnitActionPopup;
  }
}
