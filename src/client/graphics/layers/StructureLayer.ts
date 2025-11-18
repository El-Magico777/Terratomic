import { colord } from "colord";
import * as PIXI from "pixi.js";
// Use the standard shield icon from resources/images

// Themed structure icons
import cityChina from "../../../../proprietary/images/structures-themed/city-china.png";
import cityNato from "../../../../proprietary/images/structures-themed/city-nato.png";
import cityNeutral from "../../../../proprietary/images/structures-themed/city-neutral.png";
import cityRussia from "../../../../proprietary/images/structures-themed/city-russia.png";

import portChina from "../../../../proprietary/images/structures-themed/port-china.png";
import portNato from "../../../../proprietary/images/structures-themed/port-nato.png";
import portNeutral from "../../../../proprietary/images/structures-themed/port-neutral.png";
import portRussia from "../../../../proprietary/images/structures-themed/port-russia.png";

import airfieldChina from "../../../../proprietary/images/structures-themed/airfield-china.png";
import airfieldNato from "../../../../proprietary/images/structures-themed/airfield-nato.png";
import airfieldNeutral from "../../../../proprietary/images/structures-themed/airfield-neutral.png";
import airfieldRussia from "../../../../proprietary/images/structures-themed/airfield-russia.png";

import hospitalChina from "../../../../proprietary/images/structures-themed/hospital-china.png";
import hospitalNato from "../../../../proprietary/images/structures-themed/hospital-nato.png";
import hospitalNeutral from "../../../../proprietary/images/structures-themed/hospital-neutral.png";
import hospitalRussia from "../../../../proprietary/images/structures-themed/hospital-russia.png";

import academyChina from "../../../../proprietary/images/structures-themed/academy-china.png";
import academyNato from "../../../../proprietary/images/structures-themed/academy-nato.png";
import academyNeutral from "../../../../proprietary/images/structures-themed/academy-neutral.png";
import academyRussia from "../../../../proprietary/images/structures-themed/academy-russia.png";

import researchlabChina from "../../../../proprietary/images/structures-themed/researchlab-china.png";
import researchlabNato from "../../../../proprietary/images/structures-themed/researchlab-nato.png";
import researchlabNeutral from "../../../../proprietary/images/structures-themed/researchlab-neutral.png";
import researchlabRussia from "../../../../proprietary/images/structures-themed/researchlab-russia.png";

import defensepostChina from "../../../../proprietary/images/structures-themed/defensepost-china.png";
import defensepostNato from "../../../../proprietary/images/structures-themed/defensepost-nato.png";
import defensepostNeutral from "../../../../proprietary/images/structures-themed/defensepost-neutral.png";
import defensepostRussia from "../../../../proprietary/images/structures-themed/defensepost-russia.png";

import missilesiloChina from "../../../../proprietary/images/structures-themed/missilesilo-china.png";
import missilesiloNato from "../../../../proprietary/images/structures-themed/missilesilo-nato.png";
import missilesiloNeutral from "../../../../proprietary/images/structures-themed/missilesilo-neutral.png";
import missilesiloRussia from "../../../../proprietary/images/structures-themed/missilesilo-russia.png";

import samChina from "../../../../proprietary/images/structures-themed/sam-china.png";
import samNato from "../../../../proprietary/images/structures-themed/sam-nato.png";
import samNeutral from "../../../../proprietary/images/structures-themed/sam-neutral.png";
import samRussia from "../../../../proprietary/images/structures-themed/sam-russia.png";

