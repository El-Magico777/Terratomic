/**
 * MobileBuildPopup - Build menu for mobile (land/shore/water structures and units)
 * Shows context-appropriate build options based on selected tile type
 */

import { customElement, property } from "lit/decorators.js";
import {
  aggregateStructureBuildCost,
  computeBomberUpgradeCost,
} from "../../../core/game/Costs";
import { UnitType, UpgradeType } from "../../../core/game/Game";
import type { TileRef } from "../../../core/game/GameMap";
import type { GameView } from "../../../core/game/GameView";
import {
  isStackableStructure,
  isUpgradeableUnit,
  playerMaxUnitLevel,
} from "../../../core/game/Upgradeables";
import { MobileBasePopup, type PopupMenuItem } from "./MobileBasePopup";

export type BuildCategory = "land" | "shore" | "water";

@customElement("mobile-build-popup")
export class MobileBuildPopup extends MobileBasePopup {
  @property({ type: Object }) tile: TileRef | null = null;
  @property({ type: Object }) game: GameView | null = null;
  @property({ type: String }) category: BuildCategory = "land";

  /**
   * Open the build popup for a specific tile
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

  private determineTileCategory(tile: TileRef, game: GameView): BuildCategory {
    const isWater = !game.isLand(tile);
    if (isWater) return "water";

    // Check if shore using game's built-in shoreline detection
    if (game.isShoreline(tile)) return "shore";

    // Fallback: check if land with adjacent water
    const neighbors = game.neighbors(tile);
    const hasAdjacentWater = Array.from(neighbors).some((n) => !game.isLand(n));
    if (hasAdjacentWater) return "shore";

    return "land";
  }

  private getTitle(): string {
    switch (this.category) {
      case "water":
        return "🌊 Build on Water";
      case "shore":
        return "⚓ Build on Shore";
      case "land":
      default:
        return "🏗️ Build";
    }
  }

  private getMenuItems(): PopupMenuItem[] {
    if (!this.game || !this.tile) return [];

    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return [];

    const gold = Number(myPlayer.gold());

    if (this.category === "land") {
      return this.getLandStructures(gold, myPlayer);
    } else if (this.category === "shore") {
      return this.getShoreStructures(gold, myPlayer);
    } else {
      return this.getWaterUnits(gold, myPlayer);
    }
  }

  private getLandStructures(gold: number, myPlayer: any): PopupMenuItem[] {
    const items: PopupMenuItem[] = [
      {
        icon: "🏙️",
        label: "City",
        cost: this.getUnitCost(UnitType.City, myPlayer),
        action: `build:${UnitType.City}`,
        disabled: gold < this.getUnitCost(UnitType.City, myPlayer),
        disabledReason:
          gold < this.getUnitCost(UnitType.City, myPlayer)
            ? "Insufficient gold"
            : undefined,
      },
      {
        icon: "🏥",
        label: "Hospital",
        cost: this.getUnitCost(UnitType.Hospital, myPlayer),
        action: `build:${UnitType.Hospital}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.HospitalResearch),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.HospitalResearch)
          ? "Unlock: Hospital Research"
          : undefined,
        disabled: gold < this.getUnitCost(UnitType.Hospital, myPlayer),
      },
      {
        icon: "🏭",
        label: "Factory",
        cost: this.getUnitCost(UnitType.Factory, myPlayer),
        action: `build:${UnitType.Factory}`,
        disabled: gold < this.getUnitCost(UnitType.Factory, myPlayer),
      },
      {
        icon: "🛡️",
        label: "Defense Post",
        cost: this.getUnitCost(UnitType.DefensePost, myPlayer),
        action: `build:${UnitType.DefensePost}`,
        disabled: gold < this.getUnitCost(UnitType.DefensePost, myPlayer),
      },
      {
        icon: "⚛️",
        label: "Missile Silo",
        cost: this.getUnitCost(UnitType.MissileSilo, myPlayer),
        action: `build:${UnitType.MissileSilo}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.NuclearFission),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.NuclearFission)
          ? "Unlock: Nuclear Fission"
          : undefined,
        disabled: gold < this.getUnitCost(UnitType.MissileSilo, myPlayer),
      },
      {
        icon: "✈️",
        label: "Airfield",
        cost: this.getUnitCost(UnitType.Airfield, myPlayer),
        action: `build:${UnitType.Airfield}`,
        disabled: gold < this.getUnitCost(UnitType.Airfield, myPlayer),
      },
      {
        icon: "🔬",
        label: "Research Lab",
        cost: this.getUnitCost(UnitType.ResearchLab, myPlayer),
        action: `build:${UnitType.ResearchLab}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.ResearchLabResearch),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.ResearchLabResearch)
          ? "Unlock: Research Lab"
          : undefined,
        disabled: gold < this.getUnitCost(UnitType.ResearchLab, myPlayer),
      },
      {
        icon: "🏛️",
        label: "Academy",
        cost: this.getUnitCost(UnitType.Academy, myPlayer),
        action: `build:${UnitType.Academy}`,
        disabled: gold < this.getUnitCost(UnitType.Academy, myPlayer),
      },
      {
        icon: "🎯",
        label: "SAM Launcher",
        cost: this.getUnitCost(UnitType.SAMLauncher, myPlayer),
        action: `build:${UnitType.SAMLauncher}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.SAMLevel1),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.SAMLevel1)
          ? "Unlock: Surface-to-Air Missiles"
          : undefined,
        disabled: gold < this.getUnitCost(UnitType.SAMLauncher, myPlayer),
      },
      {
        icon: "💀",
        label: "Doomsday Device",
        cost: this.getUnitCost(UnitType.DoomsdayDevice, myPlayer),
        action: `build:${UnitType.DoomsdayDevice}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.DoomsdayDeviceResearch),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.DoomsdayDeviceResearch)
          ? "Unlock: Doomsday Device"
          : undefined,
        disabled: gold < this.getUnitCost(UnitType.DoomsdayDevice, myPlayer),
      },
    ];

    return items;
  }

  private getShoreStructures(gold: number, myPlayer: any): PopupMenuItem[] {
    const items: PopupMenuItem[] = [
      {
        icon: "⚓",
        label: "Port",
        cost: this.getUnitCost(UnitType.Port, myPlayer),
        action: `build:${UnitType.Port}`,
        disabled: gold < this.getUnitCost(UnitType.Port, myPlayer),
        disabledReason:
          gold < this.getUnitCost(UnitType.Port, myPlayer)
            ? "Insufficient gold"
            : undefined,
      },
      ...this.getLandStructures(gold, myPlayer),
    ];

    return items;
  }

  private getWaterUnits(gold: number, myPlayer: any): PopupMenuItem[] {
    const hasPort = myPlayer.units(UnitType.Port).length > 0;
    const hasAirfield = myPlayer.units(UnitType.Airfield).length > 0;

    const items: PopupMenuItem[] = [
      {
        icon: "⛵",
        label: "Warship",
        cost: this.getUnitCost(UnitType.Warship, myPlayer),
        action: `build:${UnitType.Warship}`,
        locked: !hasPort,
        lockedReason: !hasPort ? "Need active Port" : undefined,
        disabled: gold < this.getUnitCost(UnitType.Warship, myPlayer),
      },
      {
        icon: "🚢",
        label: "Submarine",
        cost: this.getUnitCost(UnitType.Submarine, myPlayer),
        action: `build:${UnitType.Submarine}`,
        locked: !hasPort || !myPlayer.hasUpgrade(UpgradeType.SubmarineResearch),
        lockedReason: !hasPort
          ? "Need active Port"
          : !myPlayer.hasUpgrade(UpgradeType.SubmarineResearch)
            ? "Unlock: Submarine Research"
            : undefined,
        disabled: gold < this.getUnitCost(UnitType.Submarine, myPlayer),
      },
      {
        icon: "✈️",
        label: "Fighter Jet",
        cost: this.getUnitCost(UnitType.FighterJet, myPlayer),
        action: `build:${UnitType.FighterJet}`,
        locked: !hasAirfield || !myPlayer.hasUpgrade(UpgradeType.JetEngines),
        lockedReason: !hasAirfield
          ? "Need active Airfield"
          : !myPlayer.hasUpgrade(UpgradeType.JetEngines)
            ? "Unlock: Jet Engines"
            : undefined,
        disabled: gold < this.getUnitCost(UnitType.FighterJet, myPlayer),
      },
    ];

    return items;
  }

  private getUnitCost(unitType: UnitType, player: any): number {
    if (!this.game) return 0;

    const base = this.game.config().unitInfo(unitType).cost(player);

    if (isStackableStructure(unitType)) {
      const stackCount =
        typeof player.unitsOwned === "function"
          ? player.unitsOwned(unitType) + 1
          : 1;
      let structureCost =
        stackCount <= 1
          ? base
          : aggregateStructureBuildCost(
              this.game.config(),
              player,
              unitType,
              stackCount,
              this.game.config().structureUpgradeCostMultiplier(unitType),
            );
      if (unitType === UnitType.Airfield) {
        const bomberLevel = playerMaxUnitLevel(player, UnitType.Bomber);
        structureCost += computeBomberUpgradeCost(
          this.game.config(),
          player,
          bomberLevel,
          stackCount,
        );
      }
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
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-build-popup": MobileBuildPopup;
  }
}
