/**
 * MobileUI - Main entry point for mobile UI system
 * Initializes and coordinates all mobile components
 */

import { EventBus } from "../../core/EventBus";
import { flattenedEmojiTable } from "../../core/Util";
import { AllPlayers, Cell, MessageType, UnitType } from "../../core/game/Game";
import type { TileRef } from "../../core/game/GameMap";
import {
  DisplayMessageUpdate,
  GameUpdateType,
} from "../../core/game/GameUpdates";
import type { GameView, PlayerView, UnitView } from "../../core/game/GameView";
import { isUpgradeableStructure } from "../../core/game/Upgradeables";
import { CenterCameraEvent, DragEvent, ZoomEvent } from "../InputHandler";
import {
  BuildUnitIntentEvent,
  SendAllianceRequestIntentEvent,
  SendAttackIntentEvent,
  SendBoatAttackIntentEvent,
  SendBomberIntentEvent,
  SendBreakAllianceIntentEvent,
  SendDeclareWarIntentEvent,
  SendDonateGoldIntentEvent,
  SendDonateTroopsIntentEvent,
  SendEmojiIntentEvent,
  SendParatrooperAttackIntentEvent,
  SendPeaceRequestIntentEvent,
  SendSpawnIntentEvent,
  SendUpgradeStructureIntentEvent,
} from "../Transport";
import { ToggleUpgradeModeEvent } from "../events/ToggleUpgradeModeEvent";
import type { TransformHandler } from "../graphics/TransformHandler";
import { MobileActionGrid } from "./MobileActionGrid";
import { MobileTopBar, TopBarStats } from "./MobileTopBar";
import { GestureDetector } from "./gestures/GestureDetector";
import { MobileAllianceNotifications } from "./overlays/MobileAllianceNotifications";
import { MobileAttackBar } from "./overlays/MobileAttackBar";
import { MobileChatEmojiBar } from "./overlays/MobileChatEmojiBar";
import { MobileEconomyOverlay } from "./overlays/MobileEconomyOverlay";
import { MobileEventsDisplay } from "./overlays/MobileEventsDisplay";
import { MobileIntelSidebar } from "./overlays/MobileIntelSidebar";
import { MobilePlayerToast } from "./overlays/MobilePlayerToast";
import { MobileResearchSidebar } from "./overlays/MobileResearchSidebar";
import { MobileSettingsSidebar } from "./overlays/MobileSettingsSidebar";
import { MobileTechUnlockToast } from "./overlays/MobileTechUnlockToast";
import { HapticFeedback } from "./utils/HapticFeedback";

const STACKABLE_STRUCTURE_TYPES: UnitType[] = [
  UnitType.City,
  UnitType.Port,
  UnitType.Airfield,
  UnitType.Hospital,
  UnitType.Academy,
  UnitType.ResearchLab,
  UnitType.Factory,
  UnitType.MissileSilo,
  UnitType.SAMLauncher,
];

