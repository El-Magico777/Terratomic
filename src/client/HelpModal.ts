import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { getAltKey, getModifierKey } from "../client/Utils";
import { getTechNodes } from "../core/tech/ResearchTree";
import { TECHS } from "../core/tech/TechEffects";
import "./components/Difficulties";
import "./components/Maps";

type HelpTab =
  | "GettingStarted"
  | "UIGuide"
  | "Structures"
  | "Units"
  | "Investment"
  | "TechTree"
  | "Strategy";

@customElement("help-modal")
export class HelpModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  @state()
  private activeTab: HelpTab = "GettingStarted";

  createRenderRoot() {
    return this;
  }

  private onTabClick(tab: HelpTab) {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
  }

  private renderTabBar() {
    const tabs: HelpTab[] = [
      "GettingStarted",
      "UIGuide",
      "Structures",
      "Units",
      "Investment",
      "TechTree",
      "Strategy",
    ];

    return html`
      <div class="help-tab-bar">
        ${tabs.map(
          (tab) => html`
            <button
              class="help-tab ${this.activeTab === tab ? "active" : ""}"
              @click=${() => this.onTabClick(tab)}
            >
              ${tab === "GettingStarted"
                ? "Getting Started"
                : tab === "UIGuide"
                  ? "UI Guide"
                  : tab === "TechTree"
                    ? "Tech Tree"
                    : tab}
            </button>
          `,
        )}
      </div>
    `;
  }

  private renderGettingStartedTab() {
    return html`
      <div class="help-tab-content">
        <div class="text-center text-2xl font-bold mb-4">Getting Started</div>

        <div class="help-section">
          <div class="help-section-title">Game Objective</div>
          <p class="mb-2">
            <strong>Win Condition:</strong> Be the first player to control
            <strong>80% of the world map</strong> (95% in Team games). Expand
            your territory, build your economy, develop advanced technology, and
            dominate your rivals through military conquest or strategic
            alliances.
          </p>
          <ul class="help-list">
            <li>
              <strong>Territory Control:</strong> Your map control percentage is
              shown in the leaderboard (top-left)
            </li>
            <li>
              <strong>Elimination:</strong> If you lose all your territory,
              you're eliminated from the game
            </li>
          </ul>
        </div>

        <div class="help-section">
          <div class="help-section-title">Hotkeys & Controls</div>
          <p class="mb-2">
            Master these essential controls to play effectively:
          </p>

          <table class="help-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody class="text-left">
              <tr>
                <td><span class="key">Space</span></td>
                <td>
                  Toggle alternative view (shows different information overlays)
                </td>
              </tr>
              <tr>
                <td><span class="key">C</span></td>
                <td>Center camera on your capital/territory</td>
              </tr>
              <tr>
                <td><span class="key">Q</span> / <span class="key">E</span></td>
                <td>Zoom in / Zoom out</td>
              </tr>
              <tr>
                <td>
                  <span class="key">W</span> <span class="key">A</span>
                  <span class="key">S</span> <span class="key">D</span>
                </td>
                <td>Move camera (pan view in all directions)</td>
              </tr>
              <tr>
                <td>
                  <div style="display: flex; justify-content: center;">
                    <div class="mouse-shell alt-left-click">
                      <div class="mouse-left-corner"></div>
                      <div class="mouse-wheel"></div>
                    </div>
                  </div>
                </td>
                <td>
                  Left-click to attack adjacent tiles and expand territory
                </td>
              </tr>
              <tr>
                <td>
                  <div class="scroll-combo-horizontal">
                    <span class="key">${getAltKey()}</span>
                    <span class="plus">+</span>
                    <div class="mouse-shell alt-left-click">
                      <div class="mouse-left-corner"></div>
                      <div class="mouse-wheel"></div>
                    </div>
                  </div>
                </td>
                <td>Send emote to player (quick emote without radial menu)</td>
              </tr>
              <tr>
                <td><span class="key">1</span> / <span class="key">2</span></td>
                <td>Adjust worker/troop ratio (decrease/increase troops)</td>
              </tr>
              <tr>
                <td>
                  <div class="scroll-combo-horizontal">
                    <span class="key">⇧ Shift</span>
                    <span class="plus">+</span>
                    <div class="mouse-with-arrows">
                      <div class="mouse-shell">
                        <div class="mouse-wheel" id="highlighted-wheel"></div>
                      </div>
                      <div class="mouse-arrows-side">
                        <div class="arrow">↑</div>
                        <div class="arrow">↓</div>
                      </div>
                    </div>
                  </div>
                </td>
                <td>Adjust worker/troop ratio with mouse wheel</td>
              </tr>
              <tr>
                <td>
                  <div class="scroll-combo-horizontal">
                    <span class="key">${getModifierKey()}</span>
                    <span class="plus">+</span>
                    <div class="mouse-with-arrows">
                      <div class="mouse-shell">
                        <div class="mouse-wheel" id="highlighted-wheel"></div>
                      </div>
                      <div class="mouse-arrows-side">
                        <div class="arrow">↑</div>
                        <div class="arrow">↓</div>
                      </div>
                    </div>
                  </div>
                </td>
                <td>Scale UI size up/down (resize interface elements)</td>
              </tr>
              <tr>
                <td>
                  <span class="key">${getAltKey()}</span> +
                  <span class="key">R</span>
                </td>
                <td>Reset graphics/rendering (fixes visual glitches)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <div class="help-section-title">First Steps</div>
          <p class="mb-2">When you start a new game, follow these steps:</p>
          <ol class="help-list">
            <li>
              <strong>Select Spawn Point:</strong> When the game starts, click
              on the map to choose your starting location. Pick a strategic
              position with room to expand.
            </li>
            <li>
              <strong>Adjust Worker/Troop Ratio:</strong> Press
              <span class="key">1</span> or <span class="key">2</span> to
              balance economy vs military (start with ~50% troops)
            </li>
            <li>
              <strong>Expand Territory:</strong> Left-click on adjacent
              unconquered tiles to send troops and capture land
            </li>
            <li>
              <strong>Build Your First City:</strong> Press
              <span class="key">Y</span> while holding you mouse at the tile you
              want to build a city on, or open the COMMAND CENTER Build menu
              (bottom left, to the right of the control panel—open it with the
              large waffle button next to the control panel) and select City,
              then click on your territory (increases population cap)
            </li>
            <li>
              <strong>Manage Economy:</strong> Open the COMMAND CENTER Economy
              tab to allocate research funding
            </li>
            <li>
              <strong>Keep Expanding:</strong> Continuously capture neutral
              territory and bots to grow your empire
            </li>
          </ol>
          <p class="mt-2 text-sm opacity-80">
            <strong>Tip:</strong> Focus on expansion and economy in the first
            5-10 minutes. Military units come later once you have the
            infrastructure.
          </p>
        </div>

        <div class="help-section">
          <div class="help-section-title">Core Gameplay Mechanics</div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2">Territory & Expansion</div>
            <ul class="help-list">
              <li>
                <strong>Neutral Territory:</strong> Non colored tiles are
                unclaimed land - capture them by clicking to send troops
              </li>
              <li>
                <strong>Enemy Territory:</strong> Colored tiles belong to other
                players or bots - you declare war when you attack them
              </li>
              <li>
                <strong>Capture Mechanics:</strong> Your troops automatically
                attack adjacent enemy/neutral tiles when you click them
              </li>
              <li>
                <strong>Territory Loss:</strong> If an enemy captures your tile,
                you lose that land and any structures on it
              </li>
            </ul>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-3">Combat System</div>
            <ul class="help-list">
              <li>
                <strong>Automatic Combat:</strong> Troops automatically fight
                when attacking or defending tiles
              </li>
              <li>
                <strong>Defensive Advantage:</strong> Defending troops have a
                bonus - attackers need numerical superiority
              </li>
              <li>
                <strong>Casualties:</strong> Both sides lose troops in combat.
                Hospitals can recover some casualties
              </li>
              <li>
                <strong>Attack Ratio:</strong> The slider in your control panel
                determines what % of troops are attacking vs defending
              </li>
            </ul>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-3">Population & Growth</div>
            <ul class="help-list">
              <li>
                <strong>Population Cap:</strong> Determined by the number and
                level of Cities you build
              </li>
              <li>
                <strong>Growth Rate:</strong> Population grows automatically
                over time up to your cap
              </li>
              <li>
                <strong>Worker/Troop Split:</strong> Use keys
                <span class="key">1</span>/<span class="key">2</span> or Shift +
                Mouse Wheel to adjust the ratio
              </li>
              <li>
                <strong>Workers:</strong> Generate gold based on your
                productivity level
              </li>
              <li>
                <strong>Troops:</strong> Used for attacking, defending, and
                territorial expansion
              </li>
            </ul>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-3">Economy & Resources</div>
            <ul class="help-list">
              <li>
                <strong>Gold Generation:</strong> Workers × Productivity = Gold
                per second
              </li>
              <li>
                <strong>Productivity:</strong> Increases over time through
                investment and Factories
              </li>
              <li>
                <strong>Spending:</strong> Gold is used to build structures,
                recruit units, and fund research
              </li>
              <li>
                <strong>Investment:</strong> Allocate income to Research, Roads,
                and Productivity growth in the Economy tab
              </li>
            </ul>
            <p class="mt-2 text-sm opacity-80">
              <strong>Example:</strong> If you have 1,000 workers at 2.0
              productivity, you generate 2,000 gold/second.
            </p>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Map & Visual Information</div>
          <ul class="help-list">
            <li>
              <strong>Territory Colors:</strong> Each player and bot has a
              unique color - other tiles are neutral (unclaimed)
            </li>
            <li>
              <strong>Borders:</strong> Thick lines separate player territories
            </li>
            <li>
              <strong>Structures:</strong> Icons on the map show where buildings
              are located
            </li>
            <li>
              <strong>Roads:</strong> Visible as lines connecting your
              structures - increase troop movement speed
            </li>
          </ul>
        </div>

        <div class="help-section">
          <div class="help-section-title">Diplomacy Mechanics</div>
          <p class="mb-2">
            Manage relationships with other players through the Diplomacy tab or
            radial menu (right-click).
          </p>
          <ul class="help-list">
            <li>
              <strong>Neutral (Default):</strong> You will not attack each
              other, but you're not allies. You can trade.
            </li>
            <li>
              <strong>Allied:</strong> You cannot attack each other. Breaking an
              alliance requires betrayal.
            </li>
            <li>
              <strong>War:</strong> You can attack each other's territory.
              Declared via "Declare War" or by attacking an ally.
            </li>
            <li>
              <strong>Peace Requests:</strong> Propose to end a war and return
              to neutral status. Both players must agree.
            </li>
            <li>
              <strong>Alliance Breaking:</strong> Use "Betray" to break an
              alliance - this puts you at war with your former ally.
            </li>
          </ul>
          <p class="mt-2 text-sm opacity-80">
            <strong>Warning:</strong> Betraying allies harms your defense. As
            long as you are traitor your defense will be 50% weaker.
          </p>
        </div>
      </div>
    `;
  }

  private renderUIGuideTab() {
    return html`
      <div class="help-tab-content">
        <div class="text-center text-2xl font-bold mb-4">User Interface</div>

        <div class="help-section">
          <div class="help-section-title">Welcome to Terratomic</div>
          <img
            src="/images/HelpModalScreenshots/AllUiIngame.png"
            class="help-image"
            alt="Game Interface"
          />
        </div>

        <div class="help-section">
          <div class="help-section-title">Control Panel</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-2">
                The control panel (bottom-left) shows your current resources and
                population distribution:
              </p>

              <ul class="help-list">
                <li>
                  <strong>Population:</strong> Total population (workers +
                  troops). Example: "15,000 / 30,000" means you have 15k
                  population with a 30k cap
                </li>
                <li>
                  <strong>Gold:</strong> Current gold reserves and income rate.
                  Example: "50,000 (+2,500/s)" means 50k gold, earning 2.5k per
                  second
                </li>
                <li>
                  <strong>Workers/Troops:</strong> Distribution of population
                  between economy and military. Adjust with keys
                  <span class="key">1</span>/<span class="key">2</span>
                </li>
                <li>
                  <strong>Attack Ratio:</strong> Percentage of troops currently
                  attacking vs defending. Higher = more aggressive expansion
                </li>
              </ul>
              <p class="mt-2 text-sm opacity-80">
                <strong>Tip:</strong> Don't attack with a large amount of
                troops. It will leave you vulnerable to counter attacks.
              </p>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/ControlPanel.png"
                class="help-image help-image-small"
                alt="Control Panel"
                style="margin-top: 0;"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Command Center</div>
          <p class="mb-4">
            The Command Center (bottom left, to the right of the control panel)
            is your main control hub, organized into several tabs for different
            aspects of your empire management. Open the Command Center using the
            large waffle button next to the control panel.
          </p>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2">🏗️ Build Tab</div>
            <div class="help-row">
              <div class="help-col">
                <p class="mb-2">
                  Construct permanent structures to expand your economy and
                  military capabilities. Buildings include Cities (increase
                  population cap), Defense Posts (fortify territory), Ports
                  (enable naval units), Airfields (enable air units), Hospitals
                  (recover casualties), Research Labs (boost tech speed),
                  Military Academies (increase troop strength), Factories (boost
                  gold income), Missile Silos (enable nuclear weapons), SAM
                  Launchers (air defense), and the Doomsday Device (ultimate
                  deterrent).
                </p>
              </div>
              <div class="help-col">
                <img
                  src="/images/HelpModalScreenshots/CC-Build.png"
                  class="help-image help-image-small"
                  alt="Build Tab"
                  style="margin-top: 0;"
                />
              </div>
            </div>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-4">⚔️ Attack Tab</div>
            <div class="help-row">
              <div class="help-col">
                <p class="mb-2">
                  Recruit mobile units for warfare and expansion. Available
                  units include naval forces (Warships, Submarines, Transport
                  Ships, Trade Ships), air units (Bombers, Fighter Jets,
                  Paratroopers), and nuclear weapons (Atom Bombs, Hydrogen
                  Bombs, MIRVs). Each unit type requires specific structures and
                  technologies to unlock. Units can be upgraded to improve their
                  combat effectiveness.
                </p>
              </div>
              <div class="help-col">
                <img
                  src="/images/HelpModalScreenshots/CC-Attack.png"
                  class="help-image help-image-small"
                  alt="Attack Tab"
                  style="margin-top: 0;"
                />
              </div>
            </div>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-4">💰 Economy Tab</div>
            <div class="help-row">
              <div class="help-col">
                <p class="mb-2">
                  Manage your financial investments to grow your empire's
                  long-term power. Allocate income between Research (unlock
                  technologies, 0-50% of income), Productivity (increase worker
                  efficiency and gold generation), and Roads (boost troop
                  movement speed and economic output). Balancing these
                  investments is crucial for maintaining both short-term
                  military strength and long-term economic dominance.
                </p>
              </div>
              <div class="help-col">
                <img
                  src="/images/HelpModalScreenshots/CC-Economoy.png"
                  class="help-image help-image-small"
                  alt="Economy Tab"
                  style="margin-top: 0;"
                />
              </div>
            </div>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-4">🚢 Trade Tab</div>
            <div class="help-row">
              <div class="help-col">
                <p class="mb-2">
                  Monitor your international trade network and manage trade
                  ships. Trade ships automatically travel between your ports and
                  other players' ports to generate passive gold income. This tab
                  displays active trade routes, trade ship counts, and allows
                  you to manage your maritime commerce. Trade ships are
                  vulnerable to enemy warships and submarines during wartime.
                </p>
              </div>
              <div class="help-col">
                <img
                  src="/images/HelpModalScreenshots/CC-Trade.png"
                  class="help-image help-image-small"
                  alt="Trade Tab"
                  style="margin-top: 0;"
                />
              </div>
            </div>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-4">🤝 Diplomacy Tab</div>
            <div class="help-row">
              <div class="help-col">
                <p class="mb-2">
                  Manage diplomatic relations with other players. View all
                  players in the game and their current diplomatic status with
                  you (Neutral, Allied, or War). Propose alliances, declare war,
                  request peace, or betray allies. Diplomatic actions have
                  strategic consequences - betraying allies weakens your defense
                  by 50% while you have the traitor status, and maintaining good
                  relations can provide strategic advantages.
                </p>
              </div>
              <div class="help-col">
                <img
                  src="/images/HelpModalScreenshots/CC-Diplomacy.png"
                  class="help-image help-image-small"
                  alt="Diplomacy Tab"
                  style="margin-top: 0;"
                />
              </div>
            </div>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-4">✈️ Bombers Tab</div>
            <div class="help-row">
              <div class="help-col">
                <p class="mb-2">
                  Coordinate strategic air strikes from your airfields. Bombers
                  automatically launch from airfields to attack enemy structures
                  and territories, dealing significant damage without risking
                  ground troops. This tab allows you to manage bombing campaigns
                  and target priorities.
                </p>

                <ul class="help-list">
                  <li>
                    <strong>Targeting:</strong> Select a specific enemy player
                    to focus bombing runs on, concentrating your air power
                    against priority threats.
                  </li>
                  <li>
                    <strong>Auto-Bomb:</strong> Toggle automatic bombing to let
                    your commanders choose targets based on strategic value and
                    opportunity.
                  </li>
                  <li>
                    <strong>Range:</strong> Only players within range of your
                    airfields can be targeted. Higher-level airfields have
                    extended range (250/350/450 tiles).
                  </li>
                </ul>
              </div>
              <div class="help-col">
                <img
                  src="/images/HelpModalScreenshots/CC-Bombers.png"
                  class="help-image help-image-small"
                  alt="Bombers Tab"
                  style="margin-top: 0;"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Radial Menu</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-2">
                Right-click on tiles to access context-sensitive actions:
              </p>
              <ul class="help-list">
                <li>
                  <div class="icon info-icon inline-icon"></div>
                  <strong>Info:</strong> View detailed player information and
                  statistics
                </li>
                <li>
                  <div class="icon boat-icon inline-icon"></div>
                  <strong>Transport Ship:</strong> Deploy transport ships to
                  attack across water
                </li>
                <li>
                  <div class="icon alliance-icon inline-icon"></div>
                  <strong>Alliance:</strong> Propose alliances with other
                  players
                </li>
                <li>
                  <div class="icon betray-icon inline-icon"></div>
                  <strong>Betray:</strong> Break alliances with current allies
                </li>
                <li>
                  <div class="icon dove-icon inline-icon"></div>
                  <strong>Peace:</strong> Request peace with neutral players or
                  those you're at war with
                </li>
                <li>
                  <div class="icon war-icon inline-icon"></div>
                  <strong>Declare War:</strong> Formally declare war on neutral
                  players
                </li>
                <li>
                  <div class="icon air-attack-icon inline-icon"></div>
                  <strong>Air Attack:</strong> Deploy paratroopers from
                  airfields (requires tech)
                </li>
                <li>
                  <div class="icon sword-icon inline-icon"></div>
                  <strong>Attack (Center):</strong> Launch ground attack with
                  troops
                </li>
              </ul>
              <p class="mt-2 text-sm opacity-80">
                <strong>Note:</strong> Available options depend on the tile you
                click and your current capabilities.
              </p>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/RadialMenu.png"
                class="help-image help-image-medium"
                alt="Radial Menu"
                style="margin-top: 0;"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Events Panel</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-2">
                The events panel displays important notifications:
              </p>

              <ul class="help-list">
                <li>
                  <strong>Alliance Requests:</strong> Incoming and outgoing
                  alliance proposals
                </li>
                <li>
                  <strong>Attack Warnings:</strong> Notifications when you're
                  under attack
                </li>
                <li>
                  <strong>Quick Chat:</strong> Messages and emotes from other
                  players
                </li>
                <li>
                  <strong>Game Events:</strong> Important game state changes
                </li>
              </ul>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/EventPanel.png"
                class="help-image help-image-medium"
                alt="Event Panel"
                style="margin-top: 0;"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Leaderboard</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-2">
                Located in the top-left corner, the leaderboard shows the
                current standings of all players in the game.
              </p>
              <ul class="help-list">
                <li>
                  <strong>Rankings:</strong> Players are ranked by territory
                  controlled (percentage of map)
                </li>
                <li>
                  <strong>Player Info:</strong> Shows each player's name, color,
                  and current map control percentage
                </li>
                <li>
                  <strong>Victory Condition:</strong> Control
                  <strong>80%</strong> of the world map (95% in Team games).
                </li>
                <li>
                  <strong>Real-time Updates:</strong> Rankings update
                  dynamically as territories change hands
                </li>
              </ul>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/Leaderboard.png"
                class="help-image help-image-small"
                alt="Leaderboard"
                style="margin-top: 0;"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Research Tree Button</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-2">
                Located on the left side of the screen (center height), this
                button opens the Technology Research Tree interface.
              </p>
              <ul class="help-list">
                <li>
                  <strong>Tech Tree View:</strong> Displays all available
                  technologies organized by category
                </li>
                <li>
                  <strong>Progress Tracking:</strong> Shows completion
                  percentage for each technology
                </li>
                <li>
                  <strong>Priority Selection:</strong> Click technologies to
                  prioritize them for faster research
                </li>
                <li>
                  <strong>Prerequisites:</strong> Visual connections show which
                  techs must be completed first
                </li>
              </ul>
              <p class="mt-2 text-sm opacity-80">
                <strong>Tip:</strong> Regularly check the tech tree to plan your
                research path and prioritize critical technologies.
              </p>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/OpenResearch.png"
                class="help-image"
                style="max-width: 100px; max-height: 200px; margin-top: 0; object-fit: contain; border: none; box-shadow: none; border-radius: 0;"
                alt="Research Menu Button"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Options Menu</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-2">
                Located in the top-left corner (near the leaderboard), the
                options menu provides access to gameplay settings.
              </p>

              <ul class="help-list">
                <li>
                  <strong>Gameplay Options:</strong> Toggle various UI elements
                  and game features to customize your experience
                </li>
              </ul>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/Options.png"
                class="help-image help-image-medium"
                alt="Options Menu"
                style="margin-top: 0;"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Player Status Icons</div>
          <p class="mb-2">
            Icons appear above player names on the map to show their diplomatic
            status and relationship with you:
          </p>
          <div class="help-row">
            <div class="help-col">
              <ul class="help-list">
                <li>
                  <strong>Peace Symbol:</strong> Indicates you have an active
                  peace agreement with this player. Neither can attack the other
                  until the peace is broken.
                </li>
                <li>
                  <strong>Alliance Request:</strong> Shows when a player has
                  sent you an alliance proposal that you haven't responded to
                  yet.
                </li>
                <li>
                  <strong>Traitor Symbol:</strong> Appears when a player has
                  betrayed an alliance. Traitors suffer a 50% defense penalty
                  until the status expires.
                </li>
                <li>
                  <strong>Embargo Symbol:</strong> Indicates you have placed a
                  trade embargo on this player, preventing trade ships from
                  traveling to their ports.
                </li>
              </ul>
            </div>
            <div class="help-col">
              <div
                style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center;"
              >
                <img
                  src="/images/HelpModalScreenshots/Peace.png"
                  class="help-image"
                  style="max-width: 120px; margin: 5px;"
                  alt="Peace Icon"
                />
                <img
                  src="/images/HelpModalScreenshots/AllianceRequest.png"
                  class="help-image"
                  style="max-width: 120px; margin: 5px;"
                  alt="Alliance Request Icon"
                />
                <img
                  src="/images/HelpModalScreenshots/Traitor.png"
                  class="help-image"
                  style="max-width: 120px; margin: 5px;"
                  alt="Traitor Icon"
                />
                <img
                  src="/images/HelpModalScreenshots/Embargo.png"
                  class="help-image"
                  style="max-width: 120px; margin: 5px;"
                  alt="Embargo Icon"
                />
              </div>
            </div>
          </div>
          <p class="mt-2 text-sm opacity-80">
            <strong>Tip:</strong> These icons help you quickly identify the
            diplomatic status of players without opening menus.
          </p>
        </div>
      </div>
    `;
  }

  private renderStructuresTab() {
    return html`
      <div class="help-tab-content">
        <div class="text-2xl font-bold mb-4 text-center">Structures</div>

        <div class="help-text">
          <p>
            Structures are essential for your economy and military. Build them
            using <strong>Hotkeys</strong> or by selecting them from the
            <strong>Command Center Build Menu</strong>.
          </p>
        </div>

        <table class="help-table">
          <thead>
            <tr>
              <th>Name</th>
              <th class="icon-col">Icon</th>
              <th>Hotkey</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody class="text-left">
            <tr>
              <td><strong>City</strong></td>
              <td><div class="icon city-icon"></div></td>
              <td><span class="key">Y</span></td>
              <td>
                Urban centers for population mobilization. Increases manpower
                cap by <strong>30,000</strong> per level.
                <strong>Tip:</strong> Establish early to secure long-term
                growth.
              </td>
            </tr>
            <tr>
              <td><strong>Defense Post</strong></td>
              <td><div class="icon defense-post-icon"></div></td>
              <td><span class="key">K</span></td>
              <td>
                Fortified strongpoints to stall enemy advances. Provides
                defensive bonuses to stationed troops.
                <strong>Range:</strong> 40 tiles. <strong>Tip:</strong> Deploy
                at chokepoints to create kill zones.
              </td>
            </tr>
            <tr>
              <td><strong>Port</strong></td>
              <td><div class="icon port-icon"></div></td>
              <td><span class="key">U</span></td>
              <td>
                Naval logistics hubs. Enables construction of
                <strong>Warships</strong> and <strong>Submarines</strong> for
                maritime dominance. Automatically deploys
                <strong>Trade Ships</strong>. <strong>Tip:</strong> Vital for
                projecting power across oceans.
              </td>
            </tr>
            <tr>
              <td><strong>Airfield</strong></td>
              <td><div class="icon airfield-icon"></div></td>
              <td><span class="key">I</span></td>
              <td>
                Strategic air command bases. Essential for projecting air power.
                <strong>Bomber Range:</strong> 250 / 350 / 450 tiles (by level).
                <strong>Tip:</strong> Strike deep behind enemy lines.
              </td>
            </tr>
            <tr>
              <td><strong>Hospital</strong></td>
              <td><div class="icon hospital-icon"></div></td>
              <td><span class="key">O</span></td>
              <td>
                Field medical centers. Critical for sustaining combat
                operations. First facility recovers ~10% of casualties; max
                ~40%.
                <strong>Tip:</strong> Secure one early to conserve manpower.
              </td>
            </tr>
            <tr>
              <td><strong>Research Lab</strong></td>
              <td><div class="icon research-lab-icon"></div></td>
              <td><span class="key">L</span></td>
              <td>
                Advanced weapons development facilities. Accelerates
                technological breakthroughs. First lab provides ~40% boost,
                second ~20%, halving thereafter.
                <strong>Tip:</strong> maintain technological superiority.
              </td>
            </tr>
            <tr>
              <td><strong>Military Academy</strong></td>
              <td><div class="icon academy-icon"></div></td>
              <td><span class="key">P</span></td>
              <td>
                Officer training grounds. Enhances troop combat effectiveness by
                up to 20%. First academy yields ~10% boost.
                <strong>Tip:</strong> Train elite forces before major
                offensives.
              </td>
            </tr>
            <tr>
              <td><strong>Factory</strong></td>
              <td><div class="icon factory-icon"></div></td>
              <td><span class="key">F</span></td>
              <td>
                Industrial production complexes. Boosts gold generation
                efficiency. First complex increases output by ~27%.
                <strong>Tip:</strong> Fuel the war machine with robust industry.
              </td>
            </tr>
            <tr>
              <td><strong>Missile Silo</strong></td>
              <td><div class="icon missile-silo-icon"></div></td>
              <td><span class="key">H</span></td>
              <td>
                Strategic launch sites. The cornerstone of nuclear deterrence.
                Enables <strong>Atom Bombs</strong>,
                <strong>Hydrogen Bombs</strong>, and <strong>MIRVs</strong>.
                <strong>Tip:</strong> Mutually Assured Destruction is a valid
                strategy.
              </td>
            </tr>
            <tr>
              <td><strong>SAM Launcher</strong></td>
              <td><div class="icon sam-launcher-icon"></div></td>
              <td><span class="key">J</span></td>
              <td>
                Air defense batteries. Intercepts incoming aircraft and
                missiles.
                <strong>Range:</strong> 70 / 95 / 128 tiles (by level).
                <strong>Tip:</strong> Create an iron dome over key assets.
              </td>
            </tr>
            <tr>
              <td><strong>Doomsday Device</strong></td>
              <td><div class="icon doomsday-icon"></div></td>
              <td><span class="text-sm opacity-60">None</span></td>
              <td>
                The ultimate deterrent. Activation triggers a catastrophic
                radioactive event, neutralizing territory and crippling global
                infrastructure.
                <strong>Warning:</strong> Use only as a last resort.
              </td>
            </tr>
          </tbody>
        </table>

        <div class="help-section">
          <div class="help-section-title">Building Hotkeys</div>
          <p class="mb-2">
            <strong>Configurable Hotkeys:</strong> You can customize hotkeys for
            building structures.
          </p>
          <ul class="help-list">
            <li>
              <strong>View Hotkeys:</strong> Check the
              <strong>Settings</strong> menu to see and customize your hotkeys
            </li>
            <li>
              <strong>Quick Reference:</strong> Look in the bottom right corner
              of the build items in the
              <strong>Command Center Build Menu</strong> (bottom left, to the
              right of the control panel) to see their assigned hotkeys
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  private renderUnitsTab() {
    return html`
      <div class="help-tab-content">
        <div class="text-2xl font-bold mb-4 text-center">Units</div>
        <p class="mb-4 text-center">
          Mobile units are recruited from the Attack tab in the Command Center.
          They require specific structures and technologies to unlock.
        </p>

        <div class="help-section">
          <div class="help-section-title">Unit Deployment & Behavior</div>
          <ul class="help-list">
            <li>
              <strong>Recruitment:</strong> Units are built from the Attack tab
              (Command Center, bottom left, to the right of the control panel)
            </li>
            <li>
              <strong>Automatic AI:</strong> Most units operate autonomously -
              they patrol, defend, and engage enemies automatically
            </li>
            <li>
              <strong>Manual Control:</strong> Some units (Transport Ships,
              Nukes) require manual targeting via right-click menu
            </li>
            <li>
              <strong>Prerequisites:</strong> Units require specific structures
              (e.g., Port for ships, Airfield for aircraft)
            </li>
            <li>
              <strong>Upgrades:</strong> Click the upgrade arrow on unit cards
              to improve their stats (requires tech research)
            </li>
          </ul>
        </div>

        <div class="help-subsection">
          <div class="text-xl font-bold mb-3">Naval Units</div>
          <table class="help-table">
            <thead>
              <tr>
                <th>Name</th>
                <th class="icon-col">Icon</th>
                <th>Hotkey</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody class="text-left">
              <tr>
                <td><strong>Transport Ship</strong></td>
                <td><div class="icon transport-ship-icon"></div></td>
                <td><span class="text-sm opacity-60">Menu</span></td>
                <td>
                  <strong>Requirement:</strong> Port<br />
                  Carries troops across water to expand your territory overseas.
                  Essential for island hopping.
                  <strong>Capacity:</strong> Can carry large numbers of troops.
                </td>
              </tr>
              <tr>
                <td><strong>Warship</strong></td>
                <td><div class="icon warship-icon"></div></td>
                <td><span class="key">9</span></td>
                <td>
                  <strong>Requirement:</strong> Port<br />
                  Powerful naval combat vessel. Patrols and engages enemy naval
                  units (and trade ships during war).
                  <strong>Upgrades:</strong> Levels 2/3 boost hull and damage
                  (HP 1250/1500; +70 dmg per level).
                </td>
              </tr>
              <tr>
                <td><strong>Submarine</strong></td>
                <td><div class="icon submarine-icon"></div></td>
                <td><span class="text-sm opacity-60">None</span></td>
                <td>
                  <strong>Requirement:</strong> Port<br />
                  Stealthy underwater vessel. Hunts enemy naval units and trade
                  ships (only when at war).
                  <strong>Special:</strong> Can only be detected by nearby naval
                  units. <strong>Upgrades:</strong> Levels 2/3 boost hull and
                  damage (HP 1250/1500; +70 dmg per level).
                </td>
              </tr>
              <tr>
                <td><strong>Trade Ship</strong></td>
                <td><div class="icon boat-icon"></div></td>
                <td><span class="text-sm opacity-60">Auto</span></td>
                <td>
                  <strong>Requirement:</strong> Port<br />
                  Generates gold by trading between your ports and other
                  players’ ports (not between your own ports). Passive income
                  source.
                  <strong>Tip:</strong> Protect trade routes from pirates and
                  enemy submarines.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-subsection">
          <div class="text-xl font-bold mb-3 mt-6">Air Units</div>
          <table class="help-table">
            <thead>
              <tr>
                <th>Name</th>
                <th class="icon-col">Icon</th>
                <th>Hotkey</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody class="text-left">
              <tr>
                <td><strong>Bomber</strong></td>
                <td><div class="icon airfield-icon"></div></td>
                <td><span class="text-sm opacity-60">Auto</span></td>
                <td>
                  <strong>Requirement:</strong> Airfield<br />
                  Aircraft that bombs enemy structures and territories. Launches
                  from airfields and must return.
                  <strong>Vulnerable to:</strong> Fighter jets and SAM
                  launchers. <strong>Upgrades:</strong> Longer range
                  (250/350/450), faster (speed 2/3/4), tougher (500/600/700 HP),
                  more damage (250/300/350).
                </td>
              </tr>
              <tr>
                <td><strong>Fighter Jet</strong></td>
                <td><div class="icon fighter-jet-icon"></div></td>
                <td><span class="key">8</span></td>
                <td>
                  <strong>Requirement:</strong> Airfield<br />
                  Fast aircraft that intercepts bombers and missiles. Can patrol
                  areas for air defense.
                  <strong>Upgrades:</strong> Levels 2-4 increase damage and HP
                  (dmg +100 per level; HP 1000/1250/1500). Naval targeting comes
                  from tech, not levels.
                </td>
              </tr>
              <tr>
                <td><strong>Paratrooper</strong></td>
                <td><div class="icon air-attack-icon"></div></td>
                <td><span class="text-sm opacity-60">Menu</span></td>
                <td>
                  <strong>Requirement:</strong> Airfield<br />
                  Airborne troops that can be dropped behind enemy lines for
                  surprise attacks.
                  <strong>Tip:</strong> Excellent for capturing isolated enemy
                  territories.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-subsection">
          <div class="text-xl font-bold mb-3 mt-6">Nuclear Weapons</div>
          <table class="help-table">
            <thead>
              <tr>
                <th>Name</th>
                <th class="icon-col">Icon</th>
                <th>Hotkey</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody class="text-left">
              <tr>
                <td><strong>Atom Bomb</strong></td>
                <td><div class="icon atom-bomb-icon"></div></td>
                <td><span class="key">5</span></td>
                <td>
                  <strong>Requirement:</strong> Missile Silo<br />
                  First-generation nuclear weapon. Destroys structures and kills
                  troops in blast radius.
                  <strong>Range:</strong> Limited by trajectory calculation.
                </td>
              </tr>
              <tr>
                <td><strong>Hydrogen Bomb</strong></td>
                <td><div class="icon hydrogen-bomb-icon"></div></td>
                <td><span class="key">6</span></td>
                <td>
                  <strong>Requirement:</strong> Missile Silo<br />
                  More powerful than Atom Bomb. Larger blast radius and more
                  damage.
                  <strong>Tip:</strong> Can devastate entire regions in one
                  strike.
                </td>
              </tr>
              <tr>
                <td><strong>MIRV</strong></td>
                <td><div class="icon mirv-icon"></div></td>
                <td><span class="key">7</span></td>
                <td>
                  <strong>Requirement:</strong> Missile Silo<br />
                  Multiple Independently targetable Reentry Vehicles. Splits
                  into multiple warheads.
                  <strong>Special:</strong> Each warhead can target different
                  locations.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private renderInvestmentTab() {
    return html`
      <div class="help-tab-content">
        <div class="text-2xl font-bold mb-4 text-center">
          Investment & Research
        </div>

        <div class="help-section">
          <div class="help-section-title">Investment System Overview</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-3">
                You can allocate a portion of your income to various investments
                that provide long-term strategic benefits. Investment reduces
                your immediate gold income but provides advantages that compound
                over time.
              </p>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/CC-Economoy.png"
                class="help-image help-image-small"
                alt="Economy Tab"
                style="margin-top: 0;"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Research Investment</div>
          <p class="mb-2">
            Research unlocks new technologies in the tech tree. You can allocate
            up to 50% of your income to research.
          </p>
          <ul class="help-list">
            <li>
              <strong>Investment Rate:</strong> Adjustable from 0-50% of your
              income
            </li>
            <li>
              <strong>Research Speed:</strong> Higher investment = faster
              technology unlocks
            </li>
            <li>
              <strong>Research Labs:</strong> Each lab increases research speed
              with diminishing returns (first +40%, second +20%, halving
              thereafter)
            </li>
          </ul>
          <p class="mt-2 text-sm opacity-80">
            <strong>Strategy Tip:</strong> Keep research funded to avoid falling
            behind in tech.
          </p>
        </div>

        <div class="help-section">
          <div class="help-section-title">Productivity Investment</div>
          <p class="mb-2">
            Productivity represents your industrial capacity and worker
            efficiency. It determines how much gold each worker generates.
          </p>
          <ul class="help-list">
            <li>
              <strong>Growth Rate:</strong> Determined by your investment rate
              (portion of income not spent)
            </li>
            <li>
              <strong>Compound Effect:</strong> Higher productivity = more gold
              = faster productivity growth
            </li>
            <li>
              <strong>Loss Conditions:</strong> Can be reduced through warfare,
              nukes, and scorched earth
            </li>
            <li>
              <strong>Long-term Impact:</strong> Most important economic stat
              for late-game dominance
            </li>
          </ul>
          <p class="mt-2 text-sm opacity-80">
            <strong>Strategy Tip:</strong> Balance short-term spending with
            long-term productivity growth.
          </p>
        </div>

        <div class="help-section">
          <div class="help-section-title">Road Investment</div>
          <p class="mb-2">
            Roads increase troop movement speed across your territory and
            provide economic bonuses through improved trade and logistics.
          </p>
          <ul class="help-list">
            <li>
              <strong>Investment Rate:</strong> Adjustable from 0-100% of your
              income
            </li>
            <li>
              <strong>Construction Speed:</strong> Higher investment = faster
              road network expansion
            </li>
            <li>
              <strong>Maintenance Cost:</strong> Roads require ongoing
              maintenance based on network length
            </li>
            <li>
              <strong>Break-Even Point:</strong> Shown on slider - where
              construction cost equals maintenance
            </li>
            <li>
              <strong>Quality:</strong> Currently constant at 100%, may vary in
              future updates
            </li>
            <li>
              <strong>Completion:</strong> Percentage of planned roads that are
              finished
            </li>
          </ul>
          <p class="mt-2 text-sm opacity-80">
            <strong>Strategy Tip:</strong> Invest heavily early to build network
            quickly, then reduce to maintenance level.
          </p>
        </div>

        <div class="help-section">
          <div class="help-section-title">Investment Strategy</div>
          <p class="mb-2">
            Effective investment requires balancing multiple competing
            priorities:
          </p>
          <ul class="help-list">
            <li>
              <strong>Early Game:</strong> Focus on productivity growth and
              essential techs
            </li>
            <li>
              <strong>Mid Game:</strong> Balance roads, research, and military
              spending
            </li>
            <li>
              <strong>Late Game:</strong> Maximize productivity while
              maintaining military superiority
            </li>
            <li>
              <strong>Under Attack:</strong> Reduce investments to fund
              immediate defense
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  private renderTechTreeTab() {
    const nodes = getTechNodes();

    // Group techs by category
    const categories: Record<string, any[]> = {
      Land: [],
      Sea: [],
      Air: [],
      Nuclear: [],
      Economy: [],
    };

    for (const node of nodes) {
      const techDef = TECHS[node.id];
      if (techDef && categories[node.category]) {
        categories[node.category].push({
          ...node,
          name: techDef.meta.name,
          description: techDef.meta.description ?? "No description available.",
        });
      }
    }

    // Sort each category by level
    for (const cat in categories) {
      categories[cat].sort((a, b) => a.level - b.level);
    }

    return html`
      <div class="help-tab-content">
        <div class="text-2xl font-bold mb-4 text-center">Technology Tree</div>

        <div class="help-section">
          <div class="help-section-title">Tech Tree Overview</div>
          <div class="help-row">
            <div class="help-col">
              <p class="mb-3">
                The tech tree contains technologies organized into five
                categories: <strong>Land</strong>, <strong>Sea</strong>,
                <strong>Air</strong>, <strong>Nuclear</strong>, and
                <strong>Economy</strong>. Each technology provides unique
                bonuses, unlocks new units, or enables new capabilities.
              </p>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/ReseacrhTree-Land.png"
                class="help-image help-image-small"
                alt="Tech Tree"
                style="margin-top: 0;"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">How Research Works</div>
          <div class="help-row">
            <div class="help-col">
              <ul class="help-list">
                <li>
                  <strong>Prerequisites:</strong> Technologies have requirements
                  that must be researched first
                </li>
                <li>
                  <strong>"All Of" Requirements:</strong> Red connections - all
                  prerequisites must be completed
                </li>
                <li>
                  <strong>"One Of" Requirements:</strong> Yellow connections -
                  only one prerequisite needed
                </li>
                <li>
                  <strong>Priority Selection:</strong> Click on a tech to
                  prioritize it (receives 50% of research)
                </li>
                <li>
                  <strong>Progress Display:</strong> Each tech shows completion
                  percentage
                </li>
                <li>
                  <strong>Completion Indicator:</strong> Completed techs are
                  marked with a checkmark
                </li>
                <li>
                  <strong>Research Beakers:</strong> Progress is measured in
                  "beakers" (research points)
                </li>
              </ul>
            </div>
            <div class="help-col">
              <img
                src="/images/HelpModalScreenshots/OpenResearch.png"
                class="help-image"
                style="max-width: 100px; max-height: 200px; margin-top: 0; object-fit: contain; border: none; box-shadow: none; border-radius: 0;"
                alt="Research Menu"
              />
            </div>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Tech Categories</div>

          ${Object.entries(categories).map(
            ([category, techs]) => html`
              <div class="help-subsection">
                <div class="text-lg font-bold mb-2 mt-3">
                  ${category === "Land"
                    ? "🏔️ Land"
                    : category === "Sea"
                      ? "🌊 Sea"
                      : category === "Air"
                        ? "✈️ Air"
                        : category === "Nuclear"
                          ? "☢️ Nuclear"
                          : "💰 Economy"}
                </div>
                <p class="mb-2 text-sm opacity-80">
                  ${category === "Land"
                    ? "Technologies that improve ground warfare, troop strength, and territorial control."
                    : category === "Sea"
                      ? "Naval technologies including submarines, warship upgrades, and maritime capabilities."
                      : category === "Air"
                        ? "Aviation technologies including jet engines, bombers, fighters, and air defense."
                        : category === "Nuclear"
                          ? "Nuclear weapons progression from atomic bombs to MIRVs and the Doomsday Device."
                          : "Economic technologies including roads, trade, hospitals, research labs, and structure insurance."}
                </p>
                <ul class="help-list text-sm">
                  ${techs.map(
                    (tech) => html`
                      <li>
                        <strong>${tech.name}:</strong> ${tech.description}
                        ${tech.cost
                          ? html`<span class="opacity-60"
                              >(Cost: ${tech.cost} beakers)</span
                            >`
                          : ""}
                      </li>
                    `,
                  )}
                </ul>
              </div>
            `,
          )}
        </div>

        <div class="help-section">
          <div class="help-section-title">Research Strategy</div>
          <ul class="help-list">
            <li>
              <strong>Early Game:</strong> Rush economy techs (Roads, Hospitals,
              Research Labs)
            </li>
            <li>
              <strong>Mid Game:</strong> Balance military and economic techs
              based on threats
            </li>
            <li>
              <strong>Late Game:</strong> Focus on advanced weapons and unit
              upgrades
            </li>
            <li>
              <strong>Defensive:</strong> Prioritize SAM launchers and fighter
              jets if facing air attacks
            </li>
            <li>
              <strong>Offensive:</strong> Rush nuclear weapons for devastating
              strikes
            </li>
            <li>
              <strong>Naval Maps:</strong> Prioritize submarine and warship
              upgrades early
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  private renderStrategyTab() {
    return html`
      <div class="help-tab-content">
        <div class="text-2xl font-bold mb-4 text-center">Strategy & Tips</div>

        <div class="help-section">
          <div class="help-section-title">
            Early Game Strategy (0-10 Minutes)
          </div>
          <p class="mb-2">
            The first 10 minutes set the foundation for your entire game. Focus
            on expansion and economy.
          </p>
          <ol class="help-list">
            <li>
              <strong>Pick a Starting Position:</strong> Choose a position that
              allows you to expand in multiple directions. Avoid being
              surrounded by enemies.
            </li>
            <li>
              <strong>Start Expanding Immediately:</strong> Click adjacent
              neutral tiles to capture territory. Don't wait - every second
              counts!
            </li>
            <li>
              <strong>Balance Workers/Troops:</strong> Start with ~60% troops
              (press <span class="key">1</span> or <span class="key">2</span> to
              adjust). Too many workers = weak expansion. Too many troops = low
              income.
            </li>
            <li>
              <strong>Build Your First City:</strong> Once you have enough gold,
              build a City to increase your population cap.
            </li>
            <li>
              <strong>Allocate Research Funding:</strong> Open Economy tab and
              set research to 10-20%. Early tech advantage is crucial.
            </li>
            <li>
              <strong>Keep Expanding:</strong> Continuously capture neutral
              territory. More land = more resources = faster growth.
            </li>
            <li>
              <strong>Watch Your Borders:</strong> Pay attention to nearby
              players. If someone is expanding aggressively toward you, prepare
              for conflict.
            </li>
          </ol>
        </div>

        <div class="help-section">
          <div class="help-section-title">
            Mid Game Transitions (10-30 Minutes)
          </div>
          <p class="mb-2">
            Shift from pure expansion to strategic development and military
            buildup.
          </p>
          <ul class="help-list">
            <li>
              <strong>Diversify Structures:</strong> Build Ports (trade),
              Hospitals (troop recovery), Research Labs (faster tech), and
              Factories (more gold).
            </li>
            <li>
              <strong>Research Priority:</strong> Focus on economy techs first
              (Roads, Hospitals, Research Labs), then military techs based on
              threats.
            </li>
            <li>
              <strong>Form Alliances:</strong> Ally with neighbors to secure
              borders and focus expansion in other directions.
            </li>
            <li>
              <strong>Build Naval/Air Power:</strong> If you have coastline,
              build Ports. Research Jet Engines for air superiority.
            </li>
            <li>
              <strong>Productivity Investment:</strong> Keep some gold
              uninvested to grow productivity - this compounds over time.
            </li>
            <li>
              <strong>Road Network:</strong> Invest in roads to speed up troop
              movement across your empire.
            </li>
          </ul>
        </div>

        <div class="help-section">
          <div class="help-section-title">
            Late Game Dominance (30+ Minutes)
          </div>
          <p class="mb-2">
            Push for victory through overwhelming force or strategic strikes.
          </p>
          <ul class="help-list">
            <li>
              <strong>Advanced Weapons:</strong> Research and build nuclear
              weapons if you have the infrastructure.
            </li>
            <li>
              <strong>Air Superiority:</strong> Bombers can cripple enemy
              infrastructure. Fighter jets protect against enemy air attacks.
            </li>
            <li>
              <strong>Defensive Depth:</strong> Build SAM Launchers and Defense
              Posts to protect key territories.
            </li>
            <li>
              <strong>Economic Snowball:</strong> High productivity + multiple
              Factories = massive gold income for military spam.
            </li>
            <li>
              <strong>Coordinate Attacks:</strong> Use multiple attack vectors
              (ground, naval, air) simultaneously to overwhelm defenses.
            </li>
            <li>
              <strong>Watch for Doomsday:</strong> If an enemy is losing badly,
              they might activate a Doomsday Device. Be prepared.
            </li>
          </ul>
        </div>

        <div class="help-section">
          <div class="help-section-title">Common Beginner Mistakes</div>
          <ul class="help-list">
            <li>
              <strong>❌ Ignoring Research:</strong> Players who don't invest in
              research fall behind in tech and lose to advanced units.
            </li>
            <li>
              <strong>❌ All Workers or All Troops:</strong> You need balance.
              100% workers = no expansion and vulnerable to attacks. 100% troops
              = no income.
            </li>
            <li>
              <strong>❌ Overextending Territory:</strong> Expanding too thin
              makes you vulnerable. Consolidate before pushing further.
            </li>
            <li>
              <strong>❌ Neglecting Defense:</strong> Build Defense Posts and
              keep troops defending your borders, not just attacking.
            </li>
            <li>
              <strong>❌ Ignoring Diplomacy:</strong> Making enemies on all
              sides is a recipe for defeat. Ally strategically.
            </li>
            <li>
              <strong>❌ Forgetting About Trade Ships:</strong> Ports
              automatically deploy trade ships - protect them for passive
              income.
            </li>
          </ul>
        </div>

        <div class="help-section">
          <div class="help-section-title">Advanced Tactics</div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2">Productivity Snowballing</div>
            <p class="mb-2">
              The most powerful long-term strategy. Productivity compounds
              expotroy enemy infrastructure without ground combat.
            </p>
            <ul class="help-list text-sm">
              <li>
                Keep 20-30% of your income uninvested (not spent on research,
                roads, or buildings)
              </li>
              <li>
                This "saved" income automatically increases your productivity
              </li>
              <li>
                Higher productivity = more gold = faster productivity growth =
                economic dominance
              </li>
              <li>Build Factories to accelerate this process</li>
            </ul>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-3">Bomber Harassment</div>
            <p class="mb-2">
              Use bombers to destroy enemy infrastructure without ground combat.
            </p>
            <ul class="help-list text-sm">
              <li>
                Build multiple Airfields to increase bomber range and production
              </li>
              <li>
                Target enemy Factories, Research Labs, and Missile Silos to
                cripple their economy and military
              </li>
              <li>
                Upgrade bombers for longer range, higher speed, and more damage
              </li>
              <li>
                Watch for enemy SAM Launchers and Fighter Jets - they counter
                bombers
              </li>
            </ul>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-3">Naval Dominance</div>
            <p class="mb-2">
              Control the seas to dominate island maps and coastal regions.
            </p>
            <ul class="help-list text-sm">
              <li>
                Build multiple Ports for more Warships, Submarines, and Trade
                Ships
              </li>
              <li>
                Submarines are stealthy - use them to hunt enemy trade ships and
                naval units
              </li>
              <li>
                Warships can be upgraded to shoot down aircraft (requires tech)
              </li>
              <li>
                Protect your trade ships - they generate significant passive
                income
              </li>
            </ul>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-3">Nuclear Strategy</div>
            <p class="mb-2">
              Nuclear weapons can turn the tide of war but require careful use.
            </p>
            <ul class="help-list text-sm">
              <li>
                Build Missile Silos in secure, inland locations (hard to bomb)
              </li>
              <li>
                Atom Bombs are good for tactical strikes on enemy structures
              </li>
              <li>
                Hydrogen Bombs have larger blast radius - use for devastating
                area denial
              </li>
              <li>
                MIRVs split into multiple warheads - can target multiple
                locations simultaneously
              </li>
              <li>
                <strong>Warning:</strong> Nuking allies will break your alliance
                and put you at war
              </li>
            </ul>
          </div>

          <div class="help-subsection">
            <div class="text-lg font-bold mb-2 mt-3">Alliance Manipulation</div>
            <p class="mb-2">
              Use diplomacy as a weapon to control the game's political
              landscape.
            </p>
            <ul class="help-list text-sm">
              <li>
                Ally with strong players to avoid conflict while you build up
              </li>
              <li>
                Betray allies when they're weak or distracted by other wars
              </li>
              <li>
                Propose alliances to players who are fighting each other to
                weaken both
              </li>
              <li>
                Use the Info panel (right-click → Info) to assess player
                strength before engaging
              </li>
            </ul>
          </div>
        </div>

        <div class="help-section">
          <div class="help-section-title">Map-Specific Tips</div>
          <ul class="help-list">
            <li>
              <strong>Island Maps:</strong> Prioritize Ports and naval tech.
              Control the seas to control the map.
            </li>
            <li>
              <strong>Continental Maps:</strong> Focus on ground expansion and
              road networks for fast troop movement.
            </li>
            <li>
              <strong>Large Maps:</strong> Airfields become crucial for
              projecting power across vast distances.
            </li>
            <li>
              <strong>Small Maps:</strong> Expect early conflict. Build Defense
              Posts and Military Academies quickly.
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  render() {
    let tabContent;
    switch (this.activeTab) {
      case "GettingStarted":
        tabContent = this.renderGettingStartedTab();
        break;
      case "UIGuide":
        tabContent = this.renderUIGuideTab();
        break;
      case "Structures":
        tabContent = this.renderStructuresTab();
        break;
      case "Units":
        tabContent = this.renderUnitsTab();
        break;
      case "Investment":
        tabContent = this.renderInvestmentTab();
        break;
      case "TechTree":
        tabContent = this.renderTechTreeTab();
        break;
      case "Strategy":
        tabContent = this.renderStrategyTab();
        break;
    }

    return html`
      <o-modal
        id="helpModal"
        title="Instructions"
        translationKey="main.instructions"
        max-width="min(90vw, 1200px)"
        max-height="85dvh"
      >
        <style>
          .help-tab-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 16px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 8px;
          }
          .help-tab {
            flex: 1 1 auto;
            min-width: 80px;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px 6px 0 0;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            text-align: center;
            font-size: 14px;
          }
          .help-tab:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
          }
          .help-tab.active {
            background: rgba(59, 130, 246, 0.3);
            border-color: rgba(59, 130, 246, 0.5);
            color: white;
            border-bottom: 2px solid rgba(59, 130, 246, 0.8);
            margin-bottom: -2px;
          }
          .help-tab-content {
            width: 80vw;
            max-width: 1100px;
            max-height: 60vh;
            overflow-y: auto;
            padding-right: 8px;
          }
          .help-tab-content::-webkit-scrollbar {
            width: 8px;
          }
          .help-tab-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }
          .help-tab-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
          }
          .help-tab-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          .help-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          .help-table th,
          .help-table td {
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: left;
          }
          .help-table th {
            background: rgba(255, 255, 255, 0.1);
            font-weight: 600;
          }
          .help-table .icon-col {
            width: 60px;
            text-align: center;
          }
          .help-table td:nth-child(2) {
            text-align: center;
          }
          .help-section {
            margin: 20px 0;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            border-left: 3px solid rgba(59, 130, 246, 0.5);
          }
          .help-section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
            color: rgba(59, 130, 246, 0.9);
          }
          .help-subsection {
            margin: 16px 0;
          }
          .help-list {
            list-style: disc;
            margin-left: 24px;
            margin-top: 8px;
          }
          .help-list li {
            margin: 6px 0;
            line-height: 1.5;
          }
          .inline-icon {
            display: inline-block;
            vertical-align: middle;
            width: 20px;
            height: 20px;
            margin-right: 4px;
          }

          @media screen and (max-width: 768px) {
            .help-tab {
              font-size: 12px;
              padding: 8px 8px;
              min-width: 60px;
            }
            .help-tab-content {
              max-height: 65vh;
            }
            .help-table {
              font-size: 13px;
            }
            .help-table th,
            .help-table td {
              padding: 8px;
            }
          }

          @media screen and (max-width: 480px) {
            .help-tab {
              font-size: 11px;
              padding: 6px 4px;
              min-width: 50px;
            }
            .help-table {
              font-size: 12px;
            }
            .help-table th,
            .help-table td {
              padding: 6px;
            }
          }

          .help-image {
            width: 100%;
            max-width: 900px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            margin: 10px auto;
            display: block;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .help-image-small {
            max-width: 360px;
          }

          .help-image-medium {
            max-width: 360px;
          }

          .help-row {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            align-items: flex-start;
          }

          .help-col {
            flex: 1 1 250px;
            min-width: 0;
          }
        </style>

        ${this.renderTabBar()} ${tabContent}
      </o-modal>
    `;
  }

  public open() {
    this.modalEl?.open();
  }

  public close() {
    this.modalEl?.close();
  }
}
