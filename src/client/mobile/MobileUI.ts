/**
 * MobileUI - Main entry point for mobile UI system
 * Initializes and coordinates all mobile components
 */

import { EventBus } from "../../core/EventBus";
import { UnitType } from "../../core/game/Game";
import type { TileRef } from "../../core/game/GameMap";
import type { GameView } from "../../core/game/GameView";
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
import { ButtonState, MobileContextButton } from "./MobileContextButton";
import { MobileDetector } from "./MobileDetector";
import { MobileTopBar, TopBarStats } from "./MobileTopBar";
import { GestureDetector } from "./gestures/GestureDetector";
import { MobileAttackRatioSlider } from "./overlays/MobileAttackRatioSlider";
import { MobileEconomyOverlay } from "./overlays/MobileEconomyOverlay";
import { MobileIntelSidebar } from "./overlays/MobileIntelSidebar";
import { MobilePlacementMode } from "./overlays/MobilePlacementMode";
import { MobilePlayerToast } from "./overlays/MobilePlayerToast";
import { MobileResearchSidebar } from "./overlays/MobileResearchSidebar";
import { MobileAttackPopup } from "./popups/MobileAttackPopup";
import { MobileBuildPopup } from "./popups/MobileBuildPopup";
import { MobileDiplomacyPopup } from "./popups/MobileDiplomacyPopup";
import { MobileUnitActionPopup } from "./popups/MobileUnitActionPopup";

export class MobileUI {
  private actionGrid: MobileActionGrid;
  private contextButton: MobileContextButton;
  private topBar: MobileTopBar;
  private gestureDetector: GestureDetector | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private transformHandler: TransformHandler | null = null;
  private popupReadyPromise: Promise<void> | null = null;

  // Phase 2 components
  private buildPopup: MobileBuildPopup;
  private placementMode: MobilePlacementMode;
  private economyOverlay: MobileEconomyOverlay;

  // Phase 3 components
  private attackPopup: MobileAttackPopup;
  private attackRatioSlider: MobileAttackRatioSlider;
  private unitActionPopup: MobileUnitActionPopup;

  // Phase 4 components
  private diplomacyPopup: MobileDiplomacyPopup;
  private intelSidebar: MobileIntelSidebar;
  private playerToast: MobilePlayerToast;

  // Phase 5 components
  private researchSidebar: MobileResearchSidebar;

  // Game state
  private currentGame: GameView | null = null;
  private selectedTile: TileRef | null = null;
  private attackRatio: number = 0.3; // Default 30%
  private active: boolean | null = null;
  private componentsAttached: boolean = false;
  private statsLoopId: number | null = null;

  constructor(private eventBus: EventBus) {
    console.log("[MobileUI] Initializing mobile UI system");

    if (typeof window !== "undefined") {
      (window as Window & { __MOBILE_UI__?: MobileUI }).__MOBILE_UI__ = this;
    }

    // Create and register custom elements
    this.setupCustomElements();

    // Create UI components
    this.actionGrid = document.createElement(
      "mobile-action-grid",
    ) as MobileActionGrid;
    this.contextButton = document.createElement(
      "mobile-context-button",
    ) as MobileContextButton;
    this.topBar = document.createElement("mobile-top-bar") as MobileTopBar;

    // Create Phase 2 components
    this.buildPopup = document.createElement(
      "mobile-build-popup",
    ) as MobileBuildPopup;
    this.placementMode = document.createElement(
      "mobile-placement-mode",
    ) as MobilePlacementMode;
    this.economyOverlay = document.createElement(
      "mobile-economy-overlay",
    ) as MobileEconomyOverlay;

    // Create Phase 3 components
    this.attackPopup = document.createElement(
      "mobile-attack-popup",
    ) as MobileAttackPopup;
    this.attackRatioSlider = document.createElement(
      "mobile-attack-ratio-slider",
    ) as MobileAttackRatioSlider;
    this.unitActionPopup = document.createElement(
      "mobile-unit-action-popup",
    ) as MobileUnitActionPopup;

    // Create Phase 4 components
    this.diplomacyPopup = document.createElement(
      "mobile-diplomacy-popup",
    ) as MobileDiplomacyPopup;
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

    // Don't attach to DOM yet - wait for setActive(true)
    // Don't call any custom element methods yet - they're not registered until imports complete
    // this.attachComponents(); // Deferred until activation

    // Set up event listeners (will be called after first activation)
    // this.setupEventListeners(); // Deferred until activation

    console.log(
      "[MobileUI] Mobile UI system initialized (components not attached yet)",
    );
  }

