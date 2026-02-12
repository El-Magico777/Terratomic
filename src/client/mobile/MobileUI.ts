/**
 * MobileUI - Main entry point for mobile UI system
 * Initializes and coordinates all mobile components
 */

import { EventBus } from "../../core/EventBus";
import { UnitType } from "../../core/game/Game";
import type { TileRef } from "../../core/game/GameMap";
import type { GameView } from "../../core/game/GameView";
import { DragEvent, ZoomEvent } from "../InputHandler";
import {
  BuildUnitIntentEvent,
  SendAllianceRequestIntentEvent,
  SendAttackIntentEvent,
  SendBoatAttackIntentEvent,
  SendBomberIntentEvent,
  SendBreakAllianceIntentEvent,
  SendDeclareWarIntentEvent,
  SendParatrooperAttackIntentEvent,
  SendPeaceRequestIntentEvent,
  SendSpawnIntentEvent,
} from "../Transport";
import type { TransformHandler } from "../graphics/TransformHandler";
import { MobileActionGrid } from "./MobileActionGrid";
import { MobileDetector } from "./MobileDetector";
import { MobileTopBar, TopBarStats } from "./MobileTopBar";
import { GestureDetector } from "./gestures/GestureDetector";
import { MobileEconomyOverlay } from "./overlays/MobileEconomyOverlay";
import { MobileIntelSidebar } from "./overlays/MobileIntelSidebar";
import { MobilePlayerToast } from "./overlays/MobilePlayerToast";
import { MobileResearchSidebar } from "./overlays/MobileResearchSidebar";
import { MobileSettingsSidebar } from "./overlays/MobileSettingsSidebar";
import { HapticFeedback } from "./utils/HapticFeedback";

export class MobileUI {
  private actionGrid: MobileActionGrid;
  private topBar: MobileTopBar;
  private gestureDetector: GestureDetector | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private transformHandler: TransformHandler | null = null;

  // Phase 2 components
  private economyOverlay: MobileEconomyOverlay;

  // Phase 4 components
  private intelSidebar: MobileIntelSidebar;
  private playerToast: MobilePlayerToast;

  // Phase 5 components
  private researchSidebar: MobileResearchSidebar;
  private settingsSidebar: MobileSettingsSidebar;

  // Game state
  private currentGame: GameView | null = null;
  private selectedTile: TileRef | null = null;
  private attackRatio: number = 0.3; // Default 30%
  private active: boolean | null = null;
  private componentsAttached: boolean = false;
  private statsLoopId: number | null = null;
  private economyTab: HTMLButtonElement;

  constructor(private eventBus: EventBus) {
    if (typeof window !== "undefined") {
      (window as Window & { __MOBILE_UI__?: MobileUI }).__MOBILE_UI__ = this;
    }

    // Create and register custom elements
    this.setupCustomElements();

    // Create UI components
    this.actionGrid = document.createElement(
      "mobile-action-grid",
    ) as MobileActionGrid;
    this.topBar = document.createElement("mobile-top-bar") as MobileTopBar;

    // Create Phase 2 components
    this.economyOverlay = document.createElement(
      "mobile-economy-overlay",
    ) as MobileEconomyOverlay;

    // Create Phase 4 components
    this.intelSidebar = document.createElement(
      "mobile-intel-sidebar",
    ) as MobileIntelSidebar;
    this.playerToast = document.createElement(
      "mobile-player-toast",
    ) as MobilePlayerToast;

    // Create Phase 5 components
    this.researchSidebar = document.createElement(
      "mobile-research-sidebar",
    ) as MobileResearchSidebar;
    this.settingsSidebar = document.createElement(
      "mobile-settings-sidebar",
    ) as MobileSettingsSidebar;

    this.economyTab = document.createElement("button");
    this.economyTab.className = "mobile-economy-tab";
    this.economyTab.textContent = "Economy";
    this.economyTab.setAttribute("aria-label", "Open economy panel");

    // Don't attach to DOM yet - wait for setActive(true)
    // Don't call any custom element methods yet - they're not registered until imports complete
    // this.attachComponents(); // Deferred until activation

    // Set up event listeners (will be called after first activation)
    // this.setupEventListeners(); // Deferred until activation
  }

