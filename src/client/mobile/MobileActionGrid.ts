/**
 * MobileActionGrid - Bottom-anchored action grid that shows context-appropriate actions
 * Replaces FAB + popup pattern with direct action selection
 */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { aggregateStructureBuildCost } from "../../core/game/Costs";
import { UnitType, UpgradeType } from "../../core/game/Game";
import type { TileRef } from "../../core/game/GameMap";
import type { GameView, PlayerView } from "../../core/game/GameView";
import {
  isStackableStructure,
  isUpgradeableUnit,
  playerMaxUnitLevel,
} from "../../core/game/Upgradeables";
import { HapticFeedback, HapticPattern } from "./utils/HapticFeedback";

export interface ActionGridItem {
  id: string;
  icon: string;
  label: string;
  cost?: number;
  disabled?: boolean;
  disabledReason?: string;
  locked?: boolean;
  lockedReason?: string;
  priority?: "high" | "normal"; // High priority = larger tile
}

export type ActionCategory =
  | "own-land"
  | "own-shore"
  | "own-water"
  | "enemy-can-attack"
  | "enemy-can-boat-attack"
  | "enemy-no-attack"
  | "neutral-can-attack"
  | "neutral-can-boat-attack"
  | "spawn-phase";

@customElement("mobile-action-grid")
export class MobileActionGrid extends LitElement {
  @property({ type: Boolean, reflect: true }) visible: boolean = false;
  @property({ type: Object }) tile: TileRef | null = null;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: Array }) items: ActionGridItem[] = [];
  @property({ type: Number }) attackRatio: number = 0.3;
  private lastOpenedTime: number = 0;

  static styles = css`
    :host {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 900;
      pointer-events: none;
    }

    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }

    :host([visible]) .backdrop {
      opacity: 1;
      pointer-events: all;
    }

    .grid-container {
      background: linear-gradient(
        to top,
        rgba(17, 24, 39, 0.98),
        rgba(17, 24, 39, 0.95)
      );
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      padding: 16px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      transform: translateY(100%);
      transition: transform 0.25s ease;
      pointer-events: none;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
    }

    :host([visible]) .grid-container {
      transform: translateY(0);
      pointer-events: all;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
      gap: 8px;
      max-height: 60vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .action-tile {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 10px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: all 0.15s ease;
      min-height: 70px;
    }

    .action-tile.high-priority {
      grid-column: span 2;
      background: rgba(59, 130, 246, 0.25);
      border-color: rgba(59, 130, 246, 0.5);
      min-height: 85px;
    }

    .action-tile:active {
      transform: scale(0.95);
      background: rgba(59, 130, 246, 0.3);
    }

    .action-tile.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: rgba(107, 114, 128, 0.15);
      border-color: rgba(107, 114, 128, 0.3);
    }

    .action-tile.locked {
      opacity: 0.6;
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .action-tile.disabled:active,
    .action-tile.locked:active {
      transform: none;
    }

    .action-icon {
      font-size: 24px;
      line-height: 1;
    }

    .action-tile.high-priority .action-icon {
      font-size: 32px;
    }

    .action-label {
      color: rgba(255, 255, 255, 0.95);
      font-size: 11px;
      text-align: center;
      font-weight: 500;
      line-height: 1.2;
    }

    .action-tile.high-priority .action-label {
      font-size: 13px;
      font-weight: 600;
    }

    .action-cost {
      color: rgba(251, 191, 36, 0.9);
      font-size: 10px;
      font-weight: 600;
    }

    .action-tile.high-priority .action-cost {
      font-size: 12px;
    }

    .action-disabled-reason,
    .action-locked-reason {
      color: rgba(239, 68, 68, 0.9);
      font-size: 10px;
      text-align: center;
      line-height: 1.1;
      margin-top: 2px;
    }

    .action-locked-reason {
      color: rgba(248, 113, 113, 0.9);
    }

    .close-hint {
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      margin-top: 8px;
      padding: 8px;
    }
  `;

  render() {
    return html`
      <div class="backdrop" @click=${this.handleBackdropClick}></div>
      <div class="grid-container">
        <div class="grid">
          ${this.items.map((item) => this.renderActionTile(item))}
        </div>
        <div class="close-hint">Tap outside to close</div>
      </div>
    `;
  }

  private renderActionTile(item: ActionGridItem) {
    const classes = [
      "action-tile",
      item.priority === "high" ? "high-priority" : "",
      item.disabled ? "disabled" : "",
      item.locked ? "locked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class=${classes} @click=${() => this.handleActionClick(item)}>
        <div class="action-icon">${item.icon}</div>
        <div class="action-label">${item.label}</div>
        ${item.cost
          ? html`<div class="action-cost">
              💰${this.formatNumber(item.cost)}
            </div>`
          : ""}
        ${item.disabled && item.disabledReason
          ? html`<div class="action-disabled-reason">
              ${item.disabledReason}
            </div>`
          : ""}
        ${item.locked && item.lockedReason
          ? html`<div class="action-locked-reason">
              🔒 ${item.lockedReason}
            </div>`
          : ""}
      </div>
    `;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  private handleActionClick(item: ActionGridItem): void {
    if (item.disabled || item.locked) {
      HapticFeedback.trigger(HapticPattern.ERROR);
      return;
    }

    HapticFeedback.trigger(HapticPattern.TAP);
    this.dispatchEvent(
      new CustomEvent("action-selected", {
        detail: { action: item.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleBackdropClick(): void {
    // Prevent immediate closure if grid just opened (within 300ms)
    const timeSinceOpen = Date.now() - this.lastOpenedTime;
    if (timeSinceOpen < 300) {
      return;
    }
    HapticFeedback.trigger(HapticPattern.TAP);
    this.close();
  }

  /**
   * Show action grid for a tile
   */
  async showForTile(
    tile: TileRef,
    game: GameView,
    attackRatio: number,
  ): Promise<void> {
    this.tile = tile;
    this.game = game;
    this.attackRatio = attackRatio;

    // Fast path for spawn phase - no async needed
    if (game.inSpawnPhase()) {
      const myPlayer = game.myPlayer();
      if (myPlayer) {
        this.items = this.getSpawnActions(tile, game, myPlayer);
        this.visible = true;
        this.lastOpenedTime = Date.now();
        this.requestUpdate();
      }
      return;
    }

    const category = await this.determineTileCategory(tile, game);
    this.items = await this.getActionsForCategory(category, tile, game);
    this.visible = true;
    this.lastOpenedTime = Date.now();
    this.requestUpdate();
  }

  /**
   * Close the action grid
   */
  close(): void {
    this.visible = false;
    this.dispatchEvent(
      new CustomEvent("grid-closed", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Determine the category of actions to show based on tile context
   */
  private async determineTileCategory(
    tile: TileRef,
    game: GameView,
  ): Promise<ActionCategory> {
    const myPlayer = game.myPlayer();
    if (!myPlayer) return "neutral-can-attack";

    const owner = game.owner(tile);
    const isMyTile = owner === myPlayer;
    const isWater = !game.isLand(tile);
    const isNeutral = !owner.isPlayer();

    if (isMyTile) {
      // Own territory
      if (isWater) {
        return "own-water";
      } else if (game.isShoreline(tile)) {
        return "own-shore";
      } else {
        return "own-land";
      }
    } else {
      // Enemy or neutral territory
      const actions = await myPlayer.actions(tile);

      if (isNeutral) {
        // Neutral territory
        // For ocean tiles, always show ship building options
        if (isWater) {
          return "neutral-can-attack";
        }

        if (actions.canAttack) {
          return "neutral-can-attack";
        } else {
          // Check if boat attack is possible (for land tiles only)
          const transportShipBuildable = actions.buildableUnits.find(
            (bu) => bu.type === UnitType.TransportShip,
          );
          if (
            transportShipBuildable &&
            transportShipBuildable.canBuild !== false
          ) {
            return "neutral-can-boat-attack";
          }
          return "neutral-can-attack";
        }
      } else {
        // Enemy player territory
        if (actions.canAttack) {
          return "enemy-can-attack";
        } else {
          // Check if boat attack is possible
          const transportShipBuildable = actions.buildableUnits.find(
            (bu) => bu.type === UnitType.TransportShip,
          );
          if (
            transportShipBuildable &&
            transportShipBuildable.canBuild !== false &&
            game.isLand(tile)
          ) {
            return "enemy-can-boat-attack";
          }
          return "enemy-no-attack";
        }
      }
    }
  }

  /**
   * Get actions for a specific category
   */
  private async getActionsForCategory(
    category: ActionCategory,
    tile: TileRef,
    game: GameView,
  ): Promise<ActionGridItem[]> {
    const myPlayer = game.myPlayer();
    if (!myPlayer) return [];

    switch (category) {
      case "spawn-phase":
        return this.getSpawnActions(tile, game, myPlayer);
      case "own-land":
        return this.getOwnLandActions(tile, game, myPlayer);
      case "own-shore":
        return this.getOwnShoreActions(tile, game, myPlayer);
      case "own-water":
        return this.getOwnWaterActions(tile, game, myPlayer);
      case "enemy-can-attack":
        return this.getEnemyCanAttackActions(tile, game, myPlayer);
      case "enemy-can-boat-attack":
        return this.getEnemyCanBoatAttackActions(tile, game, myPlayer);
      case "enemy-no-attack":
        return this.getEnemyNoAttackActions(tile, game, myPlayer);
      case "neutral-can-attack":
        return this.getNeutralCanAttackActions(tile, game, myPlayer);
      case "neutral-can-boat-attack":
        return this.getNeutralCanBoatAttackActions(tile, game, myPlayer);
      default:
        return [];
    }
  }

  private getSpawnActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const isLand = game.isLand(tile);
    const hasOwner = game.hasOwner(tile);

    if (isLand && !hasOwner) {
      return [
        {
          id: "spawn",
          icon: "🎯",
          label: "Spawn Here",
          priority: "high",
        },
      ];
    }

    return [];
  }

  private getOwnLandActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const gold = Number(myPlayer.gold());
    const actions: ActionGridItem[] = [];

    // All land structures
    const landStructures = [
      {
        type: UnitType.City,
        icon: "🏙️",
        label: "City",
        priority: "high" as const,
      },
      {
        type: UnitType.Factory,
        icon: "🏭",
        label: "Factory",
        priority: "high" as const,
      },
      { type: UnitType.DefensePost, icon: "🛡️", label: "Defense Post" },
      {
        type: UnitType.Airfield,
        icon: "✈️",
        label: "Airfield",
        priority: "high" as const,
      },
      {
        type: UnitType.Hospital,
        icon: "🏥",
        label: "Hospital",
        upgrade: UpgradeType.HospitalResearch,
      },
      {
        type: UnitType.MissileSilo,
        icon: "⚛️",
        label: "Missile Silo",
        upgrade: UpgradeType.NuclearFission,
      },
      { type: UnitType.ResearchLab, icon: "🔬", label: "Research Lab" },
      { type: UnitType.Academy, icon: "🏛️", label: "Academy" },
      { type: UnitType.SAMLauncher, icon: "🎯", label: "SAM Launcher" },
      {
        type: UnitType.DoomsdayDevice,
        icon: "💀",
        label: "Doomsday Device",
        upgrade: UpgradeType.DoomsdayDeviceResearch,
      },
    ];

    for (const structure of landStructures) {
      // Skip if locked (requires upgrade)
      if (structure.upgrade && !myPlayer.hasUpgrade(structure.upgrade)) {
        continue;
      }

      const cost = this.getUnitCost(structure.type, myPlayer);
      actions.push({
        id: `build:${structure.type}`,
        icon: structure.icon,
        label: structure.label,
        cost,
        disabled: gold < cost,
        disabledReason: gold < cost ? "Not enough gold" : undefined,
        priority: structure.priority,
      });
    }

    // Fighter Jet (only if airfield and jet engines)
    const hasAirfield = this.playerHasAirfield(myPlayer);
    if (hasAirfield) {
      const hasJetEngines = myPlayer.hasUpgrade(UpgradeType.JetEngines);
      if (hasJetEngines) {
        const jetCost = this.getUnitCost(UnitType.FighterJet, myPlayer);
        actions.push({
          id: `build:${UnitType.FighterJet}`,
          icon: "🛩️",
          label: "Fighter Jet",
          cost: jetCost,
          disabled: gold < jetCost,
          disabledReason: gold < jetCost ? "Not enough gold" : undefined,
        });
      }
    }

    return actions;
  }

  private getOwnShoreActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const actions = this.getOwnLandActions(tile, game, myPlayer);
    const gold = Number(myPlayer.gold());

    // Add Port as a high-priority action
    const portCost = this.getUnitCost(UnitType.Port, myPlayer);
    actions.unshift({
      id: `build:${UnitType.Port}`,
      icon: "⚓",
      label: "Port",
      cost: portCost,
      disabled: gold < portCost,
      disabledReason: gold < portCost ? "Not enough gold" : undefined,
      priority: "high",
    });

    return actions;
  }

  private getOwnWaterActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const gold = Number(myPlayer.gold());
    const actions: ActionGridItem[] = [];

    // Check if player has a port (required for water units)
    const hasPort = this.playerHasPort(myPlayer);

    // Only show water units if port exists
    if (hasPort) {
      // Warship
      const warshipCost = this.getUnitCost(UnitType.Warship, myPlayer);
      actions.push({
        id: `build:${UnitType.Warship}`,
        icon: "🚢",
        label: "Warship",
        cost: warshipCost,
        disabled: gold < warshipCost,
        disabledReason: gold < warshipCost ? "Not enough gold" : undefined,
        priority: "high",
      });

      // Submarine (only if research unlocked)
      const hasSubResearch = myPlayer.hasUpgrade(UpgradeType.SubmarineResearch);
      if (hasSubResearch) {
        const submarineCost = this.getUnitCost(UnitType.Submarine, myPlayer);
        actions.push({
          id: `build:${UnitType.Submarine}`,
          icon: "🔱",
          label: "Submarine",
          cost: submarineCost,
          disabled: gold < submarineCost,
          disabledReason: gold < submarineCost ? "Not enough gold" : undefined,
          priority: "high",
        });
      }
    }

    // Fighter Jet (only if airfield and jet engines)
    const hasAirfield = this.playerHasAirfield(myPlayer);
    if (hasAirfield) {
      const hasJetEngines = myPlayer.hasUpgrade(UpgradeType.JetEngines);
      if (hasJetEngines) {
        const jetCost = this.getUnitCost(UnitType.FighterJet, myPlayer);
        actions.push({
          id: `build:${UnitType.FighterJet}`,
          icon: "🛩️",
          label: "Fighter Jet",
          cost: jetCost,
          disabled: gold < jetCost,
          disabledReason: gold < jetCost ? "Not enough gold" : undefined,
        });
      }
    }

    return actions;
  }

  private getEnemyCanAttackActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const actions: ActionGridItem[] = [];
    const troops = Number(myPlayer.troops());
    const owner = game.owner(tile);
    const targetPlayer = owner.isPlayer() ? (owner as PlayerView) : null;

    // Ground attack (high priority)
    actions.push({
      id: "attack:ground",
      icon: "🪖",
      label: "Ground Attack",
      disabled: troops === 0,
      disabledReason: troops === 0 ? "No troops" : undefined,
      priority: "high",
    });

    // Air attacks (if airfield exists)
    const hasAirfield = this.playerHasAirfield(myPlayer);
    if (hasAirfield) {
      // Paratroopers
      actions.push({
        id: "attack:airstrike",
        icon: "🪂",
        label: "Paratroopers",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
      });

      // Bomber run
      actions.push({
        id: "attack:bomber",
        icon: "💣",
        label: "Bomber Run",
      });

      // Fighter Jet air attack (if jet engines researched)
      const hasJetEngines = myPlayer.hasUpgrade(UpgradeType.JetEngines);
      if (hasJetEngines) {
        const jetCost = this.getUnitCost(UnitType.FighterJet, myPlayer);
        const gold = Number(myPlayer.gold());
        actions.push({
          id: `build:${UnitType.FighterJet}`,
          icon: "🛩️",
          label: "Fighter Jet",
          cost: jetCost,
          disabled: gold < jetCost,
          disabledReason: gold < jetCost ? "Not enough gold" : undefined,
        });
      }
    }

    return actions;
  }

  private getEnemyCanBoatAttackActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const actions: ActionGridItem[] = [];
    const troops = Number(myPlayer.troops());
    const owner = game.owner(tile);
    const targetPlayer = owner.isPlayer() ? (owner as PlayerView) : null;

    // Naval assault (high priority)
    actions.push({
      id: "attack:naval",
      icon: "🚢",
      label: "Naval Assault",
      disabled: troops === 0,
      disabledReason: troops === 0 ? "No troops" : undefined,
      priority: "high",
    });

    // Air attacks (if airfield exists)
    const hasAirfield = this.playerHasAirfield(myPlayer);
    if (hasAirfield) {
      // Paratroopers
      actions.push({
        id: "attack:airstrike",
        icon: "🪂",
        label: "Paratroopers",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
      });

      // Bomber run
      actions.push({
        id: "attack:bomber",
        icon: "💣",
        label: "Bomber Run",
      });
    }

    // Diplomacy actions
    if (targetPlayer) {
      const isAllied = myPlayer.isAlliedWith(targetPlayer);
      const isAtWar = myPlayer.isAtWarWith(targetPlayer);

      if (isAtWar) {
        actions.push({
          id: "diplomacy:request-peace",
          icon: "🕊️",
          label: "Request Peace",
        });
      } else if (isAllied) {
        actions.push({
          id: "diplomacy:break-alliance",
          icon: "💔",
          label: "Break Alliance",
        });
      } else {
        actions.push({
          id: "diplomacy:propose-ally",
          icon: "🤝",
          label: "Propose Alliance",
        });
      }

      if (!isAtWar) {
        actions.push({
          id: "attack:declare-war",
          icon: "⚔️",
          label: "Declare War",
        });
      }
    }

    // Nuclear options (if player has missile silo)
    const gold = Number(myPlayer.gold());
    if (this.canLaunchNuke(myPlayer, "atom")) {
      actions.push({
        id: "attack:nuke-atom",
        icon: "☢️",
        label: "Atom Bomb",
        cost: 5000,
        disabled: gold < 5000,
        disabledReason: gold < 5000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "hbomb")) {
      actions.push({
        id: "attack:nuke-hbomb",
        icon: "💥",
        label: "H-Bomb",
        cost: 15000,
        disabled: gold < 15000,
        disabledReason: gold < 15000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "mirv")) {
      actions.push({
        id: "attack:nuke-mirv",
        icon: "🚀",
        label: "MIRV",
        cost: 50000,
        disabled: gold < 50000,
        disabledReason: gold < 50000 ? "Not enough gold" : undefined,
      });
    }

    return actions;
  }

  private getEnemyNoAttackActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const actions: ActionGridItem[] = [];
    const owner = game.owner(tile);
    const targetPlayer = owner.isPlayer() ? (owner as PlayerView) : null;
    const troops = Number(myPlayer.troops());

    // Air attacks (if airfield exists)
    const hasAirfield = this.playerHasAirfield(myPlayer);
    if (hasAirfield) {
      // Paratroopers
      actions.push({
        id: "attack:airstrike",
        icon: "🪂",
        label: "Paratroopers",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
        priority: "high",
      });

      // Bomber run
      actions.push({
        id: "attack:bomber",
        icon: "💣",
        label: "Bomber Run",
        priority: "high",
      });
    }

    if (targetPlayer) {
      const isAllied = myPlayer.isAlliedWith(targetPlayer);
      const isAtWar = myPlayer.isAtWarWith(targetPlayer);

      if (isAtWar) {
        actions.push({
          id: "diplomacy:request-peace",
          icon: "🕊️",
          label: "Request Peace",
          priority: "high",
        });
      } else if (isAllied) {
        actions.push({
          id: "diplomacy:break-alliance",
          icon: "💔",
          label: "Break Alliance",
        });
      } else {
        actions.push({
          id: "diplomacy:propose-ally",
          icon: "🤝",
          label: "Propose Alliance",
          priority: "high",
        });
      }

      if (!isAtWar) {
        actions.push({
          id: "attack:declare-war",
          icon: "⚔️",
          label: "Declare War",
        });
      }
    }
    // Nuclear options (if player has missile silo)
    const gold = Number(myPlayer.gold());
    if (this.canLaunchNuke(myPlayer, "atom")) {
      actions.push({
        id: "attack:nuke-atom",
        icon: "☢️",
        label: "Atom Bomb",
        cost: 5000,
        disabled: gold < 5000,
        disabledReason: gold < 5000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "hbomb")) {
      actions.push({
        id: "attack:nuke-hbomb",
        icon: "💥",
        label: "H-Bomb",
        cost: 15000,
        disabled: gold < 15000,
        disabledReason: gold < 15000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "mirv")) {
      actions.push({
        id: "attack:nuke-mirv",
        icon: "🚀",
        label: "MIRV",
        cost: 50000,
        disabled: gold < 50000,
        disabledReason: gold < 50000 ? "Not enough gold" : undefined,
      });
    }
    return actions;
  }

  private getNeutralCanAttackActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const actions: ActionGridItem[] = [];
    const troops = Number(myPlayer.troops());
    const gold = Number(myPlayer.gold());
    const isOcean = !game.isLand(tile);

    // Ground attack (for land tiles only - can't attack empty ocean)
    if (!isOcean) {
      actions.push({
        id: "attack:ground",
        icon: "🪖",
        label: "Attack",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
        priority: "high",
      });
    }

    // If ocean tile, show water unit build options (only if port exists)
    if (isOcean) {
      const hasPort = this.playerHasPort(myPlayer);

      if (hasPort) {
        // Warship
        const warshipCost = this.getUnitCost(UnitType.Warship, myPlayer);
        actions.push({
          id: `build:${UnitType.Warship}`,
          icon: "🚢",
          label: "Warship",
          cost: warshipCost,
          disabled: gold < warshipCost,
          disabledReason: gold < warshipCost ? "Not enough gold" : undefined,
          priority: "high",
        });

        // Submarine (only if SubmarineResearch unlocked)
        const hasSubResearch = myPlayer.hasUpgrade(
          UpgradeType.SubmarineResearch,
        );
        if (hasSubResearch) {
          const submarineCost = this.getUnitCost(UnitType.Submarine, myPlayer);
          actions.push({
            id: `build:${UnitType.Submarine}`,
            icon: "🔱",
            label: "Submarine",
            cost: submarineCost,
            disabled: gold < submarineCost,
            disabledReason:
              gold < submarineCost ? "Not enough gold" : undefined,
            priority: "high",
          });
        }
      }

      // Fighter Jet (only if airfield and jet engines)
      const hasAirfield = this.playerHasAirfield(myPlayer);
      if (hasAirfield) {
        const hasJetEngines = myPlayer.hasUpgrade(UpgradeType.JetEngines);
        if (hasJetEngines) {
          const jetCost = this.getUnitCost(UnitType.FighterJet, myPlayer);
          actions.push({
            id: `build:${UnitType.FighterJet}`,
            icon: "🛩️",
            label: "Fighter Jet",
            cost: jetCost,
            disabled: gold < jetCost,
            disabledReason: gold < jetCost ? "Not enough gold" : undefined,
          });
        }
      }
    }

    return actions;
  }

  private getNeutralCanBoatAttackActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const troops = Number(myPlayer.troops());

    return [
      {
        id: "attack:naval",
        icon: "🚢",
        label: "Naval Assault",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
        priority: "high",
      },
    ];
  }

  private getUnitCost(unitType: UnitType, myPlayer: PlayerView): number {
    if (!this.game) return 0;

    const player = myPlayer as any;
    const base = this.game.config().unitInfo(unitType).cost(player);

    if (isStackableStructure(unitType)) {
      const stackCount =
        typeof player.unitsOwned === "function"
          ? player.unitsOwned(unitType) + 1
          : 1;
      const structureCost =
        stackCount <= 1
          ? base
          : aggregateStructureBuildCost(
              this.game.config(),
              player,
              unitType,
              stackCount,
              this.game.config().structureUpgradeCostMultiplier(unitType),
            );
      return Number(structureCost);
    }

    if (isUpgradeableUnit(unitType)) {
      const techLevel = playerMaxUnitLevel(player, unitType);
      if (techLevel <= 1) return Number(base);
      return Number(
        aggregateStructureBuildCost(
          this.game.config(),
          player,
          unitType,
          techLevel,
          0,
        ),
      );
    }

    return Number(base);
  }

  private getUpgradeRequirementText(upgrade: UpgradeType): string {
    switch (upgrade) {
      case UpgradeType.HospitalResearch:
        return "Requires Hospital Research";
      case UpgradeType.NuclearFission:
        return "Requires Nuclear Fission";
      case UpgradeType.ResearchLabResearch:
        return "Requires Research Lab Research";
      case UpgradeType.SAMLevel1:
        return "Requires SAM Research";
      case UpgradeType.DoomsdayDeviceResearch:
        return "Requires Doomsday Research";
      case UpgradeType.SubmarineResearch:
        return "Requires Submarine Research";
      case UpgradeType.JetEngines:
        return "Requires Jet Engines";
      default:
        return "Locked";
    }
  }

  private playerHasPort(myPlayer: PlayerView): boolean {
    return myPlayer.unitsOwned(UnitType.Port) > 0;
  }

  private playerHasAirfield(myPlayer: PlayerView): boolean {
    return myPlayer.unitsOwned(UnitType.Airfield) > 0;
  }

  private canLaunchNuke(
    myPlayer: PlayerView,
    nukeType: "atom" | "hbomb" | "mirv",
  ): boolean {
    if (!this.game) return false;

    const silos = myPlayer.unitsOwned(UnitType.MissileSilo);
    if (silos === 0) return false; // No silos

    const gold = Number(myPlayer.gold());
    const cost =
      nukeType === "atom" ? 5000 : nukeType === "hbomb" ? 15000 : 50000;
    if (gold < cost) return false; // Can't afford

    // Check research requirements
    if (nukeType === "atom") {
      if (!myPlayer.hasUpgrade(UpgradeType.NuclearFission)) return false;
    } else if (nukeType === "hbomb") {
      if (!myPlayer.hasUpgrade(UpgradeType.ThermonuclearStaging)) return false;
    } else if (nukeType === "mirv") {
      if (!myPlayer.hasUpgrade(UpgradeType.MIRVTechnology)) return false;
    }

    return true;
  }
}