import { Theme } from "../../../core/configuration/Config";
import { EventBus } from "../../../core/EventBus";
import { Cell, PlayerID, UnitType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView, UnitView } from "../../../core/game/GameView";
import { ThemeId } from "../../../core/theme/AllianceThemes";
import { ToggleUpgradeModeEvent } from "../../events/ToggleUpgradeModeEvent";
import { UnitCooldownEndedEvent } from "../../events/UnitCooldownEndedEvent";
import { MouseMoveEvent, MouseUpEvent } from "../../InputHandler";
import { computeCustomTerritoryColor } from "../../theme/ThemeColorOverride";
import { SendUpgradeStructureIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";
class StructureRenderInfo {
  public isOnScreen: boolean = false;
  public isOnCooldown: boolean = false;
  constructor(
    public unit: UnitView,
    public owner: PlayerID,
    public pixiSprite: PIXI.Sprite,
    public underConstruction: boolean,
  ) {}
}

const ICON_SIZE = 24; // legacy default; specific shapes use ICON_SIZES below
// Render structure textures at higher pixel density to stay crisp when scaled
const ICON_TEXTURE_QUALITY = 4; // 4x logical size -> sharper when zooming in
const ICON_SIZES: Record<BgShape, number> = {
  circle: 28,
  octagon: 28,
  pentagon: 30,
  square: 28,
  triangle: 28,
};
// Icon scale behavior vs map zoom:
// - Up to ICON_GROW_ZOOM_THRESHOLD, icons behave as before: they shrink with zoom-out and cap at 1x when zoomed in
// - Beyond ICON_GROW_ZOOM_THRESHOLD, icons grow with the map zoom (proportionally)
const ICON_GROW_ZOOM_THRESHOLD = 2;
const UNDER_CONSTRUCTION_FILL = "rgb(198, 198, 198)";
const UNDER_CONSTRUCTION_BORDER = "rgb(128, 127, 127)";
const reloadingColor = "red";

// Background shape per structure type
type BgShape = "circle" | "square" | "triangle" | "pentagon" | "octagon";
const STRUCTURE_BG_SHAPES: Partial<Record<UnitType, BgShape>> = {
  [UnitType.City]: "circle",
  [UnitType.Port]: "pentagon",
  [UnitType.DefensePost]: "octagon",
  [UnitType.MissileSilo]: "triangle",
  [UnitType.SAMLauncher]: "square",
  [UnitType.Airfield]: "square",
  [UnitType.Hospital]: "square",
  [UnitType.ResearchLab]: "square",
  [UnitType.Academy]: "square",
};

export class StructureLayer implements Layer {
  private pixicanvas: HTMLCanvasElement;
  private stage: PIXI.Container;
  private labelContainer: PIXI.Container; // UI overlay for hover labels
  private shouldRedraw: boolean = true;
  private textureCache: Map<string, PIXI.Texture> = new Map();
  private lastHighlight: Map<number, boolean> = new Map(); // per-unit highlight state to detect changes
  private theme: Theme;
  private renderer: PIXI.Renderer;
  private renders: StructureRenderInfo[] = [];
  private seenUnits: Set<UnitView> = new Set();

  // Interaction state
  private selectedStructureUnit: UnitView | null = null;
  private previouslySelected: UnitView | null = null;
  private hoveredStructure: UnitView | null = null;
  private upgradeMode: boolean = false; // When true, clicking own cities/ports sends upgrade intent
  // Track affordability per structure type to refresh highlights correctly
  private lastAffordableForUpgradeCity: boolean | null = null;
  private lastAffordableForUpgradePort: boolean | null = null;
  private lastAffordableForUpgradeHospital: boolean | null = null;
  private lastAffordableForUpgradeAcademy: boolean | null = null;
  private lastAffordableForUpgradeResearchLab: boolean | null = null;
  private lastAffordableForUpgradeSilo: boolean | null = null;
  private lastAffordableForUpgradeSAM: boolean | null = null;
  // Client-side level tracking for structures (temporary)
  private structureLevels = new Map<
    number,
    { primary: number; secondary: number }
  >();

  // Icons registry - now supports themed icons
  private structures: Map<
    UnitType,
    Map<ThemeId, { iconPath: string; image: HTMLImageElement | null }>
  > = new Map();

  // Per-structure icon scale factor (1 = default size)
  private static readonly ICON_DRAW_SCALE: Partial<Record<UnitType, number>> = {
    [UnitType.City]: 1,
    [UnitType.Airfield]: 1,
    [UnitType.Hospital]: 1,
    [UnitType.ResearchLab]: 1.4,
    [UnitType.Academy]: 1,
    [UnitType.DefensePost]: 1,
    [UnitType.Port]: 1,
    [UnitType.MissileSilo]: 1,
    [UnitType.SAMLauncher]: 1,
  };

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
  ) {
    this.theme = game.config().theme();
    this.initializeThemedIcons();
  }

  private initializeThemedIcons(): void {
    // Define themed icon paths for each structure type
    const themedIconPaths: Partial<Record<UnitType, Record<ThemeId, string>>> =
      {
        [UnitType.City]: {
          nato: cityNato,
          russia: cityRussia,
          china: cityChina,
          neutral: cityNeutral,
        },
        [UnitType.Port]: {
          nato: portNato,
          russia: portRussia,
          china: portChina,
          neutral: portNeutral,
        },
        [UnitType.Airfield]: {
          nato: airfieldNato,
          russia: airfieldRussia,
          china: airfieldChina,
          neutral: airfieldNeutral,
        },
        [UnitType.Hospital]: {
          nato: hospitalNato,
          russia: hospitalRussia,
          china: hospitalChina,
          neutral: hospitalNeutral,
        },
        [UnitType.Academy]: {
          nato: academyNato,
          russia: academyRussia,
          china: academyChina,
          neutral: academyNeutral,
        },
        [UnitType.ResearchLab]: {
          nato: researchlabNato,
          russia: researchlabRussia,
          china: researchlabChina,
          neutral: researchlabNeutral,
        },
        [UnitType.DefensePost]: {
          nato: defensepostNato,
          russia: defensepostRussia,
          china: defensepostChina,
          neutral: defensepostNeutral,
        },
        [UnitType.MissileSilo]: {
          nato: missilesiloNato,
          russia: missilesiloRussia,
          china: missilesiloChina,
          neutral: missilesiloNeutral,
        },
        [UnitType.SAMLauncher]: {
          nato: samNato,
          russia: samRussia,
          china: samChina,
          neutral: samNeutral,
        },
      };

    // Initialize icon maps for each structure type
    for (const [unitType, themePaths] of Object.entries(themedIconPaths)) {
      const themeMap = new Map<
        ThemeId,
        { iconPath: string; image: HTMLImageElement | null }
      >();

      for (const [themeId, iconPath] of Object.entries(themePaths)) {
        const iconInfo = { iconPath, image: null };
        themeMap.set(themeId as ThemeId, iconInfo);
        this.loadThemedIcon(iconInfo, unitType as UnitType, themeId as ThemeId);
      }

      this.structures.set(unitType as UnitType, themeMap);
    }
  }

  private loadThemedIcon(
    unitInfo: { iconPath: string; image: HTMLImageElement | null },
    unitType: UnitType,
    themeId: ThemeId,
  ): void {
    const image = new Image();
    image.src = unitInfo.iconPath;
    image.onload = () => {
      unitInfo.image = image;
    };
    image.onerror = () => {
      console.error(
        `Failed to load themed icon for ${unitType} (${themeId}): ${unitInfo.iconPath}`,
      );
    };
  }

  shouldTransform(): boolean {
    // We manually handle transforms when positioning sprites
    return false;
  }

  async init() {
    window.addEventListener("resize", () => this.resizeCanvas());
    await this.setupRenderer();
    this.redraw();
    this.eventBus.on(MouseUpEvent, (e) => this.onMouseUp(e));
    this.eventBus.on(MouseMoveEvent, (e) => this.onMouseMove(e));
    this.eventBus.on(UnitCooldownEndedEvent, (e) => {
      if (e.unit.type() === UnitType.City) {
        const render = this.renders.find((r) => r.unit.id() === e.unit.id());
        if (render) {
          this.updateRenderState(render, e.unit);
        }
      }
    });
    this.eventBus.on(ToggleUpgradeModeEvent, (e) => {
      this.upgradeMode = e.enabled;
      // Rebuild textures for existing sprites so border tint updates immediately.
      for (const r of this.renders) {
        if (
          r.unit.type() === UnitType.City ||
          r.unit.type() === UnitType.Port ||
          r.unit.type() === UnitType.Hospital ||
          r.unit.type() === UnitType.Academy ||
          r.unit.type() === UnitType.MissileSilo ||
          r.unit.type() === UnitType.SAMLauncher
        ) {
          r.pixiSprite.texture = this.createTexture(r.unit);
        }
      }
      // Force redraw so highlight state applies instantly.
      this.shouldRedraw = true;
      this.updateHighlights();
      // Rebuild price labels when toggling upgrade mode
      this.updateLabels();
      if (this.renderer) this.renderer.render(this.stage);
    });
  }

  async setupRenderer() {
    this.renderer = new PIXI.WebGLRenderer();
    this.pixicanvas = document.createElement("canvas");
    this.pixicanvas.width = window.innerWidth;
    this.pixicanvas.height = window.innerHeight;
    this.stage = new PIXI.Container();
    this.stage.position.set(0, 0);
    this.stage.width = this.pixicanvas.width;
    this.stage.height = this.pixicanvas.height;
    // Create label overlay container rendered above sprites
    this.labelContainer = new PIXI.Container();
    this.stage.addChild(this.labelContainer);
    await this.renderer.init({
      canvas: this.pixicanvas,
      resolution: 1,
      width: this.pixicanvas.width,
      height: this.pixicanvas.height,
      clearBeforeRender: true,
      backgroundAlpha: 0,
      backgroundColor: 0x00000000,
    });
  }

  resizeCanvas() {
    if (this.renderer.view) {
      this.pixicanvas.width = window.innerWidth;
      this.pixicanvas.height = window.innerHeight;
      this.renderer.resize(innerWidth, innerHeight, 1);
      this.shouldRedraw = true;
    }
  }

  tick() {
    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    for (const u of unitUpdates) {
      const unitView = this.game.unit(u.id);
      if (unitView === undefined) continue;

      if (unitView.isActive()) {
        if (this.seenUnits.has(unitView)) {
          const render = this.renders.find(
            (r) => r.unit.id() === unitView.id(),
          );
          if (render) {
            this.updateRenderState(render, unitView);
          }
        } else if (
          this.structures.has(unitView.type()) ||
          unitView.type() === UnitType.Construction
        ) {
          this.seenUnits.add(unitView);
          const render = new StructureRenderInfo(
            unitView,
            unitView.owner().id(),
            this.createPixiSprite(unitView),
            unitView.type() === UnitType.Construction,
          );
          this.renders.push(render);
          this.computeNewLocation(render);
          this.shouldRedraw = true;
        }
      }

      if (!unitView.isActive() && this.seenUnits.has(unitView)) {
        const render = this.renders.find((r) => r.unit.id() === unitView.id());
        if (render) {
          this.deleteStructure(render);
        }
        this.shouldRedraw = true;
      }
    }
  }

  redraw() {
    this.resizeCanvas();
  }

  renderLayer(mainContext: CanvasRenderingContext2D) {
    if (!this.renderer) return;

    if (this.transformHandler.hasChanged()) {
      for (const render of this.renders) {
        this.computeNewLocation(render);
      }
      // Reposition labels on transform changes
      this.updateLabels();
    }

    this.updateHighlights();

    if (this.transformHandler.hasChanged() || this.shouldRedraw) {
      this.renderer.render(this.stage);
      this.shouldRedraw = false;
    }
    mainContext.drawImage(this.renderer.canvas, 0, 0);
  }

  private canAffordUpgrade(unit?: UnitView): boolean {
    const me = this.game.myPlayer();
    if (!me) return false;
    // Determine structure type (default to City if absent for safety)
    const unitType = unit?.type() ?? UnitType.City;
    return this.canAffordUpgradeForType(unitType);
  }

  private canAffordUpgradeForType(unitType: UnitType): boolean {
    const me = this.game.myPlayer();
    if (!me) return false;
    const cfg = this.game.config();
    const baseCost = cfg.unitInfo(unitType).cost(me as any);
    const multiplier = cfg.structureUpgradeCostMultiplier(unitType);
    const scale = 100n; // fixed-point precision: 2 decimals
    const scaledMultiplier = BigInt(Math.round(multiplier * Number(scale)));
    const upgradeCost = (baseCost * scaledMultiplier) / scale;
    return me.gold() >= upgradeCost;
  }

  // Compute raw upgrade cost for a given structure type for the current player
  private computeUpgradeCostForType(unitType: UnitType): bigint {
    const me = this.game.myPlayer();
    if (!me) return 0n;
    const cfg = this.game.config();
    const baseCost = cfg.unitInfo(unitType).cost(me as any);
    const multiplier = cfg.structureUpgradeCostMultiplier(unitType);
    const scale = 100n; // fixed-point precision: 2 decimals
    const scaledMultiplier = BigInt(Math.round(multiplier * Number(scale)));
    const upgradeCost = (baseCost * scaledMultiplier) / scale;
    return upgradeCost;
  }

  // Compact gold formatter using k/m lowercase suffixes
  private formatGoldCompact(amount: bigint): string {
    // Special-case zero to preserve 'k' alignment in UI (show 0k)
    if (amount === 0n) return "0k";
    // Reuse renderNumber for thresholds, then lowercase the suffix
    const s = renderNumber(amount).replace("K", "k").replace("M", "m");
    return s;
  }

  private isUpgradeableStructure(unit: UnitView): boolean {
    if (
      unit.type() !== UnitType.City &&
      unit.type() !== UnitType.Port &&
      unit.type() !== UnitType.Hospital &&
      unit.type() !== UnitType.Academy &&
      unit.type() !== UnitType.ResearchLab &&
      unit.type() !== UnitType.MissileSilo &&
      unit.type() !== UnitType.SAMLauncher
    )
      return false;
    if (unit.type() === UnitType.MissileSilo && unit.level() >= 3) return false;
    if (unit.type() === UnitType.SAMLauncher && unit.level() >= 3) return false;
    return true;
  }

  private updateHighlights() {
    const affordableCity = this.canAffordUpgradeForType(UnitType.City);
    const affordablePort = this.canAffordUpgradeForType(UnitType.Port);
    const affordableHospital = this.canAffordUpgradeForType(UnitType.Hospital);
    const affordableAcademy = this.canAffordUpgradeForType(UnitType.Academy);
    const affordableSilo = this.canAffordUpgradeForType(UnitType.MissileSilo);
    const affordableSAM = this.canAffordUpgradeForType(UnitType.SAMLauncher);
    const affordableResearchLab = this.canAffordUpgradeForType(
      UnitType.ResearchLab,
    );
    if (!this.upgradeMode) {
      if (
        this.lastAffordableForUpgradeCity !== null ||
        this.lastAffordableForUpgradePort !== null ||
        this.lastAffordableForUpgradeHospital !== null ||
        this.lastAffordableForUpgradeAcademy !== null ||
        this.lastAffordableForUpgradeResearchLab !== null ||
        this.lastAffordableForUpgradeSilo !== null ||
        this.lastAffordableForUpgradeSAM !== null
      ) {
        for (const r of this.renders) {
          if (
            r.unit.type() === UnitType.City ||
            r.unit.type() === UnitType.Port ||
            r.unit.type() === UnitType.Hospital ||
            r.unit.type() === UnitType.Academy ||
            r.unit.type() === UnitType.ResearchLab ||
            r.unit.type() === UnitType.MissileSilo ||
            r.unit.type() === UnitType.SAMLauncher
          ) {
            r.pixiSprite.texture = this.createTexture(r.unit);
          }
        }
        this.lastAffordableForUpgradeCity = null;
        this.lastAffordableForUpgradePort = null;
        this.lastAffordableForUpgradeHospital = null;
        this.lastAffordableForUpgradeAcademy = null;
        this.lastAffordableForUpgradeResearchLab = null;
        this.lastAffordableForUpgradeSilo = null;
        this.lastAffordableForUpgradeSAM = null;
        this.shouldRedraw = true;
      }
      // When exiting upgrade mode, ensure any previously highlighted sprites are refreshed
      if (this.lastHighlight.size > 0) {
        for (const r of this.renders) {
          const was = this.lastHighlight.get(r.unit.id());
          if (was) {
            r.pixiSprite.texture = this.createTexture(r.unit);
          }
        }
        this.lastHighlight.clear();
        this.shouldRedraw = true;
      }
      return;
    }
    const cityChanged = this.lastAffordableForUpgradeCity !== affordableCity;
    const portChanged = this.lastAffordableForUpgradePort !== affordablePort;
    const hospitalChanged =
      this.lastAffordableForUpgradeHospital !== affordableHospital;
    const academyChanged =
      this.lastAffordableForUpgradeAcademy !== affordableAcademy;
    const siloChanged = this.lastAffordableForUpgradeSilo !== affordableSilo;
    const samChanged = this.lastAffordableForUpgradeSAM !== affordableSAM;
    const labChanged =
      this.lastAffordableForUpgradeResearchLab !== affordableResearchLab;
    if (
      cityChanged ||
      portChanged ||
      hospitalChanged ||
      academyChanged ||
      siloChanged ||
      samChanged ||
      labChanged
    ) {
      for (const r of this.renders) {
        const t = r.unit.type();
        if (
          (cityChanged && t === UnitType.City) ||
          (portChanged && t === UnitType.Port) ||
          (hospitalChanged && t === UnitType.Hospital) ||
          (academyChanged && t === UnitType.Academy) ||
          (labChanged && t === UnitType.ResearchLab) ||
          (siloChanged && t === UnitType.MissileSilo) ||
          (samChanged && t === UnitType.SAMLauncher)
        ) {
          r.pixiSprite.texture = this.createTexture(r.unit);
        }
      }
      this.lastAffordableForUpgradeCity = affordableCity;
      this.lastAffordableForUpgradePort = affordablePort;
      this.lastAffordableForUpgradeHospital = affordableHospital;
      this.lastAffordableForUpgradeAcademy = affordableAcademy;
      this.lastAffordableForUpgradeResearchLab = affordableResearchLab;
      this.lastAffordableForUpgradeSilo = affordableSilo;
      this.lastAffordableForUpgradeSAM = affordableSAM;
      this.shouldRedraw = true;
    }

    // Per-unit sanity check: if highlight eligibility changed (e.g., level cap reached), refresh that unit
    let anyUnitChanged = false;
    for (const r of this.renders) {
      const t = r.unit.type();
      if (
        t !== UnitType.City &&
        t !== UnitType.Port &&
        t !== UnitType.Hospital &&
        t !== UnitType.Academy &&
        t !== UnitType.ResearchLab &&
        t !== UnitType.MissileSilo &&
        t !== UnitType.SAMLauncher
      ) {
        continue;
      }
      const should = this.shouldHighlight(r.unit);
      const prev = this.lastHighlight.get(r.unit.id()) ?? false;
      if (prev !== should) {
        // Refresh just this sprite; cache key accounts for highlight state
        r.pixiSprite.texture = this.createTexture(r.unit);
        this.lastHighlight.set(r.unit.id(), should);
        anyUnitChanged = true;
      }
    }
    if (anyUnitChanged) {
      this.shouldRedraw = true;
    }
  }

  private updateRenderState(render: StructureRenderInfo, unit: UnitView) {
    const isConstruction = unit.type() === UnitType.Construction;
    const ownerChanged = render.owner !== unit.owner().id();
    const constructionStateChanged =
      render.underConstruction !== isConstruction;

    let cooldownChanged = false;
    if (unit.type() === UnitType.City) {
      const endsAt = unit.cooldownEndsAt?.call(unit) ?? undefined;
      const isOnCooldown =
        (endsAt !== undefined && this.game.ticks() < endsAt) ||
        (unit.ticksLeftInCooldown() ?? 0) > 0;
      if (isOnCooldown !== render.isOnCooldown) {
        cooldownChanged = true;
        render.isOnCooldown = isOnCooldown;
      }
    }

    if (ownerChanged || constructionStateChanged || cooldownChanged) {
      render.owner = unit.owner().id();
      render.underConstruction = isConstruction;
      render.pixiSprite?.destroy();
      render.pixiSprite = this.createPixiSprite(unit);
      this.shouldRedraw = true;
    }

    // Initialize or bump structure levels (city level comes from server updates).
    if (!isConstruction) {
      this.ensureStructureLevels(unit);
      const record = this.structureLevels.get(unit.id());
      if (record) {
        // Sync primary level from server value.
        const prevLevel = record.primary;
        const serverLevel = unit.level();
        record.primary = serverLevel;
        // If the hovered structure's level changed, refresh the label immediately.
        if (this.hoveredStructure && this.hoveredStructure.id() === unit.id()) {
          this.updateLabels();
        }
        // If level changed and we're in upgrade mode, re-render texture so highlight state updates
        if (prevLevel !== serverLevel && this.upgradeMode) {
          // Refresh texture so highlight state updates based on new level
          const target = this.renders.find((r) => r.unit.id() === unit.id());
          if (target) {
            target.pixiSprite.texture = this.createTexture(unit);
            this.shouldRedraw = true;
            if (this.renderer) {
              // Force immediate redraw so highlight state disappears instantly
              this.renderer.render(this.stage);
            }
          }
        }
      }
    }
  }

  private createTexture(unit: UnitView): PIXI.Texture {
    const isConstruction = unit.type() === UnitType.Construction;
    const structureType = isConstruction
      ? (unit.constructionType() ?? unit.type())
      : unit.type();

    // Get theme ID for cache key
    const themeId = unit.iconThemeId?.() ?? "neutral";

    let cacheKey = isConstruction
      ? `construction-${structureType}`
      : `${unit.owner().id()}-${structureType}-${themeId}-v2`; // v2: legacy icons scaled to 70%
    if (unit.type() === UnitType.City) {
      const endsAt = unit.cooldownEndsAt?.call(unit) ?? undefined;
      const isOnCooldown =
        (endsAt !== undefined && this.game.ticks() < endsAt) ||
        (unit.ticksLeftInCooldown() ?? 0) > 0;
      cacheKey += `-${isOnCooldown}`;
    }
    // Differentiate textures by upgrade highlight state so mixed eligibility among
    // units of the same type/owner doesn't lead to incorrect texture reuse.
    if (!isConstruction) {
      const t = structureType as UnitType;
      if (
        t === UnitType.City ||
        t === UnitType.Port ||
        t === UnitType.Hospital ||
        t === UnitType.Academy ||
        t === UnitType.MissileSilo ||
        t === UnitType.SAMLauncher
      ) {
        const hl = this.shouldHighlight(unit) ? 1 : 0;
        cacheKey += `-hl${hl}`;
      }
    }
    if (this.textureCache.has(cacheKey)) {
      // If render requested invalidation (upgrade mode toggle), bypass cache by deleting
      // The caller sets render.invalidateTexture; we can't access it here, so rely on a global flag
      // Simpler: when upgradeMode toggles we clear relevant city cache entries elsewhere.
      return this.textureCache.get(cacheKey)!;
    }

    const shape: BgShape =
      STRUCTURE_BG_SHAPES[structureType as UnitType] ?? "circle";
    const ICON_DIM = ICON_SIZES[shape] ?? ICON_SIZE;

    const canvas = document.createElement("canvas");
    const CANVAS_PX = Math.max(1, Math.round(ICON_DIM * ICON_TEXTURE_QUALITY));
    canvas.width = CANVAS_PX;
    canvas.height = CANVAS_PX;
    const ctx = canvas.getContext("2d")!;
    // Draw in logical units (ICON_DIM) but render at higher pixel density
    ctx.scale(ICON_TEXTURE_QUALITY, ICON_TEXTURE_QUALITY);

    // Fill and border colors
    let borderColor: string;
    if (isConstruction) {
      ctx.fillStyle = UNDER_CONSTRUCTION_FILL;
      borderColor = UNDER_CONSTRUCTION_BORDER;
    } else {
      ctx.fillStyle = "#c9dbff"; // semi-transparent white applied via globalAlpha
      // Apply custom territory color override for current player (alliance themes)
      const my = this.game.myPlayer();
      const owner = unit.owner();
      const customColor =
        my && owner === my ? computeCustomTerritoryColor(owner) : null;
      const baseColor = customColor ?? this.theme.territoryColor(owner);
      // Derive border color from territory color (matching the pattern in PastelTheme.borderColor)
      const tc = baseColor.rgba;
      const border = colord({
        r: Math.max(tc.r - 40, 0),
        g: Math.max(tc.g - 40, 0),
        b: Math.max(tc.b - 40, 0),
      });
      borderColor = border.darken(0.17).toRgbString();
    }

    if (unit.type() === UnitType.City) {
      const endsAt = unit.cooldownEndsAt?.call(unit) ?? undefined;
      const isOnCooldown =
        (endsAt !== undefined && this.game.ticks() < endsAt) ||
        (unit.ticksLeftInCooldown() ?? 0) > 0;
      if (isOnCooldown) {
        borderColor = reloadingColor;
      }
      // Border may be overridden below if upgrade highlight applies
    }

    // Apply reduced-strength highlight to both border and icon if upgrade-eligible
    let highlightEligibleIcon = false;
    let highlightTint = borderColor;
    if (
      !isConstruction &&
      (structureType === UnitType.City ||
        structureType === UnitType.Port ||
        structureType === UnitType.Hospital ||
        structureType === UnitType.Academy ||
        structureType === UnitType.ResearchLab ||
        structureType === UnitType.MissileSilo ||
        structureType === UnitType.SAMLauncher) &&
      this.shouldHighlight(unit)
    ) {
      // Blend neon green with the base border color to reduce intensity
      highlightTint = this.blendHexColors("#00FF8A", borderColor, 0.6);
      borderColor = highlightTint;
      highlightEligibleIcon = true;
    }

    // Draw background shape
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(ICON_DIM / 2, ICON_DIM / 2, ICON_DIM / 2 - 1, 0, Math.PI * 2);
    } else if (shape === "square") {
      const pad = 1;
      ctx.rect(pad, pad, ICON_DIM - pad * 2, ICON_DIM - pad * 2);
    } else if (shape === "triangle") {
      const s = ICON_DIM;
      const half = s / 2;
      ctx.moveTo(half, 1);
      ctx.lineTo(s - 1, s - 1);
      ctx.lineTo(1, s - 1);
      ctx.closePath();
    } else if (shape === "pentagon") {
      const r = ICON_DIM / 2 - 1;
      const cx = ICON_DIM / 2;
      const cy = ICON_DIM / 2;
      const step = (Math.PI * 2) / 5;
      for (let i = 0; i < 5; i++) {
        const angle = step * i - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (shape === "octagon") {
      const r = ICON_DIM / 2 - 1;
      const cx = ICON_DIM / 2;
      const cy = ICON_DIM / 2;
      const step = (Math.PI * 2) / 8;
      for (let i = 0; i < 8; i++) {
        const angle = step * i - Math.PI / 8;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    // Apply alpha to interior fill
    const prevAlpha = ctx.globalAlpha;
    if (!isConstruction) {
      ctx.globalAlpha = 1;
    }
    ctx.fill();
    ctx.globalAlpha = prevAlpha;

    // Stroke border on top
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1; // logical pixel; turns into crisp 2px at 2x quality
    ctx.stroke();

    // Get themed icon based on unit's iconThemeId
    const themeMap = this.structures.get(structureType);
    if (!themeMap) {
      console.warn(`No themed icons found for unit type: ${structureType}`);
      return PIXI.Texture.from(canvas);
    }

    // Get the theme ID from the unit, default to 'neutral'
    const iconThemeId = (unit.iconThemeId?.() ?? "neutral") as ThemeId;
    let structureInfo = themeMap.get(iconThemeId);

    // Fallback to neutral if the requested theme isn't loaded
    if (!structureInfo?.image && iconThemeId !== "neutral") {
      structureInfo = themeMap.get("neutral");
    }

    if (!structureInfo?.image) {
      console.warn(
        `Image not loaded for unit type: ${structureType}, theme: ${iconThemeId}`,
      );
      return PIXI.Texture.from(canvas);
    }

    // Draw icon: center+scale for a subset of unit types; otherwise use fixed offsets
    const SHAPE_OFFSETS: Record<BgShape, [number, number]> = {
      triangle: [6, 11],
      square: [5, 5],
      octagon: [6, 6],
      pentagon: [7, 7],
      circle: [6, 6],
    };
    const colored = this.getImageColored(
      structureInfo.image,
      highlightEligibleIcon ? highlightTint : borderColor,
    );

    // Only center-scale themed icons (250x250px), not small legacy silhouettes (~16px)
    const iw = Math.max(1, colored.width);
    const ih = Math.max(1, colored.height);
    const isLargeThemedIcon = iw > 32 || ih > 32; // Threshold to detect 250px themed icons vs 16px legacy

    const centerScaledTypes = new Set<UnitType>([
      UnitType.Airfield,
      UnitType.Hospital,
      UnitType.Academy,
      UnitType.ResearchLab,
    ]);

    // Old structures that need to be scaled down by 30%
    const legacyStructureTypes = new Set<UnitType>([
      UnitType.City,
      UnitType.Port,
      UnitType.MissileSilo,
      UnitType.SAMLauncher,
      UnitType.DefensePost,
    ]);

    const shouldCenterScale =
      isLargeThemedIcon && centerScaledTypes.has(structureType as UnitType);
    const isLegacyStructure = legacyStructureTypes.has(
      structureType as UnitType,
    );

    if (shouldCenterScale) {
      // Center-scale logic for large themed icons
      const padded = 4;
      const maxW = ICON_DIM - padded * 2;
      const maxH = ICON_DIM - padded * 2;
      const baseScale = Math.min(maxW / iw, maxH / ih);
      const factor =
        StructureLayer.ICON_DRAW_SCALE[structureType as UnitType] ?? 1;
      // Allow slight oversize within canvas; clamp to canvas bounds
      const dw = Math.min(
        ICON_DIM,
        Math.max(1, Math.round(iw * baseScale * factor)),
      );
      const dh = Math.min(
        ICON_DIM,
        Math.max(1, Math.round(ih * baseScale * factor)),
      );
      const dx = Math.round((ICON_DIM - dw) / 2);
      const dy = Math.round((ICON_DIM - dh) / 2);
      ctx.drawImage(colored, dx, dy, dw, dh);
    } else if (isLargeThemedIcon) {
      // For large themed icons that don't need centering
      // Apply 30% reduction for legacy structures
      const legacyScale = isLegacyStructure ? 0.7 : 1.0;

      // Special vertical offset for missile silos to move them down
      const verticalOffset = structureType === UnitType.MissileSilo ? 3 : 0;

      if (iw > ICON_DIM || ih > ICON_DIM) {
        const scale = Math.min(ICON_DIM / iw, ICON_DIM / ih) * legacyScale;
        const dw = Math.round(iw * scale);
        const dh = Math.round(ih * scale);
        const dx = Math.round((ICON_DIM - dw) / 2);
        const dy = Math.round((ICON_DIM - dh) / 2) + verticalOffset;
        ctx.drawImage(colored, dx, dy, dw, dh);
      } else {
        // Fits within bounds, center it with legacy scale
        const scaledW = Math.round(iw * legacyScale);
        const scaledH = Math.round(ih * legacyScale);
        const dx = Math.round((ICON_DIM - scaledW) / 2);
        const dy = Math.round((ICON_DIM - scaledH) / 2) + verticalOffset;
        ctx.drawImage(colored, dx, dy, scaledW, scaledH);
      }
    } else {
      // Legacy small icons: use fixed offsets and scale down by 30%
      const legacyScale = 0.7; // Make 30% smaller
      const [offX, offY] = SHAPE_OFFSETS[shape] ?? [4, 4];
      const factor =
        StructureLayer.ICON_DRAW_SCALE[structureType as UnitType] ?? 1;

      // Apply legacy scale to make icons smaller
      const scaledWidth = Math.round(iw * legacyScale * factor);
      const scaledHeight = Math.round(ih * legacyScale * factor);

      const dw = Math.min(ICON_DIM, Math.max(1, scaledWidth));
      const dh = Math.min(ICON_DIM, Math.max(1, scaledHeight));
      // Keep original offset positioning
      ctx.drawImage(colored, offX, offY, dw, dh);
    }

    const texture = PIXI.Texture.from(canvas);
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  private shouldHighlight(unit: UnitView): boolean {
    if (!this.upgradeMode) return false;
    const me = this.game.myPlayer();
    if (!me) return false;
    if (unit.type() === UnitType.Construction) return false;
    if (!this.isUpgradeableStructure(unit)) return false;
    return unit.owner().id() === me.id() && this.canAffordUpgrade(unit);
  }

  private createPixiSprite(unit: UnitView): PIXI.Sprite {
    const sprite = new PIXI.Sprite(this.createTexture(unit));
    sprite.anchor.set(0.5, 0.5);
    const tile = unit.tile();
    const worldX = this.game.x(tile);
    const worldY = this.game.y(tile);
    const screenPos = this.transformHandler.worldToScreenCoordinates(
      new Cell(worldX, worldY),
    );
    sprite.x = screenPos.x;
    sprite.y = screenPos.y;
    sprite.scale.set(this.iconScreenScale());
    // Add sprite below label container so labels render on top
    this.stage.addChildAt(sprite, Math.max(0, this.stage.children.length - 1));
    return sprite;
  }

  private iconScreenScale(): number {
    // Structures now scale proportionally with map zoom at all levels
    // This keeps them at a constant world-space size relative to tiles
    // Prevents pixelation when zoomed in and "growing" effect when zoomed out
    // 0.5 multiplier makes structures approximately 50% smaller
    return (this.transformHandler.scale / ICON_TEXTURE_QUALITY) * 0.5;
  }

  private getImageColored(
    image: HTMLImageElement,
    color: string,
  ): HTMLCanvasElement {
    const imageCanvas = document.createElement("canvas");
    imageCanvas.width = image.width;
    imageCanvas.height = image.height;
    const ctx = imageCanvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(image, 0, 0);
    return imageCanvas;
  }

  // Blend two hex/rgb color strings by a factor t in [0,1]
  private blendHexColors(c1: string, c2: string, t: number): string {
    const a = colord(c1).toRgb();
    const b = colord(c2).toRgb();
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const r = clamp(a.r * (1 - t) + b.r * t);
    const g = clamp(a.g * (1 - t) + b.g * t);
    const bch = clamp(a.b * (1 - t) + b.b * t);
    return colord({ r, g, b: bch }).toHex();
  }

  private computeNewLocation(render: StructureRenderInfo) {
    const tile = render.unit.tile();
    const worldX = this.game.x(tile);
    const worldY = this.game.y(tile);
    const screenPos = this.transformHandler.worldToScreenCoordinates(
      new Cell(worldX, worldY),
    );
    screenPos.x = Math.round(screenPos.x);
    screenPos.y = Math.round(screenPos.y);

    // Margin reflects the current icon's shape size scaled on screen
    const unitType =
      render.unit.type() === UnitType.Construction
        ? render.unit.constructionType()
        : render.unit.type();
    const shape: BgShape =
      unitType !== undefined
        ? (STRUCTURE_BG_SHAPES[unitType as UnitType] ?? "circle")
        : "circle";
    const iconDim = ICON_SIZES[shape] ?? ICON_SIZE;
    const margin = iconDim * this.iconScreenScale();
    const onScreen =
      screenPos.x + margin > 0 &&
      screenPos.x - margin < this.pixicanvas.width &&
      screenPos.y + margin > 0 &&
      screenPos.y - margin < this.pixicanvas.height;

    if (onScreen) {
      render.pixiSprite.x = screenPos.x;
      render.pixiSprite.y = screenPos.y;
      render.pixiSprite.scale.set(this.iconScreenScale());
    }
    if (render.isOnScreen !== onScreen) {
      render.isOnScreen = onScreen;
      render.pixiSprite.visible = onScreen;
    }
  }

  private isUnitTypeSupported(unitType: UnitType): boolean {
    return this.structures.has(unitType);
  }

  private findStructureUnitAtCell(
    cell: { x: number; y: number },
    maxDistance: number = 10,
  ): UnitView | null {
    const targetRef = this.game.ref(cell.x, cell.y);
    const allUnitTypes = Object.values(UnitType);
    const nearby = this.game.nearbyUnits(targetRef, maxDistance, allUnitTypes);
    for (const { unit } of nearby) {
      if (unit.isActive() && this.isUnitTypeSupported(unit.type())) {
        return unit;
      }
    }
    return null;
  }

  private onMouseUp(event: MouseUpEvent) {
    const cell = this.transformHandler.screenToWorldCoordinates(
      event.x,
      event.y,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return;
    }

    const clickedUnit = this.findStructureUnitAtCell(cell);
    this.previouslySelected = this.selectedStructureUnit;

    if (clickedUnit) {
      if (clickedUnit.owner() !== this.game.myPlayer()) {
        return;
      }
      // In upgrade mode: attempt to upgrade structure (City/Port/Hospital/Academy/ResearchLab/MissileSilo/SAMLauncher) immediately
      if (
        this.upgradeMode &&
        (clickedUnit.type() === UnitType.City ||
          clickedUnit.type() === UnitType.Port ||
          clickedUnit.type() === UnitType.Hospital ||
          clickedUnit.type() === UnitType.Academy ||
          clickedUnit.type() === UnitType.ResearchLab ||
          clickedUnit.type() === UnitType.MissileSilo ||
          clickedUnit.type() === UnitType.SAMLauncher)
      ) {
        // Only if affordable
        // And only if not at level cap for Missile Silo
        if (
          clickedUnit.type() === UnitType.MissileSilo &&
          clickedUnit.level() >= 3
        ) {
          return;
        }
        // SAMs also cap at level 3
        if (
          clickedUnit.type() === UnitType.SAMLauncher &&
          clickedUnit.level() >= 3
        ) {
          return;
        }
        if (this.canAffordUpgrade(clickedUnit)) {
          // Fire transport event to send intent; rely on server update to change level
          this.eventBus.emit(
            new SendUpgradeStructureIntentEvent(
              clickedUnit.id(),
              clickedUnit.type(),
            ),
          );
        }
        return; // Do not change selection while upgrading
      }
      const wasSelected = this.previouslySelected === clickedUnit;
      if (wasSelected) {
        this.selectedStructureUnit = null;
      } else {
        this.selectedStructureUnit = clickedUnit;
      }
    } else {
      this.selectedStructureUnit = null;
    }
  }

  private onMouseMove(event: MouseMoveEvent) {
    const cell = this.transformHandler.screenToWorldCoordinates(
      event.x,
      event.y,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      if (this.hoveredStructure) {
        this.hoveredStructure = null;
        // Clear labels immediately
        this.labelContainer.removeChildren();
        this.shouldRedraw = true;
        if (this.renderer) {
          // Render directly; any rare error (context lost, disposed mid-frame) should surface during development.
          this.renderer.render(this.stage);
        }
      }
      return;
    }
    const hovered = this.findStructureUnitAtCell(cell);
    const effectiveUnit =
      hovered && hovered.type() !== UnitType.Construction ? hovered : null;
    if (effectiveUnit !== this.hoveredStructure) {
      this.hoveredStructure = effectiveUnit;
      if (effectiveUnit) this.ensureStructureLevels(effectiveUnit);
      this.updateLabels(); // updateLabels already forces a render when a structure is hovered
    }
  }

  private ensureStructureLevels(unit: UnitView) {
    const id = unit.id();
    if (
      !this.structureLevels.has(id) &&
      unit.type() !== UnitType.Construction
    ) {
      // Initialize with server level (typically 1 unless upgraded before client joined)
      this.structureLevels.set(id, { primary: unit.level(), secondary: 0 });
    } else if (this.structureLevels.has(id)) {
      // Keep in sync with authoritative server level each tick/render cycle
      const rec = this.structureLevels.get(id)!;
      rec.primary = unit.level();
    }
  }

  private relationshipColorHexStr(unit: UnitView): string {
    const my = this.game.myPlayer();
    let c = this.theme.enemyColor();
    if (my) {
      if (unit.owner() === my) c = this.theme.selfColor();
      else if (my.isFriendly(unit.owner())) c = this.theme.allyColor();
    }
    // Ensure single leading '#'
    const raw = c.toHex().replace(/^#/, "").toLowerCase();
    return `#${raw} `;
  }

  private updateLabels() {
    // Clear existing labels
    this.labelContainer.removeChildren();

    // 1) If hovering a structure, show its levels ABOVE (existing behavior)
    const unit = this.hoveredStructure;
    if (unit && unit.type() !== UnitType.Construction) {
      const levels = this.structureLevels.get(unit.id());
      if (levels) {
        const tile = unit.tile();
        const worldX = this.game.x(tile);
        const worldY = this.game.y(tile);
        const screenPos = this.transformHandler.worldToScreenCoordinates(
          new Cell(worldX, worldY),
        );
        const shape: BgShape =
          STRUCTURE_BG_SHAPES[unit.type() as UnitType] ?? "circle";
        const iconDim = ICON_SIZES[shape] ?? ICON_SIZE;
        const scale = this.iconScreenScale();

        const baseColorStr = this.relationshipColorHexStr(unit); // "#RRGGBB"
        const baseRaw = baseColorStr.replace(/^#/, "");
        const secondaryRaw = colord(`#${baseRaw} `)
          .desaturate(0.2)
          .lighten(0.35)
          .toHex()
          .replace(/^#/, "");
        const baseFill = parseInt(baseRaw, 16);
        const secondaryFill = parseInt(secondaryRaw, 16);
        const fontSize = Math.max(10, Math.round(iconDim * scale * 0.55));
        const stylePrimary = new PIXI.TextStyle({
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize,
          fontWeight: "600",
          fill: baseFill,
          align: "center",
        });
        const styleSecondary = new PIXI.TextStyle({
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize,
          fontWeight: "600",
          fill: secondaryFill,
          align: "center",
        });

        const tPrimary = new PIXI.Text(String(levels.primary), stylePrimary);
        const showSecondary = (levels.secondary ?? 0) > 0;
        const tSecondary = showSecondary
          ? new PIXI.Text(String(levels.secondary), styleSecondary)
          : null;
        const gap = Math.round(fontSize * 0.4);
        const paddingX = Math.round(fontSize * 0.5);
        const paddingY = Math.round(fontSize * 0.35);
        const contentWidth = showSecondary
          ? tPrimary.width + (tSecondary?.width ?? 0) + gap
          : tPrimary.width;
        const contentHeight = showSecondary
          ? Math.max(tPrimary.height, tSecondary!.height)
          : tPrimary.height;
        const pillWidth = contentWidth + paddingX * 2;
        const pillHeight = contentHeight + paddingY * 2;
        const bg = new PIXI.Graphics();
        const bgX = Math.round(screenPos.x - pillWidth / 2);
        const bgY = Math.round(
          screenPos.y -
            (iconDim * scale) / 2 -
            pillHeight -
            Math.max(4, Math.round(6 * scale)),
        );
        bg.roundRect(
          bgX,
          bgY,
          pillWidth,
          pillHeight,
          Math.min(14, fontSize),
        ).fill({
          color: 0x000000,
          alpha: 0.55,
        });
        this.labelContainer.addChild(bg);
        if (showSecondary && tSecondary) {
          tPrimary.x = bgX + paddingX;
          tPrimary.y = bgY + Math.round((pillHeight - tPrimary.height) / 2);
          tSecondary.x = tPrimary.x + tPrimary.width + gap;
          tSecondary.y = bgY + Math.round((pillHeight - tSecondary.height) / 2);
          this.labelContainer.addChild(tPrimary, tSecondary);
        } else {
          tPrimary.x = bgX + Math.round((pillWidth - tPrimary.width) / 2);
          tPrimary.y = bgY + Math.round((pillHeight - tPrimary.height) / 2);
          this.labelContainer.addChild(tPrimary);
        }
      }
    }

    // 2) In upgrade mode, show UPGRADE PRICE BELOW for all upgradeable structures owned by me
    if (this.upgradeMode) {
      const me = this.game.myPlayer();
      if (me) {
        // Style for price labels
        const priceFontSizeBase = 12;
        for (const r of this.renders) {
          const u = r.unit;
          if (!u.isActive()) continue;
          if (u.owner() !== me) continue;
          if (!this.isUpgradeableStructure(u)) continue;

          const tile = u.tile();
          const worldX = this.game.x(tile);
          const worldY = this.game.y(tile);
          const screenPos = this.transformHandler.worldToScreenCoordinates(
            new Cell(worldX, worldY),
          );
          const shape: BgShape =
            STRUCTURE_BG_SHAPES[u.type() as UnitType] ?? "circle";
          const iconDim = ICON_SIZES[shape] ?? ICON_SIZE;
          const scale = this.iconScreenScale();

          const fontSize = Math.max(
            10,
            Math.round(iconDim * scale * 0.5 || priceFontSizeBase),
          );
          // Use green (self relationship color) only when affordable; otherwise white
          const baseColorStr = this.relationshipColorHexStr(u); // "#RRGGBB" (self => green)
          const baseRaw = baseColorStr.replace(/^#/, "");
          const baseFill = parseInt(baseRaw, 16);
          const affordable = this.canAffordUpgradeForType(u.type());
          const fillColor = affordable ? baseFill : 0xffffff;
          const style = new PIXI.TextStyle({
            fontFamily:
              "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fontSize,
            fontWeight: "600",
            fill: fillColor,
            align: "center",
          });
          const priceText = this.formatGoldCompact(
            this.computeUpgradeCostForType(u.type()),
          );
          const t = new PIXI.Text(priceText, style);

          const paddingX = Math.round(fontSize * 0.5);
          const paddingY = Math.round(fontSize * 0.35);
          const pillWidth = t.width + paddingX * 2;
          const pillHeight = t.height + paddingY * 2;
          const bg = new PIXI.Graphics();
          const gapBelow = Math.max(4, Math.round(6 * scale));
          const bgX = Math.round(screenPos.x - pillWidth / 2);
          const bgY = Math.round(
            screenPos.y + (iconDim * scale) / 2 + gapBelow,
          );
          bg.roundRect(
            bgX,
            bgY,
            pillWidth,
            pillHeight,
            Math.min(14, fontSize),
          ).fill({
            color: 0x000000,
            alpha: 0.55,
          });
          this.labelContainer.addChild(bg);
          t.x = bgX + Math.round((pillWidth - t.width) / 2);
          t.y = bgY + Math.round((pillHeight - t.height) / 2);
          this.labelContainer.addChild(t);
        }
      }
    }

    // Request redraw after rebuilding labels
    this.shouldRedraw = true;
    if (this.renderer) {
      this.renderer.render(this.stage);
    }
  }

  public unSelectStructureUnit() {
    if (this.selectedStructureUnit) {
      this.previouslySelected = this.selectedStructureUnit;
      this.selectedStructureUnit = null;
    }
  }

  private deleteStructure(render: StructureRenderInfo) {
    render.pixiSprite?.destroy();
    this.renders = this.renders.filter((r) => r.unit !== render.unit);
    this.seenUnits.delete(render.unit);
  }
}
