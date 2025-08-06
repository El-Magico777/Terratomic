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
import { Gold, UnitType } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import { renderNumber } from "../../Utils";
import { UIState } from "../UIState";

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
      unitType: UnitType.HydrogenBomb,
      icon: hydrogenBombIcon,
      description: "build_menu.desc.hydrogen_bomb",
      key: "unit_type.hydrogen_bomb",
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
      unitType: UnitType.City,
      icon: cityIcon,
      description: "build_menu.desc.city",
      key: "unit_type.city",
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
      unitType: UnitType.Airfield,
      icon: airfieldIcon,
      description: "build_menu.desc.airfield",
      key: "unit_type.airfield",
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
  uiState: UIState;

  @property({ type: Array })
  unitFilter: UnitType[] | null = null;

  @state()
  private filteredBuildTable: BuildItemDisplay[][] = buildTable;

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
      width: 120px; /* More rectangular */
      height: 50px; /* More rectangular */
      border: 2px solid #444;
      background-color: #2c2c2c;
      color: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: row; /* Icon next to text */
      justify-content: flex-start; /* Align items to the start */
      align-items: center;
      margin: 4px;
      padding: 5px; /* Reduced padding */
      gap: 8px; /* Space between icon and text block */
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
    .selected-for-build {
      border-color: #34d399; /* A bright green to indicate selection */
      box-shadow: 0 0 10px #34d399;
    }
    .build-icon {
      width: 28px;
      height: 28px;
      flex-shrink: 0; /* Prevent icon from shrinking */
    }
    .build-item-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start; /* Align text to the left */
      gap: 2px;
    }
    .build-name {
      font-size: 11px;
      font-weight: bold;
      text-align: left;
      line-height: 1.2;
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
      font-size: 10px;
      white-space: nowrap;
      text-align: left;
    }
    .build-count-chip {
      position: absolute;
      top: -5px;
      right: -5px;
      background-color: #2c2c2c;
      color: white;
      padding: 1px 5px;
      border-radius: 10px;
      font-size: 9px;
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
      font-size: 10px;
    }
  `;

  private canBuild(item: BuildItemDisplay): boolean {
    if (!this.game || !this.game.myPlayer()) {
      return false;
    }
    return this.game.myPlayer()!.gold() >= this.cost(item);
  }

  private cost(item: BuildItemDisplay): Gold {
    return this.game
      .config()
      .unitInfo(item.unitType)
      .cost(this.game.myPlayer()!);
  }

  private count(item: BuildItemDisplay): string {
    const player = this.game?.myPlayer();
    if (!player) {
      return "?";
    }

    return player.units(item.unitType).length.toString();
  }

  public onBuildSelected = (item: BuildItemDisplay) => {
    if (this.uiState.pendingBuildUnitType === item.unitType) {
      this.uiState.pendingBuildUnitType = null;
    } else {
      this.uiState.pendingBuildUnitType = item.unitType;
    }
    this.requestUpdate();
  };

  render() {
    if (!this.uiState) {
      return html`<div>Loading build options...</div>`;
    }

    let currentBuildTable = buildTable;
    if (this.unitFilter && this.unitFilter.length > 0) {
      currentBuildTable = buildTable.map((row) =>
        row.filter((item) => this.unitFilter!.includes(item.unitType)),
      );
    }

    const filteredAndDisabledCheckedTable = currentBuildTable.map((row) =>
      row.filter((item) => !this.game!.config().isUnitDisabled(item.unitType)),
    );

    return html`
      <div
        class="build-menu"
        @contextmenu=${(e: MouseEvent) => e.preventDefault()}
      >
        ${filteredAndDisabledCheckedTable.map(
          (row) => html`
            <div class="build-row">
              ${row.map((item) => {
                return html`
                  <button
                    class="build-button ${this.uiState.pendingBuildUnitType ===
                    item.unitType
                      ? "selected-for-build"
                      : ""}"
                    @click=${() => this.onBuildSelected(item)}
                    ?disabled=${!this.canBuild(item)}
                    title=${item.description
                      ? translateText(item.description)
                      : ""}
                  >
                    <img
                      class="build-icon"
                      src=${item.icon}
                      alt="${item.unitType}"
                    />
                    <div class="build-item-details">
                      <span class="build-name"
                        >${item.key && translateText(item.key)}</span
                      >
                      <span class="build-cost" translate="no">
                        ${renderNumber(
                          this.game && this.game.myPlayer()
                            ? this.cost(item)
                            : 0,
                        )}
                        <img
                          src=${goldCoinIcon}
                          alt="gold"
                          width="12"
                          height="12"
                          style="vertical-align: middle;"
                        />
                      </span>
                    </div>
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
