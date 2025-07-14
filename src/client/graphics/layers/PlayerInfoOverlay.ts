import { LitElement, TemplateResult, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import {
  PlayerProfile,
  PlayerType,
  Relation,
  Unit,
  UnitType,
} from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView, PlayerView, UnitView } from "../../../core/game/GameView";
import { MouseMoveEvent } from "../../InputHandler";
import { renderNumber, renderTroops } from "../../Utils";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

function euclideanDistWorld(
  coord: { x: number; y: number },
  tileRef: TileRef,
  game: GameView,
): number {
  const x = game.x(tileRef);
  const y = game.y(tileRef);
  const dx = coord.x - x;
  const dy = coord.y - y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distSortUnitWorld(coord: { x: number; y: number }, game: GameView) {
  return (a: Unit | UnitView, b: Unit | UnitView) => {
    const distA = euclideanDistWorld(coord, a.tile(), game);
    const distB = euclideanDistWorld(coord, b.tile(), game);
    return distA - distB;
  };
}

@customElement("player-info-overlay")
export class PlayerInfoOverlay extends LitElement implements Layer {
  @property({ type: Object })
  public game!: GameView;

  @property({ type: Object })
  public eventBus!: EventBus;

  @property({ type: Object })
  public transform!: TransformHandler;

  @state()
  private player: PlayerView | null = null;

  @state()
  private playerProfile: PlayerProfile | null = null;

  @state()
  private unit: UnitView | null = null;

  @state()
  private _isInfoVisible: boolean = false;

  private _isActive = false;

  private lastMouseUpdate = 0;

  init() {
    this.eventBus.on(MouseMoveEvent, (e: MouseMoveEvent) =>
      this.onMouseEvent(e),
    );
    this._isActive = true;
  }

  private onMouseEvent(event: MouseMoveEvent) {
    const now = Date.now();
    if (now - this.lastMouseUpdate < 100) {
      return;
    }
    this.lastMouseUpdate = now;
    this.maybeShow(event.x, event.y);
  }

  public hide() {
    this.setVisible(false);
    this.unit = null;
    this.player = null;
  }

  public maybeShow(x: number, y: number) {
    this.hide();
    const worldCoord = this.transform.screenToWorldCoordinates(x, y);
    if (!this.game.isValidCoord(worldCoord.x, worldCoord.y)) {
      return;
    }

    const tile = this.game.ref(worldCoord.x, worldCoord.y);
    if (!tile) return;

    const owner = this.game.owner(tile);

    if (owner && owner.isPlayer()) {
      this.player = owner as PlayerView;
      this.player.profile().then((p) => {
        this.playerProfile = p;
      });
      this.setVisible(true);
    } else if (!this.game.isLand(tile)) {
      const units = this.game
        .units(UnitType.Warship, UnitType.TradeShip, UnitType.TransportShip)
        .filter((u) => euclideanDistWorld(worldCoord, u.tile(), this.game) < 50)
        .sort(distSortUnitWorld(worldCoord, this.game));

      if (units.length > 0) {
        this.unit = units[0];
        this.setVisible(true);
      }
    }
  }

  tick() {
    this.requestUpdate();
  }

  renderLayer(context: CanvasRenderingContext2D) {
    // Implementation for Layer interface
  }

  shouldTransform(): boolean {
    return false;
  }

  setVisible(visible: boolean) {
    this._isInfoVisible = visible;
    this.requestUpdate();
  }

  private getRelationClass(relation: Relation): string {
    switch (relation) {
      case Relation.Hostile:
        return "text-red-500";
      case Relation.Distrustful:
        return "text-red-300";
      case Relation.Neutral:
        return "text-white";
      case Relation.Friendly:
        return "text-green-500";
      default:
        return "text-white";
    }
  }

  private getRelationName(relation: Relation): string {
    switch (relation) {
      case Relation.Hostile:
        return translateText("relation.hostile");
      case Relation.Distrustful:
        return translateText("relation.distrustful");
      case Relation.Neutral:
        return translateText("relation.neutral");
      case Relation.Friendly:
        return translateText("relation.friendly");
      default:
        return translateText("relation.default");
    }
  }

  private renderPlayerInfo(player: PlayerView) {
    const myPlayer = this.game.myPlayer();
    const isFriendly = myPlayer?.isFriendly(player);
    let relationHtml: TemplateResult | null = null;
    const attackingTroops = player
      .outgoingAttacks()
      .map((a) => a.troops)
      .reduce((a, b) => a + b, 0);

    if (myPlayer !== null) {
      let displayRelation = false;
      let relationClass = "";
      let relationName = "";

      if (myPlayer.isFriendly(player)) {
        relationClass = this.getRelationClass(Relation.Friendly);
        relationName = translateText("relation.allied");
        displayRelation = true;
      } else if (player.type() === PlayerType.FakeHuman) {
        const relation =
          this.playerProfile?.relations[myPlayer.smallID()] ?? Relation.Neutral;
        relationClass = this.getRelationClass(relation);
        relationName = this.getRelationName(relation);
        displayRelation = true;
      }

      if (displayRelation) {
        relationHtml = html`
          <span class="${relationClass}">${relationName}</span>
        `;
      }
    }
    let playerType = "";
    switch (player.type()) {
      case PlayerType.Bot:
        playerType = translateText("player_info_overlay.bot");
        break;
      case PlayerType.FakeHuman:
        playerType = translateText("player_info_overlay.nation");
        break;
      case PlayerType.Human:
        playerType = translateText("player_info_overlay.player");
        break;
    }

    return html`
      <div class="flex flex-col p-2 min-w-max">
        <!-- Box 0: Name, Relation, Type -->
        <div class="flex justify-center items-center gap-2 mb-2 w-full">
          <div
            class="text-bold text-lg font-bold inline-flex break-all ${isFriendly
              ? "text-green-500"
              : "text-white"}"
          >
            ${player.flag()
              ? html`<img
                  class="h-8 mr-1 aspect-[3/4]"
                  src=${`/flags/${player.flag()}.svg`}
                />`
              : ""}
            ${player.name()}
          </div>
          <div class="text-sm opacity-80">${relationHtml} ${playerType}</div>
        </div>

        <!-- Bottom Section -->
        <div class="flex flex-row gap-4">
          <!-- Left Column -->
          <div class="flex flex-col gap-2">
            <!-- Box 2: Team, Troops -->
            <div class="flex items-center gap-2 text-sm opacity-80">
              ${player.team() !== null
                ? html`<span
                    >${translateText("player_info_overlay.team")}:
                    ${player.team()}</span
                  >`
                : ""}
              ${player.troops() >= 1
                ? html`<span translate="no">
                    <img
                      src="/images/TroopIconWhite.png"
                      class="inline-block w-4 h-4 mr-1"
                      alt="Troops"
                    />
                    ${renderTroops(player.troops())}
                  </span>`
                : ""}
              ${attackingTroops >= 1
                ? html`<span translate="no">
                    <img
                      src="/images/SwordIconWhite.svg"
                      class="inline-block w-4 h-4 mr-1"
                      alt="Attack"
                    />
                    ${renderTroops(attackingTroops)}
                  </span>`
                : ""}
            </div>

            <!-- Box 3: Gold, Productivity -->
            <div class="flex items-center gap-2 text-sm opacity-80">
              <span translate="no">
                <img
                  src="/images/GoldCoinIcon.svg"
                  class="inline-block w-4 h-4 mr-1"
                  alt="Gold"
                />
                ${renderNumber(player.gold())}
              </span>
              <span translate="no">
                <img
                  src="/images/ProductionRateIcon.svg"
                  class="inline-block w-4 h-4 mr-1"
                  alt="Productivity"
                />
                ${Math.round(player.productivity() * 100)}%
              </span>
            </div>
          </div>

          <!-- Right Column -->
          <!-- Box 1: All Units/Buildings -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-around items-center">
              <img
                src="/images/CityIconWhite.svg"
                class="inline-block w-4 h-4"
                alt="City"
              />
              <img
                src="/images/HospitalIconWhite.svg"
                class="inline-block w-4 h-4"
                alt="Hospital"
              />
              <img
                src="/images/AcademyIconWhite.png"
                class="inline-block w-4 h-4"
                alt="Academy"
              />
              <img
                src="/images/PortIcon.svg"
                class="inline-block w-4 h-4"
                alt="Port"
              />
              <img
                src="/images/BattleshipIconWhite.svg"
                class="inline-block w-4 h-4"
                alt="Warship"
              />
              <img
                src="/images/MissileSiloIconWhite.svg"
                class="inline-block w-4 h-4"
                alt="Missile Silo"
              />
              <img
                src="/images/SamLauncherIconWhite.svg"
                class="inline-block w-4 h-4"
                alt="SAM Launcher"
              />
              <img
                src="/images/AirfieldIcon.svg"
                class="inline-block w-4 h-4"
                alt="Airfield"
              />
              <img
                src="/images/FighterJetIcon.svg"
                class="inline-block w-4 h-4"
                alt="Fighter Jet"
              />
            </div>
            <div class="flex justify-around items-center text-sm opacity-80">
              <span class="text-center"
                >${player.units(UnitType.City).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.Hospital).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.Academy).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.Port).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.Warship).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.MissileSilo).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.SAMLauncher).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.Airfield).length}</span
              >
              <span class="text-center"
                >${player.units(UnitType.FighterJet).length}</span
              >
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderUnitInfo(unit: UnitView) {
    const isAlly =
      (unit.owner() === this.game.myPlayer() ||
        this.game.myPlayer()?.isFriendly(unit.owner())) ??
      false;

    return html`
      <div class="p-2">
        <div class="font-bold mb-1 ${isAlly ? "text-green-500" : "text-white"}">
          ${unit.owner().name()}
        </div>
        <div class="mt-1">
          <div class="text-sm opacity-80">${unit.type()}</div>
          ${unit.hasHealth()
            ? html`
                <div class="text-sm opacity-80">
                  ${translateText("player_info_overlay.health")}:
                  ${unit.health()}
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  render() {
    if (!this._isActive) {
      return html``;
    }

    const containerClasses = this._isInfoVisible
      ? "opacity-100 visible pointer-events-auto"
      : "opacity-0 invisible pointer-events-none";

    return html`
      <div
        class="fixed inset-0 z-50 pointer-events-none"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <div
          class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800/40 backdrop-blur-sm shadow-xs rounded-lg shadow-lg backdrop-blur-sm transition-all duration-300  text-white text-lg md:text-base ${containerClasses}"
        >
          ${this.player !== null ? this.renderPlayerInfo(this.player) : ""}
          ${this.unit !== null ? this.renderUnitInfo(this.unit) : ""}
        </div>
      </div>
    `;
  }

  createRenderRoot() {
    return this; // Disable shadow DOM to allow Tailwind styles
  }
}
