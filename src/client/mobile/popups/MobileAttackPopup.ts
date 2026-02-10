/**
 * MobileAttackPopup - Combat actions for mobile (Ground Attack, Naval Assault, Air Strike, etc.)
 * Replaces desktop RadialMenu.ts for attack actions
 */

import { customElement, property } from "lit/decorators.js";
import { UnitType, UpgradeType } from "../../../core/game/Game";
import type { TileRef } from "../../../core/game/GameMap";
import type { GameView } from "../../../core/game/GameView";
import { MobileBasePopup, type PopupMenuItem } from "./MobileBasePopup";

export type AttackCategory = "enemy-territory" | "enemy-unit" | "neutral";

@customElement("mobile-attack-popup")
export class MobileAttackPopup extends MobileBasePopup {
  @property({ type: Object }) tile: TileRef | null = null;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: String }) category: AttackCategory = "enemy-territory";
  @property({ type: Number }) attackRatio: number = 0.3; // Default 30%

  /**
   * Open the attack popup for a specific tile
   */
  openForTile(
    tile: TileRef,
    game: GameView,
    position?: { x: number; y: number },
  ): void {
    this.tile = tile;
    this.game = game;
    this.category = this.determineTileCategory(tile, game);
    this.title = this.getTitle();
    this.items = this.getMenuItems();
    this.open(position);
  }

  private determineTileCategory(tile: TileRef, game: GameView): AttackCategory {
    const owner = game.owner(tile);
    const myPlayer = game.myPlayer();

    if (!owner || !owner.isPlayer()) {
      return "neutral";
    }

    if (owner === myPlayer) {
      // This shouldn't happen - own territory should use different popup
      return "enemy-territory";
    }

    // All other players are enemies (peace timer checks happen in canGroundAttack etc.)
    return "enemy-territory";
  }

  private getTitle(): string {
    switch (this.category) {
      case "enemy-territory":
        return "⚔️ Attack Options";
      case "enemy-unit":
        return "⚔️ Attack Unit";
      case "neutral":
      default:
        return "⚔️ Actions";
    }
  }

  private getMenuItems(): PopupMenuItem[] {
    if (!this.game || !this.tile) return [];

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return [];

    if (this.category === "enemy-territory") {
      return this.getEnemyTerritoryActions(myPlayer);
    } else if (this.category === "neutral") {
      return this.getNeutralActions(myPlayer);
    } else {
      return this.getEnemyUnitActions(myPlayer);
    }
  }

  private getEnemyTerritoryActions(myPlayer: any): PopupMenuItem[] {
    if (!this.game || !this.tile) return [];

    const items: PopupMenuItem[] = [];
    const troops = Number(myPlayer.troops());
    const attackTroops = Math.floor(troops * this.attackRatio);

    // Ground Attack
    if (this.canGroundAttack()) {
      items.push({
        icon: "🪖",
        label: "Ground Attack",
        action: "attack:ground",
        disabled: troops === 0,
        disabledReason: troops === 0 ? `No troops available` : undefined,
      });
    }

    // Naval Assault
    if (this.canNavalAssault()) {
      items.push({
        icon: "🚢",
        label: "Naval Assault",
        action: "attack:naval",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops available" : undefined,
      });
    }

    // Air Strike (Paratrooper)
    if (this.canAirStrike()) {
      items.push({
        icon: "✈️",
        label: "Air Strike",
        action: "attack:airstrike",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops available" : undefined,
      });
    }

    // Bomber Run
    if (this.canBomberRun()) {
      items.push({
        icon: "💣",
        label: "Bomber Run",
        action: "attack:bomber",
      });
    }

    // Mark Target
    items.push({
      icon: "🎯",
      label: "Mark Target",
      action: "attack:mark-target",
    });

    // Nuclear options
    if (this.canLaunchNuke("atom")) {
      items.push({
        icon: "☢️",
        label: "Atom Bomb",
        cost: 5000,
        action: "attack:nuke-atom",
        disabled: myPlayer.gold() < 5000,
        disabledReason:
          myPlayer.gold() < 5000 ? "Insufficient gold" : undefined,
      });
    }

    if (this.canLaunchNuke("hbomb")) {
      items.push({
        icon: "💥",
        label: "H-Bomb",
        cost: 15000,
        action: "attack:nuke-hbomb",
        disabled: myPlayer.gold() < 15000,
        disabledReason:
          myPlayer.gold() < 15000 ? "Insufficient gold" : undefined,
      });
    }

    if (this.canLaunchNuke("mirv")) {
      items.push({
        icon: "🚀",
        label: "MIRV",
        cost: 50000,
        action: "attack:nuke-mirv",
        disabled: myPlayer.gold() < 50000,
        disabledReason:
          myPlayer.gold() < 50000 ? "Insufficient gold" : undefined,
      });
    }

    // View Intel
    items.push({
      icon: "👁️",
      label: "View Intel",
      action: "attack:view-intel",
    });

    return items;
  }

  private getNeutralActions(myPlayer: any): PopupMenuItem[] {
    const items: PopupMenuItem[] = [];

    // Declare War option
    if (this.canDeclareWar()) {
      items.push({
        icon: "⚔️",
        label: "Declare War",
        action: "attack:declare-war",
      });
    }

    // View Intel
    items.push({
      icon: "👁️",
      label: "View Intel",
      action: "attack:view-intel",
    });

    return items;
  }

  private getEnemyUnitActions(myPlayer: any): PopupMenuItem[] {
    const items: PopupMenuItem[] = [];

    // Attack Unit
    items.push({
      icon: "⚓",
      label: "Attack Unit",
      action: "attack:unit",
    });

    // View Unit
    items.push({
      icon: "👁️",
      label: "View Unit",
      action: "attack:view-unit",
    });

    return items;
  }

  private canGroundAttack(): boolean {
    if (!this.game || !this.tile) return false;

    const owner = this.game.owner(this.tile);
    const myPlayer = this.game.myPlayer();

    if (!myPlayer) return false;
    if (owner === myPlayer) return false; // Can't attack self

    const peaceTimer = this.game.peaceTimerEndsAtTick();
    if (peaceTimer && this.game.ticks() < peaceTimer) {
      return !owner || !owner.isPlayer(); // Can attack neutral during peace
    }

    return Number(myPlayer.troops()) > 0;
  }

  private canNavalAssault(): boolean {
    if (!this.game || !this.tile) return false;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return false;

    // Must have port
    const ports = myPlayer.units(UnitType.Port);
    if (ports.length === 0) return false;

    // Must be coastal target
    const neighbors = this.game.neighbors(this.tile);
    const hasAdjacentWater = neighbors.some((n) => !this.game!.isLand(n));
    if (!hasAdjacentWater) return false;

    return true;
  }

  private canAirStrike(): boolean {
    if (!this.game || !this.tile) return false;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return false;

    // Must have Jet Engines upgrade
    if (!myPlayer.hasUpgrade(UpgradeType.JetEngines)) return false;

    // Must have at least one airfield
    const airfields = myPlayer.units(UnitType.Airfield);
    if (airfields.length === 0) return false;

    // Must be land target
    if (!this.game.isLand(this.tile)) return false;

    // Must be enemy
    const owner = this.game.owner(this.tile);
    if (owner === myPlayer || !owner || !owner.isPlayer()) return false;

    // Check peace timer
    const peaceTimerEndsAtTick = this.game.peaceTimerEndsAtTick();
    if (peaceTimerEndsAtTick && this.game.ticks() < peaceTimerEndsAtTick) {
      return false;
    }

    return true;
  }

  private canBomberRun(): boolean {
    if (!this.game || !this.tile) return false;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return false;

    const owner = this.game.owner(this.tile);

    // Must have airfield
    const airfields = myPlayer.units(UnitType.Airfield);
    if (airfields.length === 0) return false;

    // Must be land
    if (!this.game.isLand(this.tile)) return false;

    // Must be enemy player
    if (owner === myPlayer || !owner || !owner.isPlayer()) return false;

    // Must be at war
    if (!myPlayer.isAtWarWith(owner as any)) return false;

    // Check if any airfield can reach target (simplified - would need actual range calculation)
    return true;
  }

  private canDeclareWar(): boolean {
    if (!this.game || !this.tile) return false;

    const owner = this.game.owner(this.tile);
    const myPlayer = this.game.myPlayer();

    if (!myPlayer) return false;
    if (!owner || !owner.isPlayer()) return false; // Can't declare war on neutral
    if (owner === myPlayer) return false; // Can't attack self

    // Can only declare if NOT at war
    return !myPlayer.isAtWarWith(owner as any);
  }

  private canLaunchNuke(nukeType: "atom" | "hbomb" | "mirv"): boolean {
    if (!this.game || !this.tile) return false;

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return false;

    const silos = myPlayer.units(UnitType.MissileSilo);
    if (silos.length === 0) return false; // No silos

    const cost =
      nukeType === "atom" ? 5000 : nukeType === "hbomb" ? 15000 : 50000;
    if (Number(myPlayer.gold()) < cost) return false; // Can't afford

    // Check research requirements
    if (nukeType === "atom") {
      if (!myPlayer.hasUpgrade(UpgradeType.NuclearFission)) return false;
    } else if (nukeType === "hbomb") {
      if (!myPlayer.hasUpgrade(UpgradeType.ThermonuclearStaging)) return false;
    } else if (nukeType === "mirv") {
      if (!myPlayer.hasUpgrade(UpgradeType.MIRVTechnology)) return false;
    }

    // Check if any silo can reach target (simplified - would need actual range calculation)
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-attack-popup": MobileAttackPopup;
  }
}