  /**
   * Register custom elements if not already registered
   */
  private setupCustomElements(): void {
    // Import components to ensure they're registered
    import("./MobileActionGrid");
    import("./MobileContextButton");
    import("./MobileTopBar");

    // Phase 2 components
    import("./popups/MobileBuildPopup");
    import("./overlays/MobilePlacementMode");
    import("./overlays/MobileEconomyOverlay");

    // Phase 3 components
    import("./popups/MobileAttackPopup");
    import("./overlays/MobileAttackRatioSlider");
    import("./popups/MobileUnitActionPopup");

    // Phase 4 components
    import("./popups/MobileDiplomacyPopup");
    import("./overlays/MobileIntelSidebar");
    import("./overlays/MobilePlayerToast");

    // Phase 5 components
    import("./overlays/MobileResearchSidebar");

    // Action grid
    import("./MobileActionGrid");
  }

  /**
   * Attach mobile components to the DOM
   */
  private attachComponents(): void {
    document.body.appendChild(this.topBar);
    document.body.appendChild(this.actionGrid);
    document.body.appendChild(this.contextButton);

    // Attach Phase 2 components
    document.body.appendChild(this.buildPopup);
    document.body.appendChild(this.placementMode);
    document.body.appendChild(this.economyOverlay);

    // Attach Phase 3 components
    document.body.appendChild(this.attackPopup);
    document.body.appendChild(this.attackRatioSlider);
    document.body.appendChild(this.unitActionPopup);

    // Attach Phase 4 components
    document.body.appendChild(this.diplomacyPopup);
    document.body.appendChild(this.intelSidebar);
    document.body.appendChild(this.playerToast);

    // Attach Phase 5 components
    document.body.appendChild(this.researchSidebar);

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
        console.log("[MobileUI] Attaching components to DOM");
        this.attachComponents();
        this.setupEventListeners();
        // Initialize button state and size after custom elements are attached
        this.contextButton.size = MobileDetector.getContextButtonSize();
        this.contextButton.updateState("attack");
        this.componentsAttached = true;
      }
      // Hide context button - using action grid instead
      this.contextButton.style.display = "none";
      this.topBar.style.display = "";
      document.body.classList.add("mobile-ui-enabled");
      this.injectMobileStyles();
      this.startStatsLoop();
    } else {
      // Only manipulate components if they've been attached
      if (this.componentsAttached) {
        this.contextButton.style.display = "none";
        this.topBar.style.display = "none";
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
    this.buildPopup.close();
    this.attackPopup.close();
    this.unitActionPopup.close();
    this.diplomacyPopup.close();
    this.economyOverlay.close();
    this.attackRatioSlider.close();
    this.intelSidebar.close();
    this.researchSidebar.close();
    this.placementMode.exit();
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
        top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
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
        top: calc(env(safe-area-inset-top, 0px) + 38px) !important;
        width: 96vw !important;
        max-width: 420px !important;
        border-radius: 10px !important;
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
        padding: 0.8rem !important;
      }
      body.mobile-ui-enabled .banner-intro {
        font-size: 0.82em !important;
        margin-bottom: 0.6rem !important;
      }
      body.mobile-ui-enabled .categories-row {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
      }
      body.mobile-ui-enabled .category-tile {
        min-height: 60px !important;
        padding: 8px !important;
        gap: 4px !important;
      }
      body.mobile-ui-enabled .category-tile-icon {
        width: 24px !important;
        height: 24px !important;
      }
      body.mobile-ui-enabled .category-tile-name {
        font-size: 0.9em !important;
      }
      body.mobile-ui-enabled .category-tile-desc {
        font-size: 0.65em !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
      }
      body.mobile-ui-enabled .banner-footer {
        font-size: 0.75em !important;
        padding-top: 0.3rem !important;
      }

      /* Compact research priority confirmation toast on mobile */
      body.mobile-ui-enabled .research-priority-confirmation-toast {
        width: min(92vw, 300px) !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        font-size: 13px !important;
        z-index: 1700 !important;
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
    // Context button click
    this.contextButton.addEventListener("button-click", (e: Event) => {
      const event = e as CustomEvent<{ state: ButtonState }>;
      this.handleContextButtonClick(event.detail.state);
    });

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

    // Build popup item selected
    this.buildPopup.addEventListener("item-selected", (e: Event) => {
      const event = e as CustomEvent<{ action: string }>;
      this.handleBuildItemSelected(event.detail.action);
    });

    // Build popup closed
    this.buildPopup.addEventListener("popup-closed", () => {
      console.log("[MobileUI] Build popup closed");
    });

    // Placement mode cancelled
    this.placementMode.addEventListener("placement-cancelled", () => {
      this.exitPlacementMode();
    });

    // Economy overlay closed
    this.economyOverlay.addEventListener("overlay-closed", () => {
      console.log("[MobileUI] Economy overlay closed");
    });

    // Phase 3: Attack popup item selected
    this.attackPopup.addEventListener("item-selected", (e: Event) => {
      const event = e as CustomEvent<{ action: string }>;
      this.handleAttackItemSelected(event.detail.action);
    });

    // Phase 3: Attack popup closed
    this.attackPopup.addEventListener("popup-closed", () => {
      console.log("[MobileUI] Attack popup closed");
    });

    // Phase 3: Attack ratio changed
    this.attackRatioSlider.addEventListener("ratio-changed", (e: Event) => {
      const event = e as CustomEvent<{ ratio: number }>;
      this.attackRatio = event.detail.ratio;
      console.log("[MobileUI] Attack ratio changed to:", this.attackRatio);
    });

    // Phase 3: Attack ratio slider closed
    this.attackRatioSlider.addEventListener("slider-closed", () => {
      console.log("[MobileUI] Attack ratio slider closed");
    });

    // Phase 3: Unit action selected
    this.unitActionPopup.addEventListener("item-selected", (e: Event) => {
      const event = e as CustomEvent<{ action: string }>;
      this.handleUnitActionSelected(event.detail.action);
    });

    // Phase 3: Unit action popup closed
    this.unitActionPopup.addEventListener("popup-closed", () => {
      console.log("[MobileUI] Unit action popup closed");
    });

    // Phase 4: Diplomacy popup item selected
    this.diplomacyPopup.addEventListener("item-selected", (e: Event) => {
      const event = e as CustomEvent<{ action: string }>;
      this.handleDiplomacyItemSelected(event.detail.action);
    });

    // Phase 4: Diplomacy popup closed
    this.diplomacyPopup.addEventListener("popup-closed", () => {
      console.log("[MobileUI] Diplomacy popup closed");
    });

    // Phase 4: Intel sidebar closed
    this.intelSidebar.addEventListener("sidebar-closed", () => {
      console.log("[MobileUI] Intel sidebar closed");
    });

    // Phase 4: Player selected from sidebar
    this.intelSidebar.addEventListener("player-selected", (e: Event) => {
      const event = e as CustomEvent<{ player: any }>;
      console.log(
        "[MobileUI] Player selected from sidebar:",
        event.detail.player,
      );
      // Could open diplomacy actions here
    });

    // Phase 4: Player toast clicked
    this.playerToast.addEventListener("toast-clicked", (e: Event) => {
      const event = e as CustomEvent<{ player: any }>;
      console.log("[MobileUI] Player toast clicked:", event.detail.player);
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
      console.log("[MobileUI] Action grid closed");
    });

    // Phase 5: Research sidebar closed
    this.researchSidebar.addEventListener("sidebar-closed", () => {
      console.log("[MobileUI] Research sidebar closed");
    });

    // Handle orientation changes
    window.addEventListener("orientationchange", () => {
      this.handleOrientationChange();
    });

    // Handle resize (for responsive button sizing)
    window.addEventListener("resize", () => {
      if (this.componentsAttached) {
        this.contextButton.size = MobileDetector.getContextButtonSize();
      }
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
      console.log("[MobileUI] Tap detected:", gesture.position);

      // If in placement mode, handle placement
      if (this.placementMode.active) {
        this.handlePlacementTap(gesture.position);
      } else {
        // Otherwise, handle map tile selection
        this.handleMapTap(gesture.position);
      }
    });

    this.gestureDetector.on("long-press", (gesture) => {
      console.log("[MobileUI] Long-press detected:", gesture.position);

      // If not in placement mode, open economy overlay
      if (!this.placementMode.active) {
        this.economyOverlay.open();
      }
    });

    this.gestureDetector.on("edge-swipe-left", (gesture) => {
      console.log("[MobileUI] Edge swipe from left detected");
      // TODO: Open Intel sidebar
      this.handleOpenIntelSidebar();
    });

    this.gestureDetector.on("edge-swipe-right", (gesture) => {
      console.log("[MobileUI] Edge swipe from right detected");
      // TODO: Open Research sidebar
      this.handleOpenResearchSidebar();
    });

    this.gestureDetector.on("pinch", (gesture) => {
      console.log("[MobileUI] Pinch detected, scale:", gesture.scale);
      // TODO: Handle map zoom
    });

    this.gestureDetector.on("drag", (gesture) => {
      console.log("[MobileUI] Drag detected, delta:", gesture.delta);

      // If in placement mode, update finger position
      if (this.placementMode.active) {
        this.placementMode.updateFingerPosition(
          gesture.position.x,
          gesture.position.y,
        );
      } else {
        // Otherwise, handle map pan
        // TODO: Handle map pan
      }
    });

    console.log("[MobileUI] Gesture detection initialized");
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
    this.currentGame = game;

    // Update Phase 4 components with game state
    this.intelSidebar.game = game;
    this.playerToast.game = game;

    // Update Phase 5 components with game state
    this.researchSidebar.game = game;
    this.researchSidebar.eventBus = this.eventBus;
  }

  /**
   * Provide renderer transform handler for screen-to-tile conversion
   */
  setTransformHandler(transformHandler: TransformHandler): void {
    this.transformHandler = transformHandler;
  }

  /**
   * Update context button state based on game state
   */
  updateContextButton(state: ButtonState): void {
    this.contextButton.updateState(state);
  }

  /**
   * Handle context button clicks
   */
  private handleContextButtonClick(state: ButtonState): void {
    console.log(`[MobileUI] Context button clicked: ${state}`);

    if (this.currentGame?.inSpawnPhase()) {
      this.handleBuildAction();
      return;
    }

    switch (state) {
      case "build":
        this.handleBuildAction();
        break;
      case "attack":
        this.handleAttackAction();
        break;
      case "manage":
        this.handleManageAction();
        break;
      case "diplomacy":
        this.handleDiplomacyAction();
        break;
      case "deploy":
        this.handleDeployAction();
        break;
      case "water":
        this.handleWaterAction();
        break;
    }
  }

  /**
   * Handle build action (show build popup)
   */
  private async handleBuildAction(): Promise<void> {
    console.log("[MobileUI] Build action triggered");

    // Check if we have a game and selected tile
    if (!this.currentGame || !this.selectedTile) {
      console.warn(
        "[MobileUI] Cannot show build popup: no game or selected tile",
      );
      return;
    }

    // Spawn selection during spawn phase
    if (this.currentGame.inSpawnPhase()) {
      if (
        this.currentGame.isLand(this.selectedTile) &&
        !this.currentGame.hasOwner(this.selectedTile)
      ) {
        this.eventBus.emit(new SendSpawnIntentEvent(this.selectedTile));
      }
      return;
    }

    if (await this.tryExpandOnEmptyTile()) {
      return;
    }

    if (!this.isBuildPopupReady()) {
      this.ensurePopupsReady().then(() => this.handleBuildAction());
      return;
    }

    // Show build popup at context button position
    const buttonRect = this.contextButton.getBoundingClientRect();
    const position = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top,
    };

    this.buildPopup.openForTile(this.selectedTile, this.currentGame, position);
  }

  /**
   * Handle attack action (show attack popup)
   */
  private async handleAttackAction(): Promise<void> {
    console.log("[MobileUI] Attack action triggered");

    if (!this.isAttackPopupReady()) {
      this.ensurePopupsReady().then(() => this.handleAttackAction());
      return;
    }

    // Check if we have a game and selected tile
    if (!this.currentGame || !this.selectedTile) {
      console.warn(
        "[MobileUI] Cannot show attack popup: no game or selected tile",
      );
      return;
    }

    if (await this.tryExpandOnEmptyTile()) {
      return;
    }

    // Show attack popup at context button position
    const buttonRect = this.contextButton.getBoundingClientRect();
    const position = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top,
    };

    this.attackPopup.openForTile(this.selectedTile, this.currentGame, position);
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
      console.log("[MobileUI] Boat attack sent for water crossing");
      return true;
    }

    // Cannot attack by ground or boat
    return false;
  }

  /**
   * Handle manage action (show management options)
   */
  private handleManageAction(): void {
    console.log("[MobileUI] Manage action triggered");

    // On long-press of attack button, show attack ratio slider
    if (!this.currentGame) return;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    const totalTroops = Number(myPlayer.troops());
    this.attackRatioSlider.open(totalTroops, this.attackRatio);
  }

  /**
   * Handle diplomacy action (show diplomacy popup)
   */
  private handleDiplomacyAction(): void {
    console.log("[MobileUI] Diplomacy action triggered");

    // Check if we have a game and selected tile
    if (!this.currentGame || !this.selectedTile) {
      console.warn(
        "[MobileUI] Cannot show diplomacy popup: no game or selected tile",
      );
      return;
    }

    // Check if selected tile has a player owner
    const owner = this.currentGame.owner(this.selectedTile);
    if (!owner.isPlayer()) {
      console.warn("[MobileUI] Selected tile has no player owner");
      return;
    }

    // Show diplomacy popup at context button position
    const buttonRect = this.contextButton.getBoundingClientRect();
    const position = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top,
    };

    this.diplomacyPopup.game = this.currentGame;
    this.diplomacyPopup.selectedTile = this.selectedTile;
    this.diplomacyPopup.show(position);
  }

  /**
   * Handle deploy action (deploy unit)
   */
  private handleDeployAction(): void {
    console.log("[MobileUI] Deploy action triggered");

    // Check if we have a game and selected tile
    if (!this.currentGame || !this.selectedTile) {
      console.warn(
        "[MobileUI] Cannot show unit action popup: no game or selected tile",
      );
      return;
    }

    // Get the unit at selected tile (if any)
    // TODO: Get actual unit from game state
    // For now, just show the popup
    const buttonRect = this.contextButton.getBoundingClientRect();
    const position = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top,
    };

    // this.unitActionPopup.openForUnit(unit, this.currentGame, position);
    console.log("[MobileUI] Unit action popup - implementation pending");
  }

  /**
   * Handle water action (build naval units)
   */
  private handleWaterAction(): void {
    console.log("[MobileUI] Water action triggered");
    // Show water build popup (same as build action)
    this.handleBuildAction();
  }

  /**
   * Handle build item selected from popup
   */
  private handleBuildItemSelected(action: string): void {
    console.log("[MobileUI] Build item selected:", action);

    // Close the build popup
    this.buildPopup.close();

    const unitType = this.parseBuildAction(action);
    console.log("[MobileUI] Parsed unit type:", unitType);

    if (!unitType) {
      console.warn("[MobileUI] Invalid build action:", action);
      return;
    }

    // Build directly on selected tile if we have one
    if (this.selectedTile) {
      console.log(
        "[MobileUI] Emitting BuildUnitIntentEvent for:",
        unitType,
        "at tile:",
        this.selectedTile,
      );
      this.eventBus.emit(new BuildUnitIntentEvent(unitType, this.selectedTile));
      return;
    }

    console.warn("[MobileUI] No selected tile for build action");
    const cost = this.getUnitCost(unitType);
    const icon = this.getUnitIcon(unitType);

    // Enter placement mode
    this.placementMode.enter(unitType, cost, icon);
  }

  private parseBuildAction(action: string): UnitType | null {
    if (!action.startsWith("build:")) {
      return action as UnitType;
    }
    const unitType = action.slice("build:".length) as UnitType;
    return unitType || null;
  }

  /**
   * Handle attack item selected from popup
   */
  private handleAttackItemSelected(action: string): void {
    console.log("[MobileUI] Attack item selected:", action);

    // Close the attack popup
    this.attackPopup.close();

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
        console.log("[MobileUI] Ground attack launched with", troops, "troops");
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
        console.log("[MobileUI] Naval assault launched");
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
        console.log("[MobileUI] Air strike launched");
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
        console.log("[MobileUI] Bomber run launched");
        break;

      case "attack:declare-war":
        // Declare war
        if (owner && owner.isPlayer()) {
          this.eventBus.emit(
            new SendDeclareWarIntentEvent(myPlayer, owner as any),
          );
          console.log("[MobileUI] War declared");
        }
        break;

      case "attack:nuke-atom":
        // Launch atom bomb
        this.eventBus.emit(
          new BuildUnitIntentEvent(UnitType.AtomBomb, this.selectedTile),
        );
        console.log("[MobileUI] Atom bomb launched");
        break;

      case "attack:nuke-hbomb":
        // Launch H-bomb
        this.eventBus.emit(
          new BuildUnitIntentEvent(UnitType.HydrogenBomb, this.selectedTile),
        );
        console.log("[MobileUI] H-bomb launched");
        break;

      case "attack:nuke-mirv":
        // Launch MIRV
        this.eventBus.emit(
          new BuildUnitIntentEvent(UnitType.MIRV, this.selectedTile),
        );
        console.log("[MobileUI] MIRV launched");
        break;

      case "attack:mark-target":
        // TODO: Mark target for bomber priority
        console.log("[MobileUI] Mark target - implementation pending");
        break;

      case "attack:view-intel":
        // TODO: Open Intel sidebar
        console.log("[MobileUI] View intel - implementation pending (Phase 4)");
        break;

      default:
        console.warn("[MobileUI] Unknown attack action:", action);
    }
  }

  /**
   * Handle unit action selected from popup
   */
  private handleUnitActionSelected(action: string): void {
    console.log("[MobileUI] Unit action selected:", action);

    // Close the unit action popup
    this.unitActionPopup.close();

    switch (action) {
      case "unit:select-target":
        // TODO: Enter target selection mode
        console.log("[MobileUI] Select target mode - implementation pending");
        break;

      case "unit:show-range":
        // TODO: Show range overlay
        console.log("[MobileUI] Show range - implementation pending");
        break;

      case "unit:upgrade":
        // TODO: Show upgrade options
        console.log("[MobileUI] Unit upgrade - implementation pending");
        break;

      case "unit:patrol":
        // TODO: Set patrol waypoint
        console.log("[MobileUI] Set patrol - implementation pending");
        break;

      case "unit:disband":
        // TODO: Confirm and disband unit
        console.log("[MobileUI] Disband unit - implementation pending");
        break;

      default:
        console.warn("[MobileUI] Unknown unit action:", action);
    }
  }

  /**
   * Handle diplomacy item selected from popup
   */
  private handleDiplomacyItemSelected(action: string): void {
    console.log("[MobileUI] Diplomacy action selected:", action);

    // Close the diplomacy popup
    this.diplomacyPopup.close();

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
        console.log("[MobileUI] Alliance request sent");
        break;

      case "diplomacy:break-alliance":
        // Break alliance
        this.eventBus.emit(
          new SendBreakAllianceIntentEvent(myPlayer, targetPlayer),
        );
        console.log("[MobileUI] Alliance broken");
        break;

      case "diplomacy:request-peace":
        // Request peace
        this.eventBus.emit(
          new SendPeaceRequestIntentEvent(myPlayer, targetPlayer),
        );
        console.log("[MobileUI] Peace request sent");
        break;

      case "diplomacy:send-emoji":
        // TODO: Show emoji picker
        console.log("[MobileUI] Send emoji - implementation pending");
        break;

      case "diplomacy:donate-troops":
        // TODO: Show troop donation picker
        console.log("[MobileUI] Donate troops - implementation pending");
        break;

      case "diplomacy:view-player":
        // Open Intel sidebar
        this.intelSidebar.open();
        console.log("[MobileUI] Opening Intel sidebar");
        break;

      default:
        console.warn("[MobileUI] Unknown diplomacy action:", action);
    }
  }

  /**
   * Handle action selected from action grid
   * Routes to appropriate handlers based on action prefix
   */
  private async handleActionSelected(action: string): Promise<void> {
    console.log("[MobileUI] Action selected:", action);

    // Close the action grid
    this.actionGrid.close();

    if (!this.currentGame || !this.selectedTile) {
      console.warn("[MobileUI] No game or selected tile");
      return;
    }

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) {
      console.warn("[MobileUI] No player");
      return;
    }

    // Spawn action
    if (action === "spawn") {
      if (
        this.currentGame.isLand(this.selectedTile) &&
        !this.currentGame.hasOwner(this.selectedTile)
      ) {
        this.eventBus.emit(new SendSpawnIntentEvent(this.selectedTile));
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

    console.warn("[MobileUI] Unknown action type:", action);
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

    // For normal gameplay, show action grid
    this.actionGrid.showForTile(tile, this.currentGame, this.attackRatio);
  }

  /**
   * Update context button state based on selected tile
   */
  private updateContextButtonForTile(tile: TileRef): void {
    if (!this.currentGame) {
      this.contextButton.updateState("build");
      return;
    }

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) {
      this.contextButton.updateState("build");
      return;
    }

    // Spawn phase - show attack icon for spawn selection
    if (this.currentGame.inSpawnPhase()) {
      this.contextButton.updateState("attack");
      return;
    }

    const owner = this.currentGame.owner(tile);
    const isMyTile = owner === myPlayer;
    const isWater = !this.currentGame.isLand(tile);
    const isNeutral = !owner.isPlayer();

    if (isMyTile) {
      // Own territory - show build options
      if (isWater) {
        this.contextButton.updateState("water");
      } else {
        this.contextButton.updateState("build");
      }
    } else if (isNeutral) {
      // Neutral territory - attack to expand
      this.contextButton.updateState("attack");
    } else {
      // Enemy player territory - always show attack (peace timer handled by game logic)
      this.contextButton.updateState("attack");
    }
  }

  /**
   * Handle placement tap (finalize building placement)
   */
  private handlePlacementTap(position: { x: number; y: number }): void {
    console.log("[MobileUI] Placement tap at:", position);

    // TODO: Convert screen position to tile coordinates
    const tile = this.screenToTile(position);

    if (!tile) {
      console.warn("[MobileUI] Could not convert position to tile");
      return;
    }

    // Get the unit type from placement mode
    const unitType = this.placementMode.unitType;

    if (!unitType) {
      console.warn("[MobileUI] No unit type in placement mode");
      return;
    }

    // Emit BuildUnitIntentEvent
    const event = new BuildUnitIntentEvent(unitType, tile);
    this.eventBus.emit(event);

    console.log("[MobileUI] BuildUnitIntentEvent emitted:", { unitType, tile });

    // Exit placement mode
    this.exitPlacementMode();
  }

  /**
   * Exit placement mode
   */
  private exitPlacementMode(): void {
    if (!this.placementMode.active) return;
    this.placementMode.exit();
  }

  /**
   * Convert screen position to tile coordinates
   * TODO: Implement actual conversion based on MapRenderer
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

  private isBuildPopupReady(): boolean {
    return typeof this.buildPopup.openForTile === "function";
  }

  private isAttackPopupReady(): boolean {
    return typeof this.attackPopup.openForTile === "function";
  }

  private ensurePopupsReady(): Promise<void> {
    if (this.popupReadyPromise) {
      return this.popupReadyPromise;
    }

    this.popupReadyPromise = Promise.all([
      customElements.whenDefined("mobile-build-popup"),
      customElements.whenDefined("mobile-attack-popup"),
    ]).then(() => {
      // Replace popups if they were created before custom elements were defined
      if (!this.isBuildPopupReady()) {
        const replacement = document.createElement(
          "mobile-build-popup",
        ) as MobileBuildPopup;
        if (this.buildPopup.isConnected) {
          this.buildPopup.replaceWith(replacement);
        }
        this.buildPopup = replacement;
        if (this.componentsAttached && !this.buildPopup.isConnected) {
          document.body.appendChild(this.buildPopup);
        }
      }

      if (!this.isAttackPopupReady()) {
        const replacement = document.createElement(
          "mobile-attack-popup",
        ) as MobileAttackPopup;
        if (this.attackPopup.isConnected) {
          this.attackPopup.replaceWith(replacement);
        }
        this.attackPopup = replacement;
        if (this.componentsAttached && !this.attackPopup.isConnected) {
          document.body.appendChild(this.attackPopup);
        }
      }
    });

    return this.popupReadyPromise;
  }

  /**
   * Get unit cost (placeholder)
   * TODO: Get from actual game data
   */
  private getUnitCost(unitType: UnitType): number {
    // Default costs from documentation
    const costs: Record<string, number> = {
      City: 50,
      Port: 180,
      Hospital: 80,
      Factory: 120,
      "Defense Post": 200,
      Silo: 500,
      Airfield: 350,
      "Research Lab": 300,
      Academy: 400,
      SAM: 280,
      Doomsday: 2000,
      Warship: 100,
      Submarine: 150,
      "Fighter Jet": 40,
    };

    return costs[unitType] ?? 100;
  }

  /**
   * Get unit icon (placeholder)
   * TODO: Get from actual sprite data
   */
  private getUnitIcon(unitType: UnitType): string {
    // Default icons
    const icons: Record<string, string> = {
      City: "🏙️",
      Port: "⚓",
      Hospital: "🏥",
      Factory: "🏭",
      "Defense Post": "🛡️",
      Silo: "🚀",
      Airfield: "✈️",
      "Research Lab": "🔬",
      Academy: "🎓",
      SAM: "🎯",
      Doomsday: "☢️",
      Warship: "🚢",
      Submarine: "🔱",
      "Fighter Jet": "✈️",
    };

    return icons[unitType] ?? "❓";
  }

  /**
   * Handle menu button click (open Intel sidebar)
   */
  private handleMenuClick(): void {
    console.log("[MobileUI] Menu clicked");
    this.handleOpenIntelSidebar();
  }

  /**
   * Handle settings button click
   */
  private handleSettingsClick(): void {
    console.log("[MobileUI] Settings clicked");
    const settingsModal = document.querySelector(
      "user-setting",
    ) as HTMLElement & { open: () => void };
    if (settingsModal && typeof settingsModal.open === "function") {
      settingsModal.open();
    } else {
      console.warn("[MobileUI] Settings modal not found or not ready");
    }
  }

  /**
   * Handle opening Intel sidebar
   */
  private handleOpenIntelSidebar(): void {
    console.log("[MobileUI] Opening Intel sidebar");
    this.intelSidebar.toggle();
  }

  /**
   * Handle opening Research sidebar
   */
  private handleOpenResearchSidebar(): void {
    console.log("[MobileUI] Opening Research sidebar");
    this.researchSidebar.toggle();
  }

  /**
   * Handle orientation changes
   */
  private handleOrientationChange(): void {
    const orientation = MobileDetector.getOrientation();
    console.log(`[MobileUI] Orientation changed to: ${orientation}`);

    // Update button size if needed
    this.contextButton.size = MobileDetector.getContextButtonSize();

    // TODO: Adjust sidebar widths based on orientation
  }

  /**
   * Clean up mobile UI
   */
  destroy(): void {
    console.log("[MobileUI] Destroying mobile UI");

    // Remove components from DOM
    this.contextButton.remove();
    this.topBar.remove();
    this.buildPopup.remove();
    this.placementMode.remove();
    this.economyOverlay.remove();
    this.attackPopup.remove();
    this.attackRatioSlider.remove();
    this.unitActionPopup.remove();
    this.diplomacyPopup.remove();
    this.intelSidebar.remove();
    this.playerToast.remove();
    this.researchSidebar.remove();

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
