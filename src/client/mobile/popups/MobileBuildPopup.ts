/**
 * MobileBuildPopup - Build menu for mobile (land/shore/water structures and units)
 * Shows context-appropriate build options based on selected tile type
 */

import { customElement, property } from "lit/decorators.js";
import { UnitType, UpgradeType } from "../../../core/game/Game";
import type { TileRef } from "../../../core/game/GameMap";
import type { GameView } from "../../../core/game/GameView";
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

    // Check if shore (land with adjacent water)
    const neighbors = game.neighbors(tile);
    const hasAdjacentWater = neighbors.some((n) => !game.isLand(n));
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
        cost: 50,
        action: `build:${UnitType.City}`,
        disabled: gold < 50,
        disabledReason: gold < 50 ? "Insufficient gold" : undefined,
      },
      {
        icon: "🏥",
        label: "Hospital",
        cost: 80,
        action: `build:${UnitType.Hospital}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.HospitalResearch),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.HospitalResearch)
          ? "Unlock: Hospital Research"
          : undefined,
        disabled: gold < 80,
      },
      {
        icon: "🏭",
        label: "Factory",
        cost: 120,
        action: `build:${UnitType.Factory}`,
        disabled: gold < 120,
      },
      {
        icon: "🛡️",
        label: "Defense Post",
        cost: 200,
        action: `build:${UnitType.DefensePost}`,
        disabled: gold < 200,
      },
      {
        icon: "⚛️",
        label: "Missile Silo",
        cost: 500,
        action: `build:${UnitType.MissileSilo}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.NuclearFission),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.NuclearFission)
          ? "Unlock: Nuclear Fission"
          : undefined,
        disabled: gold < 500,
      },
      {
        icon: "✈️",
        label: "Airfield",
        cost: 350,
        action: `build:${UnitType.Airfield}`,
        disabled: gold < 350,
      },
      {
        icon: "🔬",
        label: "Research Lab",
        cost: 300,
        action: `build:${UnitType.ResearchLab}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.ResearchLabResearch),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.ResearchLabResearch)
          ? "Unlock: Research Lab"
          : undefined,
        disabled: gold < 300,
      },
      {
        icon: "🏛️",
        label: "Academy",
        cost: 400,
        action: `build:${UnitType.Academy}`,
        disabled: gold < 400,
      },
      {
        icon: "🎯",
        label: "SAM Launcher",
        cost: 280,
        action: `build:${UnitType.SAMLauncher}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.SAMLevel1),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.SAMLevel1)
          ? "Unlock: Surface-to-Air Missiles"
          : undefined,
        disabled: gold < 280,
      },
      {
        icon: "💀",
        label: "Doomsday Device",
        cost: 2000,
        action: `build:${UnitType.DoomsdayDevice}`,
        locked: !myPlayer.hasUpgrade(UpgradeType.DoomsdayDeviceResearch),
        lockedReason: !myPlayer.hasUpgrade(UpgradeType.DoomsdayDeviceResearch)
          ? "Unlock: Doomsday Device"
          : undefined,
        disabled: gold < 2000,
      },
    ];

    return items;
  }

  private getShoreStructures(gold: number, myPlayer: any): PopupMenuItem[] {
    const items: PopupMenuItem[] = [
      ...this.getLandStructures(gold, myPlayer),
      {
        icon: "⚓",
        label: "Port",
        cost: 180,
        action: `build:${UnitType.Port}`,
        disabled: gold < 180,
        disabledReason: gold < 180 ? "Insufficient gold" : undefined,
      },
    ];

    return items;
  }

  private getWaterUnits(gold: number, myPlayer: any): PopupMenuItem[] {
    const hasPort =
      myPlayer
        .structures()
        .filter((s) => s.type() === UnitType.Port && s.isActive()).length > 0;

    const hasAirfield =
      myPlayer
        .structures()
        .filter((s) => s.type() === UnitType.Airfield && s.isActive()).length >
      0;

    const items: PopupMenuItem[] = [
      {
        icon: "⛵",
        label: "Warship",
        cost: 100,
        action: `build:${UnitType.Warship}`,
        locked: !hasPort,
        lockedReason: !hasPort ? "Need active Port" : undefined,
        disabled: gold < 100,
      },
      {
        icon: "🚢",
        label: "Submarine",
        cost: 150,
        action: `build:${UnitType.Submarine}`,
        locked: !hasPort || !myPlayer.hasUpgrade(UpgradeType.SubmarineResearch),
        lockedReason: !hasPort
          ? "Need active Port"
          : !myPlayer.hasUpgrade(UpgradeType.SubmarineResearch)
            ? "Unlock: Submarine Research"
            : undefined,
        disabled: gold < 150,
      },
      {
        icon: "✈️",
        label: "Fighter Jet",
        cost: 40,
        action: `build:${UnitType.FighterJet}`,
        locked: !hasAirfield || !myPlayer.hasUpgrade(UpgradeType.JetEngines),
        lockedReason: !hasAirfield
          ? "Need active Airfield"
          : !myPlayer.hasUpgrade(UpgradeType.JetEngines)
            ? "Unlock: Jet Engines"
            : undefined,
        disabled: gold < 40,
      },
    ];

    return items;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mobile-build-popup": MobileBuildPopup;
  }
}
