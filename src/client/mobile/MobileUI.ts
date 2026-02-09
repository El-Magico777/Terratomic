/**
 * MobileUI - Main entry point for mobile UI system
 * Initializes and coordinates all mobile components
 */

import { EventBus } from "../../core/EventBus";
import { ButtonState, MobileContextButton } from "./MobileContextButton";
import { MobileDetector } from "./MobileDetector";
import { MobileTopBar, TopBarStats } from "./MobileTopBar";
import { GestureDetector } from "./gestures/GestureDetector";

export class MobileUI {
  private contextButton: MobileContextButton;
  private topBar: MobileTopBar;
  private gestureDetector: GestureDetector | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(private eventBus: EventBus) {
    console.log("[MobileUI] Initializing mobile UI system");

    // Create and register custom elements
    this.setupCustomElements();

    // Create UI components
    this.contextButton = document.createElement(
      "mobile-context-button",
    ) as MobileContextButton;
    this.topBar = document.createElement("mobile-top-bar") as MobileTopBar;

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
      // TODO: Handle map tile selection
    });

    this.gestureDetector.on("long-press", (gesture) => {
      console.log("[MobileUI] Long-press detected:", gesture.position);
      // TODO: Show info tooltip or economy overlay
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
      // TODO: Handle map pan
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
    // TODO: Show build popup (Phase 2)
  }

  /**
   * Handle attack action (show attack popup)
   */
  private handleAttackAction(): void {
    console.log("[MobileUI] Attack action triggered");
    // TODO: Show attack popup (Phase 3)
  }

  /**
   * Handle manage action (show management options)
   */
  private handleManageAction(): void {
    console.log("[MobileUI] Manage action triggered");
    // TODO: Show manage popup (Phase 2)
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
    // TODO: Implement unit deployment (Phase 3)
  }

  /**
   * Handle water action (build naval units)
   */
  private handleWaterAction(): void {
    console.log("[MobileUI] Water action triggered");
    // TODO: Show water build popup (Phase 2)
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