  /**
   * Register custom elements if not already registered
   */
  private setupCustomElements(): void {
    // Import components to ensure they're registered
    import("./MobileActionGrid");
    import("./MobileTopBar");

    // Phase 2 components
    import("./overlays/MobileEconomyOverlay");

    // Phase 4 components
    import("./overlays/MobileIntelSidebar");
    import("./overlays/MobilePlayerToast");

    // Phase 5 components
    import("./overlays/MobileResearchSidebar");
    import("./overlays/MobileSettingsSidebar");
  }

  /**
   * Attach mobile components to the DOM
   */
  private attachComponents(): void {
    document.body.appendChild(this.topBar);
    document.body.appendChild(this.actionGrid);

    // Attach Phase 2 components
    document.body.appendChild(this.economyOverlay);

    // Attach Phase 4 components
    document.body.appendChild(this.intelSidebar);
    document.body.appendChild(this.playerToast);

    // Attach Phase 5 components
    document.body.appendChild(this.researchSidebar);
    document.body.appendChild(this.settingsSidebar);
    document.body.appendChild(this.economyTab);

    // Add viewport meta tag if not present
    this.ensureViewportMeta();
  }

  /**
   * Enable or disable mobile UI visibility and behavior
   */
  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;

    if (active) {
      // Attach components to DOM on first activation
      if (!this.componentsAttached) {
        this.attachComponents();
        this.setupEventListeners();
        this.componentsAttached = true;
      }
      this.topBar.style.display = "";
      this.economyTab.style.display = "";
      document.body.classList.add("mobile-ui-enabled");
      this.injectMobileStyles();
      this.startStatsLoop();
    } else {
      // Only manipulate components if they've been attached
      if (this.componentsAttached) {
        this.topBar.style.display = "none";
        this.economyTab.style.display = "none";
        this.closeAllOverlays();
      }
      document.body.classList.remove("mobile-ui-enabled");
      document.getElementById("mobile-ui-styles")?.remove();
      this.stopStatsLoop();
    }
  }

  /**
   * Start the stats update loop
   */
  private startStatsLoop(): void {
    if (this.statsLoopId !== null) return;

    const updateStats = () => {
      this.updateStatsFromGame();
      this.statsLoopId = requestAnimationFrame(updateStats);
    };
    this.statsLoopId = requestAnimationFrame(updateStats);
  }

  /**
   * Stop the stats update loop
   */
  private stopStatsLoop(): void {
    if (this.statsLoopId !== null) {
      cancelAnimationFrame(this.statsLoopId);
      this.statsLoopId = null;
    }
  }

  /**
   * Update stats from current game state
   */
  private updateStatsFromGame(): void {
    if (!this.currentGame) return;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    const gold = Number(myPlayer.gold());
    const population = myPlayer.population(); // Current population
    const maxPopulation = this.currentGame.config().maxPopulation(myPlayer); // Max population cap

    this.topBar.updateStats({
      population,
      maxPopulation,
      gold,
    });
  }

  private closeAllOverlays(): void {
    this.actionGrid.close();
    this.economyOverlay.close();
    this.intelSidebar.close();
    this.researchSidebar.close();
    this.settingsSidebar.close();
    this.playerToast.hide();
  }

  /**
   * Ensure proper viewport meta tag is set
   */
  private ensureViewportMeta(): void {
    let viewportMeta = document.querySelector(
      'meta[name="viewport"]',
    ) as HTMLMetaElement;

    if (!viewportMeta) {
      viewportMeta = document.createElement("meta");
      viewportMeta.name = "viewport";
      document.head.appendChild(viewportMeta);
    }

    // Set viewport with safe area support
    viewportMeta.content =
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
  }

  /**
   * Inject mobile-specific global styles
   */
  private injectMobileStyles(): void {
    const styleId = "mobile-ui-styles";

    // Don't inject if already present
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      body.mobile-ui-enabled {
        /* Prevent overscroll bounce on iOS */
        overscroll-behavior: none;
        
        /* Prevent text selection during touch */
        user-select: none;
        -webkit-user-select: none;
        
        /* Prevent touch callouts on iOS */
        -webkit-touch-callout: none;
        
        /* Smoother touch interactions */
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Hide desktop-only UI components when mobile is enabled */
      body.mobile-ui-enabled .desktop-only {
        display: none !important;
      }

      /* Hide desktop HUD elements while mobile UI is active */
      body.mobile-ui-enabled #customMenu,
      body.mobile-ui-enabled #radialMenu,
      body.mobile-ui-enabled #settings-button,
      body.mobile-ui-enabled control-panel,
      body.mobile-ui-enabled control-panel2,
      body.mobile-ui-enabled chat-display,
      body.mobile-ui-enabled events-display,
      body.mobile-ui-enabled heads-up-message,
      body.mobile-ui-enabled options-menu,
      body.mobile-ui-enabled replay-panel,
      body.mobile-ui-enabled player-info-overlay,
      /* Hide desktop research button on mobile */
      body.mobile-ui-enabled research-toggle-button,
      body.mobile-ui-enabled game-left-sidebar,
      body.mobile-ui-enabled top-bar,
      body.mobile-ui-enabled .desktop-hud {
        display: none !important;
      }

      /* Compact tutorial and tech notifications on mobile */
      body.mobile-ui-enabled tutorial-toast .tutorial-toast,
      body.mobile-ui-enabled tech-unlock-notification .tech-toast {
        left: 50% !important;
        right: auto !important;
        top: calc(env(safe-area-inset-top, 0px) + 56px) !important;
        bottom: auto !important;
        width: min(92vw, 320px) !important;
        max-height: 28vh !important;
        padding: 10px 32px 10px 12px !important;
        border-radius: 10px !important;
        font-size: 13px !important;
        overflow: hidden !important;
        transform: translate(-50%, -8px) !important;
      }

      body.mobile-ui-enabled tutorial-toast .tutorial-toast.visible,
      body.mobile-ui-enabled tech-unlock-notification .tech-toast.visible {
        transform: translate(-50%, 0) !important;
      }

      body.mobile-ui-enabled tutorial-toast .tutorial-toast__title,
      body.mobile-ui-enabled tech-unlock-notification .tech-toast__title {
        font-size: 14px !important;
      }

      body.mobile-ui-enabled tutorial-toast .tutorial-toast__body,
      body.mobile-ui-enabled tech-unlock-notification .tech-toast__body {
        max-height: 10vh !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      
      /* Game canvas touch optimization */
      body.mobile-ui-enabled canvas {
        touch-action: pan-x pan-y;
      }

      /* Compact research priority modal on mobile */
      body.mobile-ui-enabled .research-priority-banner {
        top: calc(env(safe-area-inset-top, 0px) + 56px) !important;
        width: min(92vw, 460px) !important;
        max-width: 460px !important;
        max-height: calc(100vh - (env(safe-area-inset-top, 0px) + 72px)) !important;
        border-radius: 12px !important;
        font-size: 13px !important;
        z-index: 1700 !important;
      }
      body.mobile-ui-enabled .banner-header {
        padding: 0.6rem 0.9rem !important;
      }
      body.mobile-ui-enabled .banner-title {
        font-size: 15px !important;
      }
      body.mobile-ui-enabled .banner-content {
        padding: 0.75rem 0.9rem !important;
        overflow-y: auto !important;
      }
      body.mobile-ui-enabled .banner-intro {
        font-size: 0.85em !important;
        margin-bottom: 0.7rem !important;
        text-align: left !important;
      }
      body.mobile-ui-enabled .categories-row {
        grid-template-columns: 1fr !important;
        gap: 8px !important;
      }
      body.mobile-ui-enabled .category-tile {
        min-height: 68px !important;
        padding: 10px 12px !important;
        gap: 10px !important;
        flex-direction: row !important;
        align-items: center !important;
        text-align: left !important;
      }
      body.mobile-ui-enabled .category-tile-icon {
        width: 28px !important;
        height: 28px !important;
      }
      body.mobile-ui-enabled .category-tile-name {
        font-size: 0.95em !important;
      }
      body.mobile-ui-enabled .category-tile-desc {
        font-size: 0.7em !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
      }
      body.mobile-ui-enabled .category-tile-badge {
        margin-left: auto !important;
        font-size: 0.65em !important;
      }
      body.mobile-ui-enabled .banner-footer {
        font-size: 0.75em !important;
        padding-top: 0.3rem !important;
      }

      /* Compact research priority confirmation toast on mobile */
      body.mobile-ui-enabled .research-priority-confirmation-toast {
        top: calc(env(safe-area-inset-top, 0px) + 56px) !important;
        width: min(92vw, 300px) !important;
        min-width: 0 !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(-10px) !important;
        font-size: 13px !important;
        z-index: 1700 !important;
      }
      body.mobile-ui-enabled .research-priority-confirmation-toast.show {
        transform: translateX(-50%) translateY(0) !important;
      }

      body.mobile-ui-enabled .mobile-economy-tab {
        position: fixed;
        left: 0;
        top: 50%;
        transform: translate(-4px, -50%);
        padding: 12px 10px;
        min-height: 96px;
        border-radius: 0 12px 12px 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-left: none;
        background: rgba(20, 20, 30, 0.9);
        color: #fbbf24;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        z-index: 1700;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      body.mobile-ui-enabled .mobile-economy-tab:active {
        transform: translate(0, -50%);
      }
      
      /* Support for notched devices */
      @supports (padding: env(safe-area-inset-top)) {
        body.mobile-ui-enabled {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Set up event listeners for UI components
   */
  private setupEventListeners(): void {
    // Top bar menu click
    this.topBar.addEventListener("menu-click", () => {
      this.handleMenuClick();
    });

    // Top bar research click
    this.topBar.addEventListener("research-click", () => {
      this.handleOpenResearchSidebar();
    });

    // Top bar settings click
    this.topBar.addEventListener("settings-click", () => {
      this.handleSettingsClick();
    });

    this.economyTab.addEventListener("click", () => {
      this.economyOverlay.open();
    });

    this.economyTab.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.economyOverlay.open();
    });

    // Economy overlay closed
    this.economyOverlay.addEventListener("overlay-closed", () => {
      // Economy overlay closed
    });

    this.economyOverlay.addEventListener("attack-ratio-changed", (e: Event) => {
      const event = e as CustomEvent<{ ratio: number }>;
      this.attackRatio = event.detail.ratio;
    });

    // Phase 4: Intel sidebar closed
    this.intelSidebar.addEventListener("sidebar-closed", () => {
      // Intel sidebar closed
    });

    // Phase 4: Player selected from sidebar
    this.intelSidebar.addEventListener("player-selected", (e: Event) => {
      const event = e as CustomEvent<{ player: any }>;
      // Player selected from sidebar
    });

    // Phase 4: Player toast clicked
    this.playerToast.addEventListener("toast-clicked", (e: Event) => {
      const event = e as CustomEvent<{ player: any }>;
      // Open intel sidebar when toast is tapped
      this.intelSidebar.open();
    });

    // Action grid: Action selected
    this.actionGrid.addEventListener("action-selected", (e: Event) => {
      const event = e as CustomEvent<{ action: string }>;
      this.handleActionSelected(event.detail.action);
    });

    // Action grid: Grid closed
    this.actionGrid.addEventListener("grid-closed", () => {
      // Action grid closed
    });

    // Phase 5: Research sidebar closed
    this.researchSidebar.addEventListener("sidebar-closed", () => {
      // Research sidebar closed
    });

    // Phase 5: Settings sidebar closed
    this.settingsSidebar.addEventListener("sidebar-closed", () => {
      // Settings sidebar closed
    });

    // Handle orientation changes
    window.addEventListener("orientationchange", () => {
      this.handleOrientationChange();
    });
  }

  /**
   * Initialize gesture detection on the game canvas
   */
  initializeGestureDetection(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.gestureDetector = new GestureDetector(canvas);

    // Register gesture callbacks
    this.gestureDetector.on("tap", (gesture) => {
      this.handleMapTap(gesture.position);
    });

    this.gestureDetector.on("long-press", (gesture) => {
      this.economyOverlay.open();
    });

    this.gestureDetector.on("edge-swipe-left", (gesture) => {
      this.handleOpenIntelSidebar();
    });

    this.gestureDetector.on("edge-swipe-right", (gesture) => {
      this.handleOpenResearchSidebar();
    });

    this.gestureDetector.on("pinch", (gesture) => {
      if (!gesture.scale || !this.canvas) return;

      // Calculate zoom delta from scale (scale > 1 = zoom in, scale < 1 = zoom out)
      const delta = (1 - gesture.scale) * 600;

      // Use center of canvas as zoom point
      const rect = this.canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      this.eventBus.emit(new ZoomEvent(centerX, centerY, delta));
    });

    this.gestureDetector.on("drag", (gesture) => {
      if (!gesture.delta) return;
      this.eventBus.emit(new DragEvent(gesture.delta.x, gesture.delta.y));
    });
  }

  /**
   * Update game stats in the top bar
   */
  updateStats(stats: TopBarStats): void {
    this.topBar.updateStats(stats);
  }

  /**
   * Update game state
   */
  updateGameState(game: GameView): void {
    const isNewGame = this.currentGame !== game;
    this.currentGame = game;

    // Update Phase 4 components with game state
    this.intelSidebar.game = game;
    this.playerToast.game = game;

    // Update Phase 5 components with game state
    this.researchSidebar.game = game;
    this.researchSidebar.eventBus = this.eventBus;
    this.settingsSidebar.game = game;
    this.settingsSidebar.eventBus = this.eventBus;
    this.economyOverlay.game = game;
    this.economyOverlay.eventBus = this.eventBus;

    if (isNewGame) {
      this.economyOverlay.resetInvestmentDefaults();
    }
  }

  /**
   * Provide renderer transform handler for screen-to-tile conversion
   */
  setTransformHandler(transformHandler: TransformHandler): void {
    this.transformHandler = transformHandler;
  }

  private async tryExpandOnEmptyTile(): Promise<boolean> {
    if (!this.currentGame || !this.selectedTile) {
      return false;
    }

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) {
      return false;
    }

    const owner = this.currentGame.owner(this.selectedTile);
    if (owner === myPlayer) {
      return false;
    }

    // Only auto-expand on neutral (non-player) land tiles
    if (owner.isPlayer()) {
      return false;
    }

    if (!this.currentGame.isLand(this.selectedTile)) {
      return false;
    }

    const troops = this.attackRatio * myPlayer.troops();

    // Check if we need a boat attack (target is land but requires crossing water)
    const actions = await myPlayer.actions(this.selectedTile);

    if (actions.canAttack) {
      // Ground attack is possible
      this.eventBus.emit(new SendAttackIntentEvent(owner.id(), troops));
      return true;
    }

    // Check if boat attack is possible
    const transportShipBuildable = actions.buildableUnits.find(
      (bu) => bu.type === UnitType.TransportShip,
    );
    if (
      transportShipBuildable &&
      transportShipBuildable.canBuild !== false &&
      this.currentGame.isLand(this.selectedTile)
    ) {
      // Need boat attack - find best spawn port
      const spawn = await myPlayer.bestTransportShipSpawn(this.selectedTile);
      this.eventBus.emit(
        new SendBoatAttackIntentEvent(
          owner.id(),
          this.selectedTile,
          troops,
          spawn === false ? null : spawn,
        ),
      );
      return true;
    }

    // Cannot attack by ground or boat
    return false;
  }

  /**
   * Handle build item selected from action grid
   */
  private handleBuildItemSelected(action: string): void {
    const unitType = this.parseBuildAction(action);

    if (!unitType) {
      return;
    }

    // Build directly on selected tile (always available since ActionGrid requires tile tap)
    if (this.selectedTile) {
      this.eventBus.emit(new BuildUnitIntentEvent(unitType, this.selectedTile));
      HapticFeedback.success();
    }
  }

  private parseBuildAction(action: string): UnitType | null {
    if (!action.startsWith("build:")) {
      return action as UnitType;
    }
    const unitType = action.slice("build:".length) as UnitType;
    return unitType || null;
  }

  /**
   * Handle attack item selected from action grid
   */
  private handleAttackItemSelected(action: string): void {
    if (!this.currentGame || !this.selectedTile) return;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    const owner = this.currentGame.owner(this.selectedTile);
    const troops = Math.floor(Number(myPlayer.troops()) * this.attackRatio);

    switch (action) {
      case "attack:ground":
        // Ground attack
        this.eventBus.emit(
          new SendAttackIntentEvent(
            owner && owner.isPlayer() ? owner.id() : null,
            troops,
          ),
        );
        HapticFeedback.success();
        break;

      case "attack:naval":
        // Naval assault
        this.eventBus.emit(
          new SendBoatAttackIntentEvent(
            owner && owner.isPlayer() ? owner.id() : null,
            this.selectedTile,
            troops,
            null,
          ),
        );
        HapticFeedback.success();
        break;

      case "attack:airstrike":
        // Air strike (paratrooper)
        this.eventBus.emit(
          new SendParatrooperAttackIntentEvent(
            owner && owner.isPlayer() ? owner.id() : null,
            this.selectedTile,
            troops,
          ),
        );
        HapticFeedback.success();
        break;

      case "attack:bomber":
        // Bomber run - target all structures
        const allStructures = [
          UnitType.City,
          UnitType.DefensePost,
          UnitType.SAMLauncher,
          UnitType.MissileSilo,
          UnitType.Port,
          UnitType.Airfield,
          UnitType.Hospital,
          UnitType.Academy,
          UnitType.ResearchLab,
          UnitType.Factory,
          UnitType.DoomsdayDevice,
        ];
        this.eventBus.emit(
          new SendBomberIntentEvent(
            owner && owner.isPlayer() ? owner.id() : null,
            allStructures,
            true, // closestFirst
          ),
        );
        HapticFeedback.success();
        break;

      case "attack:declare-war":
        // Declare war
        if (owner && owner.isPlayer()) {
          this.eventBus.emit(
            new SendDeclareWarIntentEvent(myPlayer, owner as any),
          );
          HapticFeedback.success();
        }
        break;

      case "attack:nuke-atom":
        // Launch atom bomb
        this.eventBus.emit(
          new BuildUnitIntentEvent(UnitType.AtomBomb, this.selectedTile),
        );
        HapticFeedback.success();
        break;

      case "attack:nuke-hbomb":
        // Launch H-bomb
        this.eventBus.emit(
          new BuildUnitIntentEvent(UnitType.HydrogenBomb, this.selectedTile),
        );
        HapticFeedback.success();
        break;

      case "attack:nuke-mirv":
        // Launch MIRV
        this.eventBus.emit(
          new BuildUnitIntentEvent(UnitType.MIRV, this.selectedTile),
        );
        HapticFeedback.success();
        break;

      case "attack:mark-target":
        // Mark target for bomber priority - feature not yet implemented
        break;

      case "attack:view-intel":
        // Open Intel sidebar
        this.intelSidebar.open();
        HapticFeedback.tap();
        break;

      default:
      // Unknown attack action
    }
  }

  /**
   * Handle diplomacy item selected from action grid
   */
  private handleDiplomacyItemSelected(action: string): void {
    if (!this.currentGame || !this.selectedTile) return;

    const owner = this.currentGame.owner(this.selectedTile);
    if (!owner.isPlayer()) return;

    // After isPlayer check, we know it's a PlayerView
    const targetPlayer = owner as import("../../core/game/GameView").PlayerView;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    switch (action) {
      case "diplomacy:propose-ally":
        // Send alliance request
        this.eventBus.emit(
          new SendAllianceRequestIntentEvent(myPlayer, targetPlayer),
        );
        HapticFeedback.success();
        break;

      case "diplomacy:break-alliance":
        // Break alliance
        this.eventBus.emit(
          new SendBreakAllianceIntentEvent(myPlayer, targetPlayer),
        );
        HapticFeedback.success();
        break;

      case "diplomacy:request-peace":
        // Request peace
        this.eventBus.emit(
          new SendPeaceRequestIntentEvent(myPlayer, targetPlayer),
        );
        HapticFeedback.success();
        break;

      case "diplomacy:send-emoji":
        // TODO: Show emoji picker
        break;

      case "diplomacy:donate-troops":
        // TODO: Show troop donation picker
        break;

      case "diplomacy:view-player":
        // Open Intel sidebar
        this.intelSidebar.open();
        HapticFeedback.tap();
        break;

      default:
      // Unknown diplomacy action
    }
  }

  /**
   * Handle action selected from action grid
   * Routes to appropriate handlers based on action prefix
   */
  private async handleActionSelected(action: string): Promise<void> {
    // Close the action grid
    this.actionGrid.close();

    if (!this.currentGame || !this.selectedTile) {
      return;
    }

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) {
      return;
    }

    // Spawn action
    if (action === "spawn") {
      if (
        this.currentGame.isLand(this.selectedTile) &&
        !this.currentGame.hasOwner(this.selectedTile)
      ) {
        this.eventBus.emit(new SendSpawnIntentEvent(this.selectedTile));
        HapticFeedback.success();
      }
      return;
    }

    // Build actions
    if (action.startsWith("build:")) {
      this.handleBuildItemSelected(action);
      return;
    }

    // Attack actions
    if (action.startsWith("attack:")) {
      this.handleAttackItemSelected(action);
      return;
    }

    // Diplomacy actions
    if (action.startsWith("diplomacy:")) {
      this.handleDiplomacyItemSelected(action);
      return;
    }
  }

  /**
   * Handle map tap (for tile selection)
   */
  private handleMapTap(position: { x: number; y: number }): void {
    const tile = this.screenToTile(position);
    if (!tile) {
      return;
    }
    this.selectedTile = tile;

    if (!this.currentGame) return;

    // Handle spawn phase directly - emit spawn event immediately
    if (this.currentGame.inSpawnPhase()) {
      if (this.currentGame.isLand(tile) && !this.currentGame.hasOwner(tile)) {
        this.eventBus.emit(new SendSpawnIntentEvent(tile));
      }
      return;
    }

    // Show player toast for enemy/ally tiles
    const myPlayer = this.currentGame.myPlayer();
    if (myPlayer) {
      const owner = this.currentGame.owner(tile);
      if (owner.isPlayer() && owner !== myPlayer) {
        // Show toast for enemy/ally players
        this.playerToast.show(
          owner as import("../../core/game/GameView").PlayerView,
          3000,
        );
        HapticFeedback.tap();
      }
    }

    // For normal gameplay, show action grid
    this.actionGrid.showForTile(tile, this.currentGame, this.attackRatio);
  }

  /**
   * Convert screen position to tile coordinates
   */
  private screenToTile(position: { x: number; y: number }): TileRef | null {
    if (!this.currentGame || !this.transformHandler) {
      return null;
    }

    const cell = this.transformHandler.screenToWorldCoordinates(
      position.x,
      position.y,
    );

    if (!this.currentGame.isValidCoord(cell.x, cell.y)) {
      return null;
    }

    return this.currentGame.ref(cell.x, cell.y);
  }

  /**
   * Handle menu button click (open Intel sidebar)
   */
  private handleMenuClick(): void {
    this.handleOpenIntelSidebar();
  }

  /**
   * Handle settings button click
   */
  private handleSettingsClick(): void {
    this.settingsSidebar.toggle();
  }

  /**
   * Handle opening Intel sidebar
   */
  private handleOpenIntelSidebar(): void {
    this.intelSidebar.toggle();
  }

  /**
   * Handle opening Research sidebar
   */
  private handleOpenResearchSidebar(): void {
    this.researchSidebar.toggle();
  }

  /**
   * Handle orientation changes
   */
  private handleOrientationChange(): void {
    const orientation = MobileDetector.getOrientation();
    // Orientation changed
  }

  /**
   * Clean up mobile UI
   */
  destroy(): void {
    // Remove components from DOM
    this.topBar.remove();
    this.actionGrid.remove();
    this.economyOverlay.remove();
    this.intelSidebar.remove();
    this.playerToast.remove();
    this.researchSidebar.remove();
    this.settingsSidebar.remove();
    this.economyTab.remove();

    // Clean up gesture detector
    if (this.gestureDetector) {
      this.gestureDetector.destroy();
    }

    // Remove mobile class from body
    document.body.classList.remove("mobile-ui-enabled");

    // Remove injected styles
    document.getElementById("mobile-ui-styles")?.remove();

    if (typeof window !== "undefined") {
      const win = window as Window & { __MOBILE_UI__?: MobileUI };
      if (win.__MOBILE_UI__ === this) {
        delete win.__MOBILE_UI__;
      }
    }
  }
}
