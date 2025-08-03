import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import airfieldIcon from "../../../../resources/images/AirfieldIcon.svg";
import warshipIcon from "../../../../resources/images/BattleshipIconWhite.svg";
import academyIcon from "../../../../resources/images/buildings/academy_icon.png";
import cityIcon from "../../../../resources/images/CityIconWhite.svg";
import fighterJetIcon from "../../../../resources/images/FighterJetIcon.svg";
import goldCoinIcon from "../../../../resources/images/GoldCoinIcon.svg";
import hospitalIcon from "../../../../resources/images/HospitalIconWhite.svg";
import mirvIcon from "../../../../resources/images/MIRVIcon.svg";
import missileSiloIcon from "../../../../resources/images/MissileSiloIconWhite.svg";
import hydrogenBombIcon from "../../../../resources/images/MushroomCloudIconWhite.svg";
import atomBombIcon from "../../../../resources/images/NukeIconWhite.svg";
import portIcon from "../../../../resources/images/PortIcon.svg";
import samlauncherIcon from "../../../../resources/images/SamLauncherIconWhite.svg";
import shieldIcon from "../../../../resources/images/ShieldIconWhite.svg";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { Gold, PlayerActions, UnitType } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView } from "../../../core/game/GameView";
import { BuildUnitIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";

interface BuildItemDisplay {
  unitType: UnitType;
  icon: string;
  description?: string;
  key?: string;
  countable?: boolean;
}

const buildTable: BuildItemDisplay[][] = [
  [
    {
      unitType: UnitType.AtomBomb,
      icon: atomBombIcon,
      description: "build_menu.desc.atom_bomb",
      key: "unit_type.atom_bomb",
      countable: false,
    },
    {
      unitType: UnitType.MIRV,
      icon: mirvIcon,
      description: "build_menu.desc.mirv",
      key: "unit_type.mirv",
      countable: false,
    },
    {
      unitType: UnitType.HydrogenBomb,
      icon: hydrogenBombIcon,
      description: "build_menu.desc.hydrogen_bomb",
      key: "unit_type.hydrogen_bomb",
      countable: false,
    },
    {
      unitType: UnitType.Airfield,
      icon: airfieldIcon,
      description: "build_menu.desc.airfield",
      key: "unit_type.airfield",
      countable: true,
    },
    {
      unitType: UnitType.FighterJet,
      icon: fighterJetIcon,
      description: "build_menu.desc.fighter_jet",
      key: "unit_type.fighter_jet",
      countable: true,
    },
    {
      unitType: UnitType.Warship,
      icon: warshipIcon,
      description: "build_menu.desc.warship",
      key: "unit_type.warship",
      countable: true,
    },
    {
      unitType: UnitType.Port,
      icon: portIcon,
      description: "build_menu.desc.port",
      key: "unit_type.port",
      countable: true,
    },
    {
      unitType: UnitType.MissileSilo,
      icon: missileSiloIcon,
      description: "build_menu.desc.missile_silo",
      key: "unit_type.missile_silo",
      countable: true,
    },
    // needs new icon
    {
      unitType: UnitType.SAMLauncher,
      icon: samlauncherIcon,
      description: "build_menu.desc.sam_launcher",
      key: "unit_type.sam_launcher",
      countable: true,
    },
    {
      unitType: UnitType.DefensePost,
      icon: shieldIcon,
      description: "build_menu.desc.defense_post",
      key: "unit_type.defense_post",
      countable: true,
    },
    {
      unitType: UnitType.Hospital,
      icon: hospitalIcon,
      description: "build_menu.desc.hospital",
      key: "unit_type.hospital",
      countable: true,
    },
    {
      unitType: UnitType.Academy,
      icon: academyIcon,
      description: "build_menu.desc.academy",
      key: "unit_type.academy",
      countable: true,
    },
    {
      unitType: UnitType.City,
      icon: cityIcon,
      description: "build_menu.desc.city",
      key: "unit_type.city",
      countable: true,
    },
  ],
];

@customElement("build-menu")
export class BuildMenu extends LitElement {
  constructor() {
    super();
  }

  @property({ type: Object })
  game: GameView;

  @property({ type: Object })
  eventBus: EventBus;

  @property({ type: Object })
  clickedTile: TileRef | null;

  @property({ type: Array })
  unitFilter: UnitType[] | null = null;

  @state()
  private playerActions: PlayerActions | null;

  @state()
  private filteredBuildTable: BuildItemDisplay[][] = buildTable;

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (
      changedProperties.has("clickedTile") ||
      changedProperties.has("unitFilter")
    ) {
      if (this.clickedTile) {
        if (!this.game) {
          console.warn("BuildMenu: Game object is null.");
          return;
        }

        let currentBuildTable = buildTable;
        if (this.unitFilter && this.unitFilter.length > 0) {
          currentBuildTable = buildTable.map((row) =>
            row.filter((item) => this.unitFilter!.includes(item.unitType)),
          );
        }

        this.filteredBuildTable = currentBuildTable.map((row) =>
          row.filter(
            (item) => !this.game!.config().isUnitDisabled(item.unitType),
          ),
        );

        this.game
          .myPlayer()
          ?.actions(this.clickedTile)
          .then((actions) => {
            this.playerActions = actions;
            this.requestUpdate();
          })
          .catch((error) => {
            console.error("BuildMenu: Error fetching player actions:", error);
            this.playerActions = null;
            this.requestUpdate();
          });
      } else {
        this.playerActions = null;
        this.filteredBuildTable = buildTable;
        this.requestUpdate();
      }
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    .build-menu-prompt {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: white;
      font-size: 1.2rem;
      text-align: center;
    }
    .build-menu {
      background-color: transparent;
      padding: 0px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 95vw;
      max-height: 95vh;
      overflow-y: auto;
    }
    .build-row {
      display: flex;
      justify-content: left; /* Align buttons to the left */
      flex-wrap: wrap;
      width: 100%;
    }
    .build-button {
      position: relative;
      width: 110px; /* Adjusted width for 4 columns */
      height: 90px; /* Adjusted height to accommodate description */
      border: 2px solid #444;
      background-color: #2c2c2c;
      color: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column; /* Stack elements vertically */
      justify-content: center;
      align-items: center;
      margin: 4px;
      padding: 5px;
      gap: 2px; /* Reduced gap */
      text-align: center; /* Center text */
    }
    .build-button:not(:disabled):hover {
      background-color: #3a3a3a;
      transform: scale(1.02);
      border-color: #666;
    }
    .build-button:not(:disabled):active {
      background-color: #4a4a4a;
      transform: scale(0.98);
    }
    .build-button:disabled {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
      opacity: 0.7;
    }
    .build-button:disabled img {
      opacity: 0.5;
    }
    .build-button:disabled .build-cost {
      color: #ff4444;
    }
    .build-icon {
      width: 20px; /* Even smaller icon size */
      height: 20px; /* Even smaller icon size */
      margin-bottom: 2px; /* Space between icon and name */
    }
    .build-name {
      font-size: 11px; /* Smaller font size */
      font-weight: bold;
      margin-bottom: 2px; /* Space between name and cost */
      text-align: center;
      line-height: 1.2; /* Adjust line height for better fit */
    }
    .build-description {
      font-size: 0.6rem;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2; /* Limit to 2 lines */
      -webkit-box-orient: vertical;
      word-break: break-word; /* Break long words */
      max-height: 2.4em; /* Max height for 2 lines */
    }
    .build-cost {
      font-size: 10px; /* Smaller font size */
      white-space: nowrap;
    }
    .build-count-chip {
      position: absolute;
      top: -8px; /* Positioned top-right */
      right: -8px; /* Positioned top-right */
      background-color: #2c2c2c;
      color: white;
      padding: 1px 5px; /* Adjusted padding */
      border-radius: 10000px;
      transition: all 0.3s ease;
      font-size: 9px; /* Adjusted font size */
      display: flex;
      justify-content: center;
      align-content: center;
      border: 1px solid #444;
    }
    .build-button:not(:disabled):hover > .build-count-chip {
      background-color: #3a3a3a;
      border-color: #666;
    }
    .build-button:not(:disabled):active > .build-count-chip {
      background-color: #4a4a4a;
    }
    .build-button:disabled > .build-count-chip {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
    }
    .build-count {
      font-weight: bold;
      font-size: 10px; /* Smaller font size */
    }

    @media (max-width: 768px) {
      .build-button {
        width: calc(25% - 8px); /* Four columns on medium screens */
        height: 80px; /* Adjusted height */
        margin: 4px;
        padding: 5px;
      }
      .build-icon {
        width: 20px;
        height: 20px;
      }
      .build-name {
        font-size: 10px;
      }
      .build-cost {
        font-size: 9px;
      }
      .build-count-chip {
        padding: 0 4px;
        font-size: 7px;
      }
    }

    @media (max-width: 480px) {
      .build-button {
        width: calc(50% - 8px); /* Two columns on small screens */
        height: 70px; /* Adjusted height */
        margin: 4px;
        padding: 4px;
      }
      .build-icon {
        width: 18px;
        height: 18px;
      }
      .build-name {
        font-size: 9px;
      }
      .build-cost {
        font-size: 8px;
      }
      .build-count-chip {
        padding: 0 3px;
        font-size: 6px;
      }
      .build-button img {
        width: 18px;
        height: 18px;
      }
      .build-cost img {
        width: 8px;
        height: 8px;
      }
    }
  `;

  private canBuild(item: BuildItemDisplay): boolean {
    if (this.game?.myPlayer() === null || this.playerActions === null) {
      return false;
    }
    const buildableUnits = this.playerActions?.buildableUnits ?? [];
    const unit = buildableUnits.filter((u) => u.type === item.unitType);
    if (unit.length === 0) {
      return false;
    }
    return unit[0].canBuild !== false;
  }

  private cost(item: BuildItemDisplay): Gold {
    for (const bu of this.playerActions?.buildableUnits ?? []) {
      if (bu.type === item.unitType) {
        return bu.cost;
      }
    }
    return 0n;
  }

  private count(item: BuildItemDisplay): string {
    const player = this.game?.myPlayer();
    if (!player) {
      return "?";
    }

    return player.units(item.unitType).length.toString();
  }

  public onBuildSelected = (item: BuildItemDisplay) => {
    if (!this.clickedTile) {
      return;
    }
    this.eventBus.emit(
      new BuildUnitIntentEvent(item.unitType, this.clickedTile),
    );
  };

  render() {
    if (!this.clickedTile) {
      return html`
        <div class="build-menu-prompt">
          <p>
            Right-click a tile you own and select the build icon to see options
            here.
          </p>
        </div>
      `;
    }

    if (!this.playerActions) {
      return html`
        <div class="build-menu-prompt">
          <p>Loading build options...</p>
        </div>
      `;
    }

    return html`
      <div
        class="build-menu"
        @contextmenu=${(e: MouseEvent) => e.preventDefault()}
      >
        ${this.filteredBuildTable.map(
          (row) => html`
            <div class="build-row">
              ${row.map((item) => {
                return html`
                  <button
                    class="build-button"
                    @click=${() => this.onBuildSelected(item)}
                    ?disabled=${!this.canBuild(item)}
                    title=${item.description
                      ? translateText(item.description)
                      : ""}
                  >
                    <img
                      src=${item.icon}
                      alt="${item.unitType}"
                      width="28"
                      height="28"
                    />
                    <span class="build-name"
                      >${item.key && translateText(item.key)}</span
                    >
                    <span class="build-cost" translate="no">
                      ${renderNumber(
                        this.game && this.game.myPlayer() ? this.cost(item) : 0,
                      )}
                      <img
                        src=${goldCoinIcon}
                        alt="gold"
                        width="12"
                        height="12"
                        style="vertical-align: middle;"
                      />
                    </span>
                    ${item.countable
                      ? html`<div class="build-count-chip">
                          <span class="build-count">${this.count(item)}</span>
                        </div>`
                      : ""}
                  </button>
                `;
              })}
            </div>
          `,
        )}
      </div>
    `;
  }

  private getBuildableUnits(): BuildItemDisplay[][] {
    return buildTable;
  }
}
