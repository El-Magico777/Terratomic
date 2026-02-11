/**
 * MobileDiplomacyPopup - Diplomatic actions for allied/neutral/enemy players
 * Handles alliance request, break alliance, peace request
 * Part of Phase 4: Diplomacy & Intel System
 */

import { customElement, property } from "lit/decorators.js";
import type { TileRef } from "../../../core/game/GameMap";
import type { GameView } from "../../../core/game/GameView";
import { MobileBasePopup, type PopupMenuItem } from "./MobileBasePopup";

export type DiplomacyAction =
  | "diplomacy:propose-ally"
  | "diplomacy:break-alliance"
  | "diplomacy:request-peace"
  | "diplomacy:send-emoji"
  | "diplomacy:donate-troops"
  | "diplomacy:view-player";

@customElement("mobile-diplomacy-popup")
export class MobileDiplomacyPopup extends MobileBasePopup {
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Object }) selectedTile: TileRef | null = null;

  private getTargetPlayer():
    | import("../../../core/game/GameView").PlayerView
    | null {
    if (!this.game || !this.selectedTile) return null;
    const owner = this.game.owner(this.selectedTile);
    if (!owner.isPlayer()) return null;
    // After isPlayer check, owner is guaranteed to be PlayerView
    return owner as import("../../../core/game/GameView").PlayerView;
  }

  private getPlayerRelation(): "allied" | "neutral" | "enemy" | null {
    if (!this.game || !this.selectedTile) return null;
    const targetPlayer = this.getTargetPlayer();
    if (!targetPlayer) return null;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return null;

    // Check alliance status
    const isAllied = myPlayer.isAlliedWith(targetPlayer);
    if (isAllied) return "allied";

    // Check war status
    const isAtWar = myPlayer.isAtWarWith(targetPlayer);
    if (isAtWar) return "enemy";

    return "neutral";
  }

  private canProposeAlliance(): boolean {
    if (!this.game || !this.selectedTile) return false;
    const targetPlayer = this.getTargetPlayer();
    if (!targetPlayer) return false;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer || targetPlayer === myPlayer) return false;

    // Can propose if neutral or enemy (not already allied)
    const relation = this.getPlayerRelation();
    return relation === "neutral" || relation === "enemy";
  }

  private canBreakAlliance(): boolean {
    if (!this.game || !this.selectedTile) return false;
    const targetPlayer = this.getTargetPlayer();
    if (!targetPlayer) return false;

    // Can only break if currently allied
    const relation = this.getPlayerRelation();
    return relation === "allied";
  }

  private canRequestPeace(): boolean {
    if (!this.game || !this.selectedTile) return false;
    const targetPlayer = this.getTargetPlayer();
    if (!targetPlayer) return false;

    // Can only request peace if at war
    const relation = this.getPlayerRelation();
    return relation === "enemy";
  }

  private canDonateTroops(): boolean {
    if (!this.game || !this.selectedTile) return false;
    const targetPlayer = this.getTargetPlayer();
    if (!targetPlayer) return false;

    // Can only donate to allies
    const relation = this.getPlayerRelation();
    return relation === "allied";
  }

  private buildMenuItems(): PopupMenuItem[] {
    const items: PopupMenuItem[] = [];
    const relation = this.getPlayerRelation();
    const targetPlayer = this.getTargetPlayer();

    if (!relation || !targetPlayer) return items;

    // Request Peace (enemies only)
    if (this.canRequestPeace()) {
      items.push({
        icon: "🕊️",
        label: "Request Peace",
        action: "diplomacy:request-peace",
        locked: false,
      });
    }

    // Propose Alliance (neutral/enemy)
    if (this.canProposeAlliance()) {
      items.push({
        icon: "🤝",
        label: "Propose Alliance",
        action: "diplomacy:propose-ally",
        locked: false,
      });
    }

    // Break Alliance (allies only)
    if (this.canBreakAlliance()) {
      items.push({
        icon: "💔",
        label: "Break Alliance",
        action: "diplomacy:break-alliance",
        locked: false,
      });
    }

    // Send Emoji (always available)
    items.push({
      icon: "😀",
      label: "Send Emoji",
      action: "diplomacy:send-emoji",
      locked: true,
      lockedReason: "Coming soon",
    });

    // Donate Troops (allies only)
    if (this.canDonateTroops()) {
      items.push({
        icon: "🎁",
        label: "Donate Troops",
        action: "diplomacy:donate-troops",
        locked: true,
        lockedReason: "Coming soon",
      });
    }

    // View Player (always available)
    items.push({
      icon: "👁️",
      label: "View Player",
      action: "diplomacy:view-player",
      locked: true,
      lockedReason: "Coming soon",
    });

    return items;
  }

  show(position: { x: number; y: number }): void {
    const targetPlayer = this.getTargetPlayer();
    if (!targetPlayer) return;

    this.title = `Diplomacy`;
    this.items = this.buildMenuItems();
    this.open(position);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-diplomacy-popup": MobileDiplomacyPopup;
  }
}
