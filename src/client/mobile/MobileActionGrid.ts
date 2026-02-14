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
import { getActionIcon, getUnitIcon } from "./utils/Icons";

export interface ActionGridItem {
  id: string;
  icon: string;
  label: string;
  cost?: number;
  disabled?: boolean;
  disabledReason?: string;
  locked?: boolean;
  lockedReason?: string;
  priority?: "high" | "normal"; // High priority = shown first
  columnSpan?: number; // Dynamically calculated percentage width for perfect grid filling
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
  @property({ type: Boolean, reflect: true }) ready: boolean = false; // Items calculated and ready to show
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
      z-index: 2000;
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
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      max-height: 60vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    :host([ready]) .grid {
      opacity: 1;
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
      flex: 0 0 auto;
      width: var(--item-width);
      box-sizing: border-box;
    }

    /* Category Colors */
    .action-tile.cat-spawn {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.35);
    }

    .action-tile.cat-infrastructure {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.35);
    }

    .action-tile.cat-military {
      background: rgba(139, 92, 246, 0.15);
      border-color: rgba(139, 92, 246, 0.35);
    }

    .action-tile.cat-combat {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.35);
    }

    .action-tile.cat-nuclear {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.35);
    }

    .action-tile.cat-diplomacy {
      background: rgba(20, 184, 166, 0.15);
      border-color: rgba(20, 184, 166, 0.35);
    }

    .action-tile.cat-diplomacy-war {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.35);
    }

    .action-tile.cat-diplomacy-peace {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .action-tile.cat-diplomacy-alliance {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.35);
    }

    /* Expanded tiles (2+ column span) */
    .action-tile.multi-column {
      min-height: 85px;
    }

    .action-tile.multi-column.cat-spawn {
      background: rgba(34, 197, 94, 0.25);
      border-color: rgba(34, 197, 94, 0.5);
    }

    .action-tile.multi-column.cat-infrastructure {
      background: rgba(59, 130, 246, 0.25);
      border-color: rgba(59, 130, 246, 0.5);
    }

    .action-tile.multi-column.cat-military {
      background: rgba(139, 92, 246, 0.25);
      border-color: rgba(139, 92, 246, 0.5);
    }

    .action-tile.multi-column.cat-combat {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.5);
    }

    .action-tile.multi-column.cat-nuclear {
      background: rgba(245, 158, 11, 0.25);
      border-color: rgba(245, 158, 11, 0.5);
    }

    .action-tile.multi-column.cat-diplomacy {
      background: rgba(20, 184, 166, 0.25);
      border-color: rgba(20, 184, 166, 0.5);
    }

    .action-tile.multi-column.cat-diplomacy-war {
      background: rgba(245, 158, 11, 0.25);
      border-color: rgba(245, 158, 11, 0.5);
    }

    .action-tile.multi-column.cat-diplomacy-peace {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.45);
    }

    .action-tile.multi-column.cat-diplomacy-alliance {
      background: rgba(34, 197, 94, 0.25);
      border-color: rgba(34, 197, 94, 0.5);
    }

    .action-tile:active {
      transform: scale(0.95);
    }

    .action-tile.cat-spawn:active {
      background: rgba(34, 197, 94, 0.3);
    }

    .action-tile.cat-infrastructure:active {
      background: rgba(59, 130, 246, 0.3);
    }

    .action-tile.cat-military:active {
      background: rgba(139, 92, 246, 0.3);
    }

    .action-tile.cat-combat:active {
      background: rgba(239, 68, 68, 0.3);
    }

    .action-tile.cat-nuclear:active {
      background: rgba(245, 158, 11, 0.3);
    }

    .action-tile.cat-diplomacy:active {
      background: rgba(20, 184, 166, 0.3);
    }

    .action-tile.cat-diplomacy-war:active {
      background: rgba(245, 158, 11, 0.3);
    }

    .action-tile.cat-diplomacy-peace:active {
      background: rgba(255, 255, 255, 0.25);
    }

    .action-tile.cat-diplomacy-alliance:active {
      background: rgba(34, 197, 94, 0.3);
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
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
    }

    .action-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: brightness(1.1);
    }

    .action-tile.multi-column .action-icon {
      font-size: 32px;
      width: 36px;
      height: 36px;
    }

    .action-label {
      color: rgba(255, 255, 255, 0.95);
      font-size: 11px;
      text-align: center;
      font-weight: 500;
      line-height: 1.2;
    }

    .action-tile.multi-column .action-label {
      font-size: 13px;
      font-weight: 600;
    }

    .action-cost {
      color: rgba(251, 191, 36, 0.9);
      font-size: 10px;
      font-weight: 600;
    }

    .action-tile.multi-column .action-cost {
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
    const category = this.getActionCategory(item.id);
    const itemWidth = item.columnSpan ?? 1;
    const classes = [
      "action-tile",
      category ? `cat-${category}` : "",
      itemWidth > 1 ? "multi-column" : "",
      item.disabled ? "disabled" : "",
      item.locked ? "locked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Render icon as image if it's a path, otherwise as text/emoji
    const iconHtml = item.icon.startsWith("/")
      ? html`<img src="${item.icon}" alt="${item.label}" />`
      : item.icon;

    return html`
      <div
        class=${classes}
        style="--item-width: ${itemWidth}%"
        @click=${() => this.handleActionClick(item)}
      >
        <div class="action-icon">${iconHtml}</div>
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

    // Clear old items immediately to prevent flicker
    this.items = [];
    this.ready = false;
    this.visible = true;
    this.lastOpenedTime = Date.now();

    // Wait for grid container to render and establish layout
    await this.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Now calculate with accurate grid dimensions
    const columns = this.calculateColumns();

    // Fast path for spawn phase - no async needed
    if (game.inSpawnPhase()) {
      const myPlayer = game.myPlayer();
      if (myPlayer) {
        const actions = this.getSpawnActions(tile, game, myPlayer);
        this.items = this.processItemsForGrid(actions, columns);
        this.ready = true;
        this.requestUpdate();
      }
      return;
    }

    const category = await this.determineTileCategory(tile, game);
    const actions = await this.getActionsForCategory(category, tile, game);
    this.items = this.processItemsForGrid(actions, columns);
    this.ready = true;
    this.requestUpdate();
  }

  /**
   * Close the action grid
   */
  close(): void {
    this.visible = false;
    this.ready = false;
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
          icon: getActionIcon("spawn"),
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

    // Check if there's nearby owned ocean shore for port placement
    const nearbyShore = Array.from(
      game.bfs(tile, (gm, t) => game.manhattanDist(tile, t) <= 10),
    ).some((t) => game.owner(t) === myPlayer && game.isOceanShore(t));

    if (nearbyShore) {
      const portCost = this.getUnitCost(UnitType.Port, myPlayer);
      actions.push({
        id: `build:${UnitType.Port}`,
        icon: getUnitIcon(UnitType.Port) ?? "⚓",
        label: "Port",
        cost: portCost,
        disabled: gold < portCost,
        disabledReason: gold < portCost ? "Not enough gold" : undefined,
        priority: "high",
      });
    }

    // All land structures
    const landStructures = [
      {
        type: UnitType.City,
        icon: getUnitIcon(UnitType.City) ?? "🏙️",
        label: "City",
        priority: "high" as const,
      },
      {
        type: UnitType.Factory,
        icon: getUnitIcon(UnitType.Factory) ?? "🏭",
        label: "Factory",
        priority: "high" as const,
      },
      {
        type: UnitType.DefensePost,
        icon: getUnitIcon(UnitType.DefensePost) ?? "🛡️",
        label: "Defense Post",
      },
      {
        type: UnitType.Airfield,
        icon: getUnitIcon(UnitType.Airfield) ?? "✈️",
        label: "Airfield",
        priority: "high" as const,
      },
      {
        type: UnitType.Hospital,
        icon: getUnitIcon(UnitType.Hospital) ?? "🏥",
        label: "Hospital",
        upgrade: UpgradeType.HospitalResearch,
      },
      {
        type: UnitType.MissileSilo,
        icon: getUnitIcon(UnitType.MissileSilo) ?? "⚛️",
        label: "Missile Silo",
        upgrade: UpgradeType.NuclearFission,
      },
      {
        type: UnitType.ResearchLab,
        icon: getUnitIcon(UnitType.ResearchLab) ?? "🔬",
        label: "Research Lab",
      },
      {
        type: UnitType.Academy,
        icon: getUnitIcon(UnitType.Academy) ?? "🏛️",
        label: "Academy",
      },
      {
        type: UnitType.SAMLauncher,
        icon: getUnitIcon(UnitType.SAMLauncher) ?? "🎯",
        label: "SAM Launcher",
      },
      {
        type: UnitType.DoomsdayDevice,
        icon: getUnitIcon(UnitType.DoomsdayDevice) ?? "💀",
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

    // Artillery (only if factory and artillery research)
    const hasFactory = this.playerHasFactory(myPlayer);
    if (hasFactory) {
      const hasArtilleryResearch = myPlayer.hasUpgrade(
        UpgradeType.ArtilleryResearch,
      );
      if (hasArtilleryResearch) {
        const artilleryCost = this.getUnitCost(UnitType.Artillery, myPlayer);
        actions.push({
          id: `build:${UnitType.Artillery}`,
          icon:
            getUnitIcon(UnitType.Artillery) ?? getActionIcon("artilleryAttack"),
          label: "Artillery",
          cost: artilleryCost,
          disabled: gold < artilleryCost,
          disabledReason: gold < artilleryCost ? "Not enough gold" : undefined,
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
          icon: getUnitIcon(UnitType.FighterJet) ?? getActionIcon("airAttack"),
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
    // Shore is also land - use regular land actions (which already includes port if shore nearby)
    return this.getOwnLandActions(tile, game, myPlayer);
  }

  private getOwnWaterActions(
    tile: TileRef,
    game: GameView,
    myPlayer: PlayerView,
  ): ActionGridItem[] {
    const gold = Number(myPlayer.gold());
    const actions: ActionGridItem[] = [];

    // Check if there's nearby owned shore for port placement
    const nearbyShore = Array.from(
      game.bfs(tile, (gm, t) => game.manhattanDist(tile, t) <= 10),
    ).some((t) => game.owner(t) === myPlayer && game.isOceanShore(t));

    if (nearbyShore) {
      const portCost = this.getUnitCost(UnitType.Port, myPlayer);
      actions.push({
        id: `build:${UnitType.Port}`,
        icon: getUnitIcon(UnitType.Port) ?? "⚓",
        label: "Port",
        cost: portCost,
        disabled: gold < portCost,
        disabledReason: gold < portCost ? "Not enough gold" : undefined,
        priority: "high",
      });
    }

    // Check if player has a port (required for water units)
    const hasPort = this.playerHasPort(myPlayer);

    // Only show water units if port exists
    if (hasPort) {
      // Warship
      const warshipCost = this.getUnitCost(UnitType.Warship, myPlayer);
      actions.push({
        id: `build:${UnitType.Warship}`,
        icon: getUnitIcon(UnitType.Warship) ?? getActionIcon("navyAssault"),
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
          icon: getUnitIcon(UnitType.Submarine) ?? getActionIcon("submarine"),
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
          icon: getUnitIcon(UnitType.FighterJet) ?? getActionIcon("airAttack"),
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
      icon: getActionIcon("attack"),
      label: "Ground Attack",
      disabled: troops === 0,
      disabledReason: troops === 0 ? "No troops" : undefined,
      priority: "high",
    });

    // Air attacks (if airfield exists)
    const hasAirfield = this.playerHasAirfield(myPlayer);
    const hasJetEngines = myPlayer.hasUpgrade(UpgradeType.JetEngines);
    const isAtWar = targetPlayer ? myPlayer.isAtWarWith(targetPlayer) : false;

    if (hasAirfield && hasJetEngines) {
      // Paratroopers (requires JetEngines)
      actions.push({
        id: "attack:airstrike",
        icon: getActionIcon("paratrooper"),
        label: "Paratroopers",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
      });
    }

    if (hasAirfield && isAtWar) {
      // Bomber run (requires war declaration)
      actions.push({
        id: "attack:bomber",
        icon: getActionIcon("bomber"),
        label: "Bomber Run",
      });
    }

    // Fighter Jet (only if airfield and jet engines)
    if (hasAirfield && hasJetEngines) {
      const jetCost = this.getUnitCost(UnitType.FighterJet, myPlayer);
      const gold = Number(myPlayer.gold());
      actions.push({
        id: `build:${UnitType.FighterJet}`,
        icon: getUnitIcon(UnitType.FighterJet) ?? getActionIcon("airAttack"),
        label: "Fighter Jet",
        cost: jetCost,
        disabled: gold < jetCost,
        disabledReason: gold < jetCost ? "Not enough gold" : undefined,
      });
    }

    // Diplomacy actions
    if (targetPlayer) {
      const isAllied = myPlayer.isAlliedWith(targetPlayer);
      const isAtWar = myPlayer.isAtWarWith(targetPlayer);

      if (isAtWar) {
        actions.push({
          id: "diplomacy:request-peace",
          icon: getActionIcon("peace"),
          label: "Request Peace",
        });
      } else if (isAllied) {
        actions.push({
          id: "diplomacy:break-alliance",
          icon: getActionIcon("breakAlliance"),
          label: "Break Alliance",
        });
      } else {
        actions.push({
          id: "diplomacy:propose-ally",
          icon: getActionIcon("alliance"),
          label: "Propose Alliance",
        });
      }

      if (!isAtWar) {
        actions.push({
          id: "attack:declare-war",
          icon: getActionIcon("declareWar"),
          label: "Declare War",
        });
      }
    }

    // Nuclear options (if player has missile silo)
    const gold = Number(myPlayer.gold());
    if (this.canLaunchNuke(myPlayer, "atom")) {
      actions.push({
        id: "attack:nuke-atom",
        icon: getActionIcon("atomBomb"),
        label: "Atom Bomb",
        cost: 5000,
        disabled: gold < 5000,
        disabledReason: gold < 5000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "hbomb")) {
      actions.push({
        id: "attack:nuke-hbomb",
        icon: getActionIcon("hBomb"),
        label: "H-Bomb",
        cost: 15000,
        disabled: gold < 15000,
        disabledReason: gold < 15000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "mirv")) {
      actions.push({
        id: "attack:nuke-mirv",
        icon: getActionIcon("mirv"),
        label: "MIRV",
        cost: 50000,
        disabled: gold < 50000,
        disabledReason: gold < 50000 ? "Not enough gold" : undefined,
      });
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
      icon: getActionIcon("navyAssault"),
      label: "Naval Assault",
      disabled: troops === 0,
      disabledReason: troops === 0 ? "No troops" : undefined,
      priority: "high",
    });

    // Air attacks (if airfield exists)
    const hasAirfield = this.playerHasAirfield(myPlayer);
    const hasJetEngines = myPlayer.hasUpgrade(UpgradeType.JetEngines);
    const isAtWar = targetPlayer ? myPlayer.isAtWarWith(targetPlayer) : false;

    if (hasAirfield && hasJetEngines) {
      // Paratroopers (requires JetEngines)
      actions.push({
        id: "attack:airstrike",
        icon: getActionIcon("paratrooper"),
        label: "Paratroopers",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
      });
    }

    if (hasAirfield && isAtWar) {
      // Bomber run (requires war declaration)
      actions.push({
        id: "attack:bomber",
        icon: getActionIcon("bomber"),
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
          icon: getActionIcon("peace"),
          label: "Request Peace",
        });
      } else if (isAllied) {
        actions.push({
          id: "diplomacy:break-alliance",
          icon: getActionIcon("breakAlliance"),
          label: "Break Alliance",
        });
      } else {
        actions.push({
          id: "diplomacy:propose-ally",
          icon: getActionIcon("alliance"),
          label: "Propose Alliance",
        });
      }

      if (!isAtWar) {
        actions.push({
          id: "attack:declare-war",
          icon: getActionIcon("declareWar"),
          label: "Declare War",
        });
      }
    }

    // Nuclear options (if player has missile silo)
    const gold = Number(myPlayer.gold());
    if (this.canLaunchNuke(myPlayer, "atom")) {
      actions.push({
        id: "attack:nuke-atom",
        icon: getActionIcon("atomBomb"),
        label: "Atom Bomb",
        cost: 5000,
        disabled: gold < 5000,
        disabledReason: gold < 5000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "hbomb")) {
      actions.push({
        id: "attack:nuke-hbomb",
        icon: getActionIcon("hBomb"),
        label: "H-Bomb",
        cost: 15000,
        disabled: gold < 15000,
        disabledReason: gold < 15000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "mirv")) {
      actions.push({
        id: "attack:nuke-mirv",
        icon: getActionIcon("mirv"),
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
    const hasJetEngines = myPlayer.hasUpgrade(UpgradeType.JetEngines);
    const isAtWar = targetPlayer ? myPlayer.isAtWarWith(targetPlayer) : false;

    if (hasAirfield && hasJetEngines) {
      // Paratroopers (requires JetEngines)
      actions.push({
        id: "attack:airstrike",
        icon: getActionIcon("paratrooper"),
        label: "Paratroopers",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
        priority: "high",
      });
    }

    if (hasAirfield && isAtWar) {
      // Bomber run (requires war declaration)
      actions.push({
        id: "attack:bomber",
        icon: getActionIcon("bomber"),
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
          icon: getActionIcon("peace"),
          label: "Request Peace",
          priority: "high",
        });
      } else if (isAllied) {
        actions.push({
          id: "diplomacy:break-alliance",
          icon: getActionIcon("breakAlliance"),
          label: "Break Alliance",
        });
      } else {
        actions.push({
          id: "diplomacy:propose-ally",
          icon: getActionIcon("alliance"),
          label: "Propose Alliance",
          priority: "high",
        });
      }

      if (!isAtWar) {
        actions.push({
          id: "attack:declare-war",
          icon: getActionIcon("declareWar"),
          label: "Declare War",
        });
      }
    }
    // Nuclear options (if player has missile silo)
    const gold = Number(myPlayer.gold());
    if (this.canLaunchNuke(myPlayer, "atom")) {
      actions.push({
        id: "attack:nuke-atom",
        icon: getActionIcon("atomBomb"),
        label: "Atom Bomb",
        cost: 5000,
        disabled: gold < 5000,
        disabledReason: gold < 5000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "hbomb")) {
      actions.push({
        id: "attack:nuke-hbomb",
        icon: getActionIcon("hBomb"),
        label: "H-Bomb",
        cost: 15000,
        disabled: gold < 15000,
        disabledReason: gold < 15000 ? "Not enough gold" : undefined,
      });
    }

    if (this.canLaunchNuke(myPlayer, "mirv")) {
      actions.push({
        id: "attack:nuke-mirv",
        icon: getActionIcon("mirv"),
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
        icon: getActionIcon("attack"),
        label: "Attack",
        disabled: troops === 0,
        disabledReason: troops === 0 ? "No troops" : undefined,
        priority: "high",
      });
    }

    // If ocean tile, check for port building and water units
    if (isOcean) {
      // Check if there's nearby owned shore for port placement
      const nearbyShore = Array.from(
        game.bfs(tile, (gm, t) => game.manhattanDist(tile, t) <= 10),
      ).some((t) => game.owner(t) === myPlayer && game.isOceanShore(t));

      if (nearbyShore) {
        const portCost = this.getUnitCost(UnitType.Port, myPlayer);
        actions.push({
          id: `build:${UnitType.Port}`,
          icon: getUnitIcon(UnitType.Port) ?? "⚓",
          label: "Port",
          cost: portCost,
          disabled: gold < portCost,
          disabledReason: gold < portCost ? "Not enough gold" : undefined,
          priority: "high",
        });
      }

      const hasPort = this.playerHasPort(myPlayer);

      if (hasPort) {
        // Warship
        const warshipCost = this.getUnitCost(UnitType.Warship, myPlayer);
        actions.push({
          id: `build:${UnitType.Warship}`,
          icon: getUnitIcon(UnitType.Warship) ?? getActionIcon("navyAssault"),
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
            icon: getUnitIcon(UnitType.Submarine) ?? getActionIcon("submarine"),
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
            icon:
              getUnitIcon(UnitType.FighterJet) ?? getActionIcon("airAttack"),
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
        icon: getActionIcon("navyAssault"),
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
    // Only count completed ports, not ports under construction
    return myPlayer.units(UnitType.Port).length > 0;
  }

  private playerHasAirfield(myPlayer: PlayerView): boolean {
    // Only count completed airfields, not airfields under construction
    return myPlayer.units(UnitType.Airfield).length > 0;
  }

  private playerHasFactory(myPlayer: PlayerView): boolean {
    // Only count completed factories, not factories under construction
    return myPlayer.units(UnitType.Factory).length > 0;
  }

  private canLaunchNuke(
    myPlayer: PlayerView,
    nukeType: "atom" | "hbomb" | "mirv",
  ): boolean {
    if (!this.game) return false;

    // Only count completed missile silos, not silos under construction
    const silos = myPlayer.units(UnitType.MissileSilo).length;
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

  /**
   * Calculate actual number of columns based on container width
   * CSS: repeat(auto-fill, minmax(65px, 1fr)) with 8px gap
   */
  private calculateColumns(): number {
    const gridElement = this.shadowRoot?.querySelector(".grid") as HTMLElement;
    if (!gridElement) {
      return 5; // Fallback if grid not rendered yet
    }

    const width = gridElement.clientWidth;
    const minColumnWidth = 65; // From CSS minmax
    const gap = 8; // From CSS gap

    // Calculate: how many columns fit?
    // Formula: (width + gap) / (minColumnWidth + gap)
    const columns = Math.floor((width + gap) / (minColumnWidth + gap));
    return Math.max(1, columns); // At least 1 column
  }

  /**
   * Process items for grid display:
   * 1. Sort high priority first
   * 2. Fill grid naturally
   * 3. If top row is incomplete, expand top row items to fill it completely
   *
   * Uses percentage widths for perfect fractional precision (e.g., 2.5 columns = 50%)
   */
  private processItemsForGrid(
    items: ActionGridItem[],
    columns: number,
  ): ActionGridItem[] {
    // Sort: high priority first, then normal
    const sorted = [...items].sort((a, b) => {
      const aPriority = a.priority === "high" ? 1 : 0;
      const bPriority = b.priority === "high" ? 1 : 0;
      return bPriority - aPriority;
    });

    const totalItems = sorted.length;
    const remainder = totalItems % columns;

    // Calculate single column percentage (accounts for gap)
    const gap = 8; // Must match CSS gap
    const gapPercent = (gap / this.getGridWidth()) * 100;
    const singleColPercent = (100 - gapPercent * (columns - 1)) / columns;

    // If perfectly divisible, all items are single column
    if (remainder === 0) {
      return sorted.map((item) => ({
        ...item,
        columnSpan: singleColPercent,
      }));
    }

    // Top row has `remainder` items that need to fill all columns
    // Each gets: (columns / remainder) columns worth of space
    const topRowColSpan = columns / remainder;
    const topRowPercent =
      topRowColSpan * singleColPercent + (topRowColSpan - 1) * gapPercent;

    return sorted.map((item, index) => {
      if (index < remainder) {
        // Top row item - expanded to fill row evenly
        return { ...item, columnSpan: topRowPercent };
      } else {
        // Normal row item - single column
        return { ...item, columnSpan: singleColPercent };
      }
    });
  }

  /**
   * Get grid container width for percentage calculations
   */
  private getGridWidth(): number {
    const gridElement = this.shadowRoot?.querySelector(".grid") as HTMLElement;
    return gridElement?.clientWidth || 390; // Fallback to typical mobile width
  }

  /**
   * Determine the category of an action based on its ID
   * Used for color-coding action tiles
   */
  private getActionCategory(
    actionId: string,
  ):
    | "spawn"
    | "infrastructure"
    | "military"
    | "combat"
    | "nuclear"
    | "diplomacy"
    | "diplomacy-war"
    | "diplomacy-peace"
    | "diplomacy-alliance"
    | null {
    // Spawn
    if (actionId === "spawn") return "spawn";

    // Infrastructure & Buildings
    if (actionId.startsWith("build:")) {
      const unitType = actionId.replace("build:", "");
      // Military units
      if (
        unitType === UnitType.Artillery ||
        unitType === UnitType.Warship ||
        unitType === UnitType.Submarine ||
        unitType === UnitType.FighterJet
      ) {
        return "military";
      }
      // Everything else is infrastructure
      return "infrastructure";
    }

    // Diplomacy - specific actions
    if (actionId === "diplomacy:request-peace") {
      return "diplomacy-peace";
    }
    if (actionId === "diplomacy:propose-ally") {
      return "diplomacy-alliance";
    }
    if (
      actionId === "diplomacy:break-alliance" ||
      actionId === "attack:declare-war"
    ) {
      return "diplomacy-war";
    }

    // Generic diplomacy fallback
    if (actionId.startsWith("diplomacy:")) {
      return "diplomacy";
    }

    // Combat Actions
    if (actionId.startsWith("attack:")) {
      // Nuclear weapons
      if (actionId.includes("nuke")) {
        return "nuclear";
      }
      // Regular combat
      return "combat";
    }

    return null;
  }
}
