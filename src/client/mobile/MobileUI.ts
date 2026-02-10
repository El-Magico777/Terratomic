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
  SendAttackIntentEvent,
  SendBoatAttackIntentEvent,
  SendBomberIntentEvent,
  SendDeclareWarIntentEvent,
  SendParatrooperAttackIntentEvent,
} from "../Transport";
import { ButtonState, MobileContextButton } from "./MobileContextButton";
import { MobileDetector } from "./MobileDetector";
import { MobileTopBar, TopBarStats } from "./MobileTopBar";
import { GestureDetector } from "./gestures/GestureDetector";
import { MobileAttackRatioSlider } from "./overlays/MobileAttackRatioSlider";
import { MobileEconomyOverlay } from "./overlays/MobileEconomyOverlay";
import { MobilePlacementMode } from "./overlays/MobilePlacementMode";
import { MobileAttackPopup } from "./popups/MobileAttackPopup";
import { MobileBuildPopup } from "./popups/MobileBuildPopup";
import { MobileUnitActionPopup } from "./popups/MobileUnitActionPopup";

export class MobileUI {
  private contextButton: MobileContextButton;
  private topBar: MobileTopBar;
  private gestureDetector: GestureDetector | null = null;
  private canvas: HTMLCanvasElement | null = null;

  // Phase 2 components
  private buildPopup: MobileBuildPopup;
  private placementMode: MobilePlacementMode;
  private economyOverlay: MobileEconomyOverlay;

  // Phase 3 components
  private attackPopup: MobileAttackPopup;
  private attackRatioSlider: MobileAttackRatioSlider;
  private unitActionPopup: MobileUnitActionPopup;

  // Game state
  private currentGame: GameView | null = null;
  private selectedTile: TileRef | null = null;
  private attackRatio: number = 0.3; // Default 30%

  constructor(private eventBus: EventBus) {
    console.log("[MobileUI] Initializing mobile UI system");

    // Create and register custom elements
    this.setupCustomElements();

    // Create UI components
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

    // Set initial button size based on device
    this.contextButton.size = MobileDetector.getContextButtonSize();

    // Attach to DOM
    this.attachComponents();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize with default state
    this.contextButton.updateState("build");

    console.log("[MobileUI] Mobile UI system initialized");
  }

  /**
   * Register custom elements if not already registered
   */
  private setupCustomElements(): void {
    // Import components to ensure they're registered
    import("./MobileContextButton");
    import("./MobileTopBar");
  }

  /**
   * Attach mobile components to the DOM
   */
  private attachComponents(): void {
    document.body.appendChild(this.topBar);
    document.body.appendChild(this.contextButton);

    // Attach Phase 2 components
    document.body.appendChild(this.buildPopup);
    document.body.appendChild(this.placementMode);
    document.body.appendChild(this.economyOverlay);

    // Attach Phase 3 components
    document.body.appendChild(this.attackPopup);
    document.body.appendChild(this.attackRatioSlider);
    document.body.appendChild(this.unitActionPopup);

    // Apply mobile-specific CSS to body
    document.body.classList.add("mobile-ui-enabled");

    // Add viewport meta tag if not present
    this.ensureViewportMeta();

    // Add mobile-specific styles
    this.injectMobileStyles();
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
      
      /* Game canvas touch optimization */
      body.mobile-ui-enabled canvas {
        touch-action: pan-x pan-y;
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

    // Handle orientation changes
    window.addEventListener("orientationchange", () => {
      this.handleOrientationChange();
    });

    // Handle resize (for responsive button sizing)
    window.addEventListener("resize", () => {
      this.contextButton.size = MobileDetector.getContextButtonSize();
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
  private handleBuildAction(): void {
    console.log("[MobileUI] Build action triggered");

    // Check if we have a game and selected tile
    if (!this.currentGame || !this.selectedTile) {
      console.warn(
        "[MobileUI] Cannot show build popup: no game or selected tile",
      );
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
  private handleAttackAction(): void {
    console.log("[MobileUI] Attack action triggered");

    // Check if we have a game and selected tile
    if (!this.currentGame || !this.selectedTile) {
      console.warn(
        "[MobileUI] Cannot show attack popup: no game or selected tile",
      );
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
    // TODO: Show diplomacy popup (Phase 4)
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

    // Get unit type and cost
    const unitType = action as UnitType;

    // TODO: Get actual cost from game data
    const cost = this.getUnitCost(unitType);
    const icon = this.getUnitIcon(unitType);

    // Enter placement mode
    this.placementMode.enter(unitType, cost, icon);
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
   * Handle map tap (for tile selection)
   */
  private handleMapTap(position: { x: number; y: number }): void {
    console.log("[MobileUI] Map tap at:", position);

    // TODO: Convert screen position to tile coordinates
    // For now, just store the position
    // This would typically be handled by the MapRenderer
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
    this.placementMode.exit();
  }

  /**
   * Convert screen position to tile coordinates
   * TODO: Implement actual conversion based on MapRenderer
   */
  private screenToTile(position: { x: number; y: number }): TileRef | null {
    // Placeholder - this would need to be implemented based on the actual
    // MapRenderer tile coordinate system
    console.warn("[MobileUI] screenToTile not yet implemented");
    return null;
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
    // TODO: Open settings modal (reuse existing OptionsMenu)
  }

  /**
   * Handle opening Intel sidebar
   */
  private handleOpenIntelSidebar(): void {
    console.log("[MobileUI] Opening Intel sidebar");
    // TODO: Implement Intel sidebar (Phase 4)
  }

  /**
   * Handle opening Research sidebar
   */
  private handleOpenResearchSidebar(): void {
    console.log("[MobileUI] Opening Research sidebar");
    // TODO: Implement Research sidebar (Phase 5)
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

    // Clean up gesture detector
    if (this.gestureDetector) {
      this.gestureDetector.destroy();
    }

    // Remove mobile class from body
    document.body.classList.remove("mobile-ui-enabled");

    // Remove injected styles
    document.getElementById("mobile-ui-styles")?.remove();
  }
}