const STACK_TAP_SCREEN_HIT_RADIUS_PX = 28;
const STACK_TAP_STICKY_RADIUS_PX = 72;

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
  private techUnlockToast: MobileTechUnlockToast;
  private eventsDisplay: MobileEventsDisplay;
  private allianceNotifications: MobileAllianceNotifications;
  private attackBar: MobileAttackBar;
  private chatEmojiBar: MobileChatEmojiBar;

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
  private intelTab: HTMLButtonElement;
  private researchTab: HTMLButtonElement;
  private zoomInButton: HTMLButtonElement;
  private zoomCenterButton: HTMLButtonElement;
  private zoomOutButton: HTMLButtonElement;
  private lastGameTick: number = -1; // Track last processed game tick
  private gameDurationSeconds: number = 0; // Track game time in seconds (only after spawn phase)
  private currentGameId: string | null = null;
  private stackModeEnabled: boolean = false;
  private stackTargetUnitId: number | null = null;
  private readonly orientationChangeHandler = (): void => {
    this.handleOrientationChange();
  };

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
    this.techUnlockToast = document.createElement(
      "mobile-tech-unlock-toast",
    ) as MobileTechUnlockToast;
    this.eventsDisplay = document.createElement(
      "mobile-events-display",
    ) as MobileEventsDisplay;
    this.allianceNotifications = document.createElement(
      "mobile-alliance-notifications",
    ) as MobileAllianceNotifications;
    this.attackBar = document.createElement(
      "mobile-attack-bar",
    ) as MobileAttackBar;
    this.chatEmojiBar = document.createElement(
      "mobile-chat-emoji-bar",
    ) as MobileChatEmojiBar;
    this.chatEmojiBar.style.display = "none";

    // Create Phase 5 components
    this.researchSidebar = document.createElement(
      "mobile-research-sidebar",
    ) as MobileResearchSidebar;
    this.settingsSidebar = document.createElement(
      "mobile-settings-sidebar",
    ) as MobileSettingsSidebar;

    this.economyTab = document.createElement("button");
    this.economyTab.className = "mobile-economy-tab";
    this.economyTab.style.display = "none"; // Hidden by default
    // Lucide: Trending Up (Standard Clean Icon)
    this.economyTab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    `;
    this.economyTab.setAttribute("aria-label", "Open economy panel");

    this.intelTab = document.createElement("button");
    this.intelTab.className = "mobile-intel-tab";
    this.intelTab.style.display = "none"; // Hidden by default
    // Lucide: Radio / Radar (Standard Clean Icon)
    this.intelTab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
      </svg>
    `;
    this.intelTab.setAttribute("aria-label", "Open intel panel");

    this.researchTab = document.createElement("button");
    this.researchTab.className = "mobile-research-tab";
    this.researchTab.style.display = "none"; // Hidden by default
    // Lucide: Flask Conical (Standard Clean Icon)
    this.researchTab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
        <path d="M8.5 2h7" />
        <path d="M7 16h10" />
      </svg>
    `;
    this.researchTab.setAttribute("aria-label", "Open research panel");

    // Create zoom control buttons (always visible on mobile)
    this.zoomInButton = document.createElement("button");
    this.zoomInButton.className = "mobile-zoom-in";
    // Lucide: Plus icon
    this.zoomInButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    `;
    this.zoomInButton.setAttribute("aria-label", "Zoom in");

    this.zoomCenterButton = document.createElement("button");
    this.zoomCenterButton.className = "mobile-zoom-center";
    // Lucide: Crosshair / Target icon
    this.zoomCenterButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    `;
    this.zoomCenterButton.setAttribute("aria-label", "Center on territory");

    this.zoomOutButton = document.createElement("button");
    this.zoomOutButton.className = "mobile-zoom-out";
    // Lucide: Minus icon
    this.zoomOutButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    `;
    this.zoomOutButton.setAttribute("aria-label", "Zoom out");

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
    import("./overlays/MobileAllianceNotifications");
    import("./overlays/MobileAttackBar");
    import("./overlays/MobileChatEmojiBar");
    import("./overlays/MobileEventsDisplay");
    import("./overlays/MobileIntelSidebar");
    import("./overlays/MobilePlayerToast");
    import("./overlays/MobileTechUnlockToast");

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
    document.body.appendChild(this.techUnlockToast);
    document.body.appendChild(this.allianceNotifications);
    document.body.appendChild(this.attackBar);
    document.body.appendChild(this.chatEmojiBar);

    // Attach Phase 5 components
    document.body.appendChild(this.researchSidebar);
    document.body.appendChild(this.settingsSidebar);
    document.body.appendChild(this.economyTab);
    document.body.appendChild(this.intelTab);
    document.body.appendChild(this.researchTab);

    // Attach zoom control buttons
    document.body.appendChild(this.zoomInButton);
    document.body.appendChild(this.zoomCenterButton);
    document.body.appendChild(this.zoomOutButton);

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
      this.chatEmojiBar.style.display = "";
      document.body.classList.add("mobile-ui-enabled");
      this.injectMobileStyles();
      this.startStatsLoop();
    } else {
      // Only manipulate components if they've been attached
      if (this.componentsAttached) {
        if (this.stackModeEnabled) {
          this.stackModeEnabled = false;
          this.eventBus.emit(new ToggleUpgradeModeEvent(false));
          this.actionGrid.setStackModeEnabled(false);
        }
        this.topBar.style.display = "none";
        this.economyTab.style.display = "none";
        this.intelTab.style.display = "none";
        this.researchTab.style.display = "none";
        this.chatEmojiBar.style.display = "none";
        this.zoomInButton.style.display = "none";
        this.zoomCenterButton.style.display = "none";
        this.zoomOutButton.style.display = "none";
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

    const tick = this.currentGame.ticks();
    if (tick === this.lastGameTick) {
      return;
    }
    this.lastGameTick = tick;

    const gold = Number(myPlayer.gold());
    const population = myPlayer.population(); // Current population
    const maxPopulation = this.currentGame.config().maxPopulation(myPlayer); // Max population cap
    const populationGrowth =
      this.currentGame.config().populationIncreaseRate(myPlayer) * 10;
    const goldIncome = Number(
      this.currentGame.config().goldAdditionRate(myPlayer) * 10n,
    );
    const inSpawnPhase = this.currentGame.inSpawnPhase();

    if (inSpawnPhase) {
      this.attackBar.clearTradeIncomeIndicator();
    }

    // Toggle menu buttons visibility based on spawn phase
    // Hide them during spawn phase, show them during normal gameplay
    const displayStyle = inSpawnPhase ? "none" : "";
    if (this.economyTab.style.display !== displayStyle) {
      this.economyTab.style.display = displayStyle;
      this.intelTab.style.display = displayStyle;
      this.researchTab.style.display = displayStyle;
    }

    this.topBar.updateStats({
      population,
      maxPopulation,
      gold,
      populationGrowth,
      goldIncome,
      gameDurationSeconds: this.gameDurationSeconds,
      inSpawnPhase,
    });

    if (!inSpawnPhase && myPlayer.isAlive()) {
      const tradeIncomeAmount = this.getTradeIncomeAmountThisTick(
        myPlayer.smallID(),
      );
      if (tradeIncomeAmount !== null && tradeIncomeAmount > 0n) {
        this.attackBar.showTradeIncomeIndicator(tradeIncomeAmount);
      }
    }

    this.updateAttackBarPosition();
    this.updateChatEmojiBarPosition();

    // Update game timer: increment every 10 ticks (1 second), reset during spawn phase
    if (inSpawnPhase) {
      this.gameDurationSeconds = 0;
    } else if (tick % 10 === 0) {
      this.gameDurationSeconds++;
    }

    if (this.eventsDisplay && typeof this.eventsDisplay.tick === "function") {
      this.eventsDisplay.tick();
    }
    if (this.attackBar && typeof this.attackBar.tick === "function") {
      this.attackBar.tick();
    }
    if (this.chatEmojiBar && typeof this.chatEmojiBar.tick === "function") {
      this.chatEmojiBar.tick();
    }
    if (
      this.allianceNotifications &&
      typeof this.allianceNotifications.tick === "function"
    ) {
      this.allianceNotifications.tick();
      // Push alliance notifications below the attack bar if it has content
      this.allianceNotifications.topOffset = this.attackBar.currentHeight;
    }
  }

  private getTradeIncomeAmountThisTick(myPlayerSmallID: number): bigint | null {
    if (!this.currentGame) {
      return null;
    }

    const updates = this.currentGame.updatesSinceLastTick();
    const displayEvents = updates?.[GameUpdateType.DisplayEvent] as
      | DisplayMessageUpdate[]
      | undefined;

    if (!displayEvents || displayEvents.length === 0) {
      return null;
    }

    let total = 0n;
    let foundAny = false;

    for (const event of displayEvents) {
      if (event.messageType !== MessageType.RECEIVED_GOLD_FROM_TRADE) {
        continue;
      }

      if (event.playerID !== null && event.playerID !== myPlayerSmallID) {
        continue;
      }

      if (event.goldAmount !== undefined && event.goldAmount > 0n) {
        total += event.goldAmount;
        foundAny = true;
      }
    }

    return foundAny ? total : null;
  }

  private updateAttackBarPosition(): void {
    if (!this.componentsAttached) {
      return;
    }

    const topBarBottom = Math.ceil(this.topBar.getBoundingClientRect().bottom);
    this.attackBar.style.top = `${topBarBottom + 2}px`;
  }

  private updateChatEmojiBarPosition(): void {
    if (!this.componentsAttached) {
      return;
    }

    const topBarBottom = Math.ceil(this.topBar.getBoundingClientRect().bottom);
    const attackOffset = this.attackBar.currentHeight;
    this.chatEmojiBar.style.top = `${topBarBottom + attackOffset + 8}px`;
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
      body.mobile-ui-enabled options-menu,
      body.mobile-ui-enabled replay-panel,
      body.mobile-ui-enabled player-info-overlay,
      body.mobile-ui-enabled tutorial-toast,
      body.mobile-ui-enabled tech-unlock-notification,
      /* Hide desktop research button on mobile */
      body.mobile-ui-enabled research-toggle-button,
      body.mobile-ui-enabled game-left-sidebar,
      body.mobile-ui-enabled top-bar,
      body.mobile-ui-enabled .desktop-hud {
        display: none !important;
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
        border: 1px solid rgba(157, 168, 182, 0.26) !important;
        background:
          linear-gradient(
            180deg,
            rgba(128, 138, 151, 0.12) 0%,
            rgba(74, 84, 96, 0.09) 38%,
            rgba(21, 26, 34, 0.04) 100%
          ),
          linear-gradient(
            180deg,
            rgba(34, 40, 49, 0.97) 0%,
            rgba(22, 27, 35, 0.98) 56%,
            rgba(14, 18, 24, 0.98) 100%
          ) !important;
        box-shadow:
          inset 0 1px 0 rgba(231, 238, 246, 0.1),
          0 10px 24px rgba(0, 0, 0, 0.48) !important;
      }
      body.mobile-ui-enabled .banner-header {
        padding: 0.6rem 0.9rem !important;
        background: linear-gradient(
          180deg,
          rgba(16, 20, 28, 0.88) 0%,
          rgba(11, 15, 21, 0.92) 100%
        ) !important;
        border-bottom: 1px solid rgba(149, 159, 173, 0.22) !important;
      }
      body.mobile-ui-enabled .banner-title {
        font-size: 15px !important;
        color: rgba(234, 241, 249, 0.95) !important;
      }
      body.mobile-ui-enabled .banner-close-btn {
        width: 24px !important;
        height: 24px !important;
        border-radius: 6px !important;
        border: 1px solid rgba(129, 140, 154, 0.3) !important;
        color: rgba(245, 188, 122, 0.95) !important;
        background: linear-gradient(
          180deg,
          rgba(18, 24, 33, 0.9) 0%,
          rgba(11, 15, 22, 0.94) 100%
        ) !important;
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
        border-width: 1px !important;
        border-color: rgba(124, 136, 151, 0.28) !important;
        border-radius: 8px !important;
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
        padding: 2px 7px !important;
        border-radius: 999px !important;
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
        pointer-events: none !important;
        border: 1px solid rgba(145, 157, 172, 0.28) !important;
        border-radius: 10px !important;
        background:
          linear-gradient(
            180deg,
            rgba(125, 136, 149, 0.12) 0%,
            rgba(71, 81, 93, 0.08) 42%,
            rgba(19, 25, 33, 0.04) 100%
          ),
          linear-gradient(
            180deg,
            rgba(32, 38, 47, 0.97) 0%,
            rgba(20, 26, 35, 0.98) 100%
          ) !important;
        box-shadow:
          inset 0 1px 0 rgba(233, 240, 248, 0.09),
          0 8px 20px rgba(0, 0, 0, 0.44) !important;
      }
      body.mobile-ui-enabled .research-priority-confirmation-toast.show {
        transform: translateX(-50%) translateY(0) !important;
      }

      body.mobile-ui-enabled .research-priority-confirmation-toast .toast-icon {
        width: 22px !important;
        height: 22px !important;
        min-width: 22px !important;
        border-radius: 999px !important;
        font-size: 13px !important;
      }

      body.mobile-ui-enabled .research-priority-confirmation-toast .toast-title {
        font-size: 12px !important;
        line-height: 1.2 !important;
      }

      body.mobile-ui-enabled .research-priority-confirmation-toast .toast-message {
        font-size: 11px !important;
        line-height: 1.3 !important;
      }

      body.mobile-ui-enabled .mobile-economy-tab,
      body.mobile-ui-enabled .mobile-intel-tab,
      body.mobile-ui-enabled .mobile-research-tab {
        position: fixed;
        right: 12px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background:
          linear-gradient(
            180deg,
            rgba(135, 145, 157, 0.12) 0%,
            rgba(79, 88, 99, 0.08) 40%,
            rgba(24, 29, 38, 0.04) 100%
          ),
          linear-gradient(
            180deg,
            rgba(27, 33, 42, 0.96) 0%,
            rgba(16, 21, 29, 0.98) 55%,
            rgba(11, 15, 22, 0.98) 100%
          );
        border: 1px solid rgba(162, 173, 186, 0.24);
        box-shadow:
          inset 0 1px 0 rgba(231, 238, 246, 0.1),
          inset 0 -1px 0 rgba(0, 0, 0, 0.52),
          0 4px 14px rgba(0, 0, 0, 0.42);
        z-index: 1700;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition:
          transform 0.1s ease,
          filter 0.12s ease,
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }

      body.mobile-ui-enabled .mobile-economy-tab {
        top: calc(env(safe-area-inset-top, 0px) + 60px);
        color: rgba(246, 190, 94, 0.96);
      }

      body.mobile-ui-enabled .mobile-intel-tab {
        top: calc(env(safe-area-inset-top, 0px) + 180px); /* 60 + 48 + 12 + 48 + 12 = 180 */
        color: rgba(116, 182, 255, 0.95);
      }

      body.mobile-ui-enabled .mobile-research-tab {
        top: calc(env(safe-area-inset-top, 0px) + 120px); /* 60 + 48 + 12 = 120 */
        color: rgba(185, 152, 255, 0.95);
      }

      body.mobile-ui-enabled .mobile-economy-tab svg,
      body.mobile-ui-enabled .mobile-intel-tab svg,
      body.mobile-ui-enabled .mobile-research-tab svg {
        width: 22px;
        height: 22px;
      }

      body.mobile-ui-enabled .mobile-economy-tab::after,
      body.mobile-ui-enabled .mobile-intel-tab::after,
      body.mobile-ui-enabled .mobile-research-tab::after {
        content: "";
        position: absolute;
        left: 6px;
        right: 6px;
        bottom: 4px;
        height: 1px;
        background: rgba(218, 229, 241, 0.14);
      }

      body.mobile-ui-enabled .mobile-economy-tab:active,
      body.mobile-ui-enabled .mobile-intel-tab:active,
      body.mobile-ui-enabled .mobile-research-tab:active {
        transform: translateY(1px) scale(0.95);
        filter: brightness(1.08);
        border-color: rgba(186, 198, 214, 0.3);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 -1px 0 rgba(0, 0, 0, 0.6),
          0 2px 8px rgba(0, 0, 0, 0.5);
      }

      /* Zoom control buttons - left side, vertically centered */
      body.mobile-ui-enabled .mobile-zoom-in,
      body.mobile-ui-enabled .mobile-zoom-center,
      body.mobile-ui-enabled .mobile-zoom-out {
        position: fixed;
        left: 12px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: rgba(15, 15, 20, 0.65);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: rgba(255, 255, 255, 0.85);
        z-index: 1700;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        border: none;
        transition: transform 0.1s ease, background 0.1s ease;
      }

      body.mobile-ui-enabled .mobile-zoom-in {
        top: calc(50% - 60px); /* Center minus offset for 3 buttons */
      }

      body.mobile-ui-enabled .mobile-zoom-center {
        top: calc(50% - 18px); /* Center */
      }

      body.mobile-ui-enabled .mobile-zoom-out {
        top: calc(50% + 24px); /* Center plus offset */
      }

      body.mobile-ui-enabled .mobile-zoom-in:active,
      body.mobile-ui-enabled .mobile-zoom-center:active,
      body.mobile-ui-enabled .mobile-zoom-out:active {
        transform: scale(0.9);
        background: rgba(25, 25, 30, 0.85);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
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

    this.intelTab.addEventListener("click", () => {
      this.intelSidebar.open();
    });

    this.intelTab.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.intelSidebar.open();
    });

    this.researchTab.addEventListener("click", () => {
      this.researchSidebar.open();
    });

    this.researchTab.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.researchSidebar.open();
    });

    // Zoom control button handlers (pointerdown only - no click to avoid double-firing)
    this.zoomInButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.handleZoomIn();
    });

    this.zoomCenterButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.handleZoomCenter();
    });

    this.zoomOutButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.handleZoomOut();
    });

    this.economyOverlay.addEventListener("attack-ratio-changed", (e: Event) => {
      const event = e as CustomEvent<{ ratio: number }>;
      this.attackRatio = event.detail.ratio;
    });

    // Phase 4: Player toast clicked
    this.playerToast.addEventListener("toast-clicked", (e: Event) => {
      const event = e as CustomEvent<{ player: any }>;
      // Open intel sidebar when toast is tapped
      this.intelSidebar.open();
    });

    this.playerToast.addEventListener("chat-clicked", (e: Event) => {
      const event = e as CustomEvent<{ player: PlayerView }>;
      this.openChatModalForPlayer(event.detail.player);
    });

    this.playerToast.addEventListener("emoji-clicked", (e: Event) => {
      const event = e as CustomEvent<{ player: PlayerView }>;
      this.openEmojiTableForPlayer(event.detail.player);
    });

    this.playerToast.addEventListener("donate-troops-clicked", (e: Event) => {
      const event = e as CustomEvent<{ player: PlayerView }>;
      this.sendTroopDonationToPlayer(event.detail.player);
    });

    this.playerToast.addEventListener("donate-gold-clicked", (e: Event) => {
      const event = e as CustomEvent<{ player: PlayerView }>;
      this.sendGoldDonationToPlayer(event.detail.player);
    });

    // Action grid: Action selected
    this.actionGrid.addEventListener("action-selected", (e: Event) => {
      const event = e as CustomEvent<{ action: string }>;
      this.handleActionSelected(event.detail.action);
    });

    // Handle orientation changes
    window.addEventListener("orientationchange", this.orientationChangeHandler);
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
      this.handleMapLongPress(gesture.position);
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
      // Reduced multiplier from 600 to 100 for less aggressive zoom
      const delta = (1 - gesture.scale) * 100;

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
    const nextGameId = game.gameID();
    const isNewGame = this.currentGameId !== nextGameId;
    this.currentGame = game;
    this.currentGameId = nextGameId;

    // Update Phase 4 components with game state
    this.intelSidebar.game = game;
    this.intelSidebar.eventsDisplay = this.eventsDisplay;
    this.playerToast.game = game;
    this.playerToast.eventBus = this.eventBus;
    this.eventsDisplay.game = game;
    this.eventsDisplay.eventBus = this.eventBus;
    this.allianceNotifications.game = game;
    this.allianceNotifications.eventBus = this.eventBus;
    this.attackBar.game = game;
    this.attackBar.eventBus = this.eventBus;
    this.chatEmojiBar.game = game;
    this.chatEmojiBar.eventBus = this.eventBus;

    // Update Phase 5 components with game state
    this.researchSidebar.game = game;
    this.researchSidebar.eventBus = this.eventBus;
    this.settingsSidebar.game = game;
    this.settingsSidebar.eventBus = this.eventBus;
    this.economyOverlay.game = game;
    this.economyOverlay.eventBus = this.eventBus;

    if (isNewGame) {
      this.lastGameTick = -1;
      this.gameDurationSeconds = 0;
      this.economyOverlay.resetInvestmentDefaults();
      this.economyOverlay.applyPreferredCombatRatios();
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

    if (!unitType || !this.selectedTile || !this.currentGame) {
      return;
    }

    let targetTile = this.selectedTile;

    // Special handling for Port: if clicking on water, find nearest owned shore
    if (
      unitType === UnitType.Port &&
      !this.currentGame.isLand(this.selectedTile)
    ) {
      const myPlayer = this.currentGame.myPlayer();
      if (myPlayer) {
        // Find nearest owned shore tile within search radius
        const nearbyTiles = Array.from(
          this.currentGame.bfs(
            this.selectedTile,
            (gm, t) =>
              this.currentGame!.manhattanDist(this.selectedTile!, t) <= 10,
          ),
        );

        const ownedShores = nearbyTiles
          .filter(
            (t) =>
              this.currentGame!.owner(t) === myPlayer &&
              this.currentGame!.isOceanShore(t),
          )
          .sort(
            (a, b) =>
              this.currentGame!.manhattanDist(this.selectedTile!, a) -
              this.currentGame!.manhattanDist(this.selectedTile!, b),
          );

        if (ownedShores.length > 0) {
          targetTile = ownedShores[0];
        }
      }
    }

    this.eventBus.emit(new BuildUnitIntentEvent(unitType, targetTile));
    HapticFeedback.success();
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
        this.openEmojiTableForPlayer(targetPlayer);
        HapticFeedback.tap();
        break;

      case "diplomacy:donate-troops":
        this.sendTroopDonationToPlayer(targetPlayer);
        HapticFeedback.success();
        break;

      case "diplomacy:donate-gold":
        this.sendGoldDonationToPlayer(targetPlayer);
        HapticFeedback.success();
        break;

      case "diplomacy:chat":
        this.openChatModalForPlayer(targetPlayer);
        HapticFeedback.tap();
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
    if (action === "mode:stack-toggle") {
      this.handleStackModeToggle();
      return;
    }

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

  private handleStackModeToggle(): void {
    this.stackModeEnabled = !this.stackModeEnabled;
    if (!this.stackModeEnabled) {
      this.stackTargetUnitId = null;
    }
    this.eventBus.emit(new ToggleUpgradeModeEvent(this.stackModeEnabled));
    this.actionGrid.setStackModeEnabled(this.stackModeEnabled);
    HapticFeedback.tap();
  }

  /**
   * Handle map tap (for tile selection)
   */
  private handleMapTap(position: { x: number; y: number }): void {
    if (this.playerToast.visible) {
      this.playerToast.hide();
      this.actionGrid.close();
      return;
    }

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

    if (this.stackModeEnabled) {
      this.tryStackStructureAtTile(tile, position);
      return;
    }

    // For all tiles, show action grid
    this.actionGrid.showForTile(tile, this.currentGame, this.attackRatio);
  }

  private tryStackStructureAtTile(
    tile: TileRef,
    position?: { x: number; y: number },
  ): void {
    if (!this.currentGame) return;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    const structure = this.findMyUpgradeableStructureAtTile(
      tile,
      myPlayer,
      position,
    );
    if (!structure) {
      HapticFeedback.error();
      return;
    }

    this.stackTargetUnitId = structure.id();

    this.eventBus.emit(
      new SendUpgradeStructureIntentEvent(structure.id(), structure.type()),
    );
    HapticFeedback.success();
  }

  private findMyUpgradeableStructureAtTile(
    tile: TileRef,
    myPlayer: PlayerView,
    position?: { x: number; y: number },
  ): UnitView | null {
    if (!this.currentGame || !position) {
      return null;
    }

    const stickyTarget = this.getStickyStackTarget(myPlayer);
    if (
      stickyTarget &&
      this.screenDistanceSquaredToUnit(position, stickyTarget) <=
        STACK_TAP_STICKY_RADIUS_PX * STACK_TAP_STICKY_RADIUS_PX
    ) {
      return stickyTarget;
    }

    const byScreenDistance = myPlayer
      .units(...STACKABLE_STRUCTURE_TYPES)
      .filter((unit) => unit.isActive() && isUpgradeableStructure(unit.type()))
      .map((unit) => ({
        unit,
        screenDistSquared: this.screenDistanceSquaredToUnit(position, unit),
      }))
      .sort((a, b) => a.screenDistSquared - b.screenDistSquared);

    const withinHitRadius = byScreenDistance.find(
      (entry) =>
        entry.screenDistSquared <=
        STACK_TAP_SCREEN_HIT_RADIUS_PX * STACK_TAP_SCREEN_HIT_RADIUS_PX,
    );

    if (withinHitRadius) {
      return (withinHitRadius.unit as UnitView) ?? null;
    }

    return null;
  }

  private getStickyStackTarget(myPlayer: PlayerView): UnitView | null {
    if (this.stackTargetUnitId === null) {
      return null;
    }

    const target = this.currentGame?.unit(this.stackTargetUnitId);
    if (!target) {
      this.stackTargetUnitId = null;
      return null;
    }

    if (
      !target.isActive() ||
      target.owner().id() !== myPlayer.id() ||
      !isUpgradeableStructure(target.type())
    ) {
      this.stackTargetUnitId = null;
      return null;
    }

    return target;
  }

  private screenDistanceSquaredToUnit(
    position: { x: number; y: number },
    unit: UnitView,
  ): number {
    if (!this.currentGame || !this.transformHandler) {
      return Number.POSITIVE_INFINITY;
    }

    const tile = unit.tile();
    const cell = new Cell(this.currentGame.x(tile), this.currentGame.y(tile));
    const screenPos = this.transformHandler.worldToScreenCoordinates(cell);
    const dx = screenPos.x - position.x;
    const dy = screenPos.y - position.y;
    return dx * dx + dy * dy;
  }

  /**
   * Handle long-press on map
   * Shows player toast for any owned tile, economy overlay otherwise
   */
  private async handleMapLongPress(position: {
    x: number;
    y: number;
  }): Promise<void> {
    const tile = this.screenToTile(position);
    if (!tile || !this.currentGame) {
      return;
    }

    this.selectedTile = tile;

    // Show player toast for owned tiles
    const myPlayer = this.currentGame.myPlayer();
    if (myPlayer) {
      const owner = this.currentGame.owner(tile);
      if (owner.isPlayer()) {
        const actions = await myPlayer.actions(tile);
        const targetPlayer =
          owner as import("../../core/game/GameView").PlayerView;

        this.playerToast.canDonate =
          targetPlayer === myPlayer
            ? false
            : (actions.interaction?.canDonate ?? false);

        this.playerToast.canSendEmoji =
          targetPlayer === myPlayer
            ? (actions.canSendEmojiAllPlayers ?? false)
            : (actions.interaction?.canSendEmoji ?? false);

        // Long-press on owned tile: show player toast with contextual options
        this.playerToast.show(
          targetPlayer,
          5000, // Show longer on long-press
        );
        HapticFeedback.longPress();
        return;
      }
    }

    // Long-press on own/neutral tiles: open economy overlay
    this.economyOverlay.open();
  }

  private sendTroopDonationToPlayer(targetPlayer: PlayerView): void {
    if (!this.currentGame) return;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    this.eventBus.emit(
      new SendDonateTroopsIntentEvent(
        targetPlayer,
        myPlayer.troops() * this.attackRatio,
      ),
    );
  }

  private sendGoldDonationToPlayer(targetPlayer: PlayerView): void {
    this.eventBus.emit(new SendDonateGoldIntentEvent(targetPlayer, null));
  }

  private openChatModalForPlayer(targetPlayer: PlayerView): void {
    if (!this.currentGame) return;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    const chatModal = document.querySelector("chat-modal") as {
      open: (sender?: PlayerView, recipient?: PlayerView) => void;
    } | null;

    if (!chatModal) return;

    chatModal.open(myPlayer, targetPlayer);
  }

  private openEmojiTableForPlayer(targetPlayer: PlayerView): void {
    if (!this.currentGame) return;

    const myPlayer = this.currentGame.myPlayer();
    if (!myPlayer) return;

    const emojiTable = document.querySelector("emoji-table") as {
      showTable: (onEmojiClicked: (emoji: string) => void) => void;
      hideTable: () => void;
    } | null;

    if (!emojiTable) return;

    emojiTable.showTable((emoji: string) => {
      const recipient = targetPlayer === myPlayer ? AllPlayers : targetPlayer;
      this.eventBus.emit(
        new SendEmojiIntentEvent(recipient, flattenedEmojiTable.indexOf(emoji)),
      );
      emojiTable.hideTable();
    });
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
   * Handle settings button click
   */
  private handleSettingsClick(): void {
    this.settingsSidebar.toggle();
  }

  /**
   * Handle zoom in button click
   */
  private handleZoomIn(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Negative delta = zoom in (scale increases)
    this.eventBus.emit(new ZoomEvent(centerX, centerY, -100));
  }

  /**
   * Handle zoom out button click
   */
  private handleZoomOut(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Positive delta = zoom out (scale decreases)
    this.eventBus.emit(new ZoomEvent(centerX, centerY, 100));
  }

  /**
   * Handle center button click - pan to player's territory center
   */
  private handleZoomCenter(): void {
    this.eventBus.emit(new CenterCameraEvent());
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
    this.updateAttackBarPosition();
    this.updateChatEmojiBarPosition();
  }

  /**
   * Clean up mobile UI
   */
  destroy(): void {
    this.stopStatsLoop();

    // Remove components from DOM
    this.topBar.remove();
    this.actionGrid.remove();
    this.economyOverlay.remove();
    this.intelSidebar.remove();
    this.playerToast.remove();
    this.techUnlockToast.remove();
    this.allianceNotifications.remove();
    this.attackBar.remove();
    this.chatEmojiBar.remove();
    this.researchSidebar.remove();
    this.settingsSidebar.remove();
    this.economyTab.remove();
    this.intelTab.remove();
    this.researchTab.remove();
    this.zoomInButton.remove();
    this.zoomCenterButton.remove();
    this.zoomOutButton.remove();

    window.removeEventListener(
      "orientationchange",
      this.orientationChangeHandler,
    );

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
