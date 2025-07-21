/**
 * Simple bottom-bar button that opens a pop-up for choosing a Bomber target
 * and dispatches SendBomberIntentEvent through the EventBus.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  [ ✈ Bomb Target ] ▽  ← (button, anchored bottom-centre)     │
 * └──────────────────────────────────────────────────────────────┘
 * When the button is clicked a lightweight <dialog> opens that lets
 * the player pick another player and any UnitType structure.
 */

import { EventBus } from "../../../core/EventBus";
import { isStructureType, PlayerType, UnitType } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import { SendBomberIntentEvent } from "../../Transport";
import { Layer } from "./Layer";

export class BomberMenu extends HTMLElement implements Layer {
  /** Injected from createRenderer */
  public eventBus!: EventBus;
  public game!: GameView;

  /* --- Layer no-ops ------------------------------------------------------ */
  shouldTransform() {
    return false;
  }
  renderLayer() {
    /* nothing – pure DOM */
  }
  redraw() {
    /* nothing – CSS handles visuals */
  }
  tick() {
    this.updateVisibility();
  }
  init?() {
    /* nothing */
  }

  /* ---------------------------------------------------------------------- */

  private dialog!: HTMLDialogElement;
  private playerSelect!: HTMLSelectElement;
  private structureSelect!: HTMLSelectElement;

  connectedCallback() {
    // This component is deprecated and its functionality has been moved to ControlPanel.ts
  }

  /** Called from createRenderer once game & eventBus exist */
  public populate() {
    if (!this.game) return;

    // --- players (exclude self) ------------------------------------------
    const me = this.game.myPlayer();
    if (!me) return;

    const myID = me.id();

    const players = this.game
      .players()
      .filter(
        (p) =>
          p.id() !== myID &&
          (p.type() === PlayerType.Human || p.type() === PlayerType.FakeHuman),
      )
      .sort((a, b) => {
        // Humans first
        if (a.type() !== b.type()) {
          return a.type() === PlayerType.Human ? -1 : 1;
        }
        // Alphabetical within same type
        return a.name().localeCompare(b.name());
      });

    const optsPlayers = players
      .map((p) => `<option value="${p.id()}">${p.name()}</option>`)
      .join("");

    this.playerSelect.innerHTML =
      optsPlayers || `<option disabled>No players</option>`;

    // --- structure types -------------------------------------------------
    const optsStruct = Object.values(UnitType)
      .filter((s) => isStructureType(s))
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");
    this.structureSelect.innerHTML = optsStruct;
  }

  /* ------------------------- helpers ----------------------------------- */
  private open() {
    this.populate(); // refresh every time – players could have changed
    this.dialog.showModal();
  }

  private sendIntent() {
    if (!this.eventBus) return;

    const targetID = String(this.playerSelect.value); // ensures it's a string

    const structure = this.structureSelect.value as unknown as UnitType;

    // fire event
    this.eventBus.emit(new SendBomberIntentEvent(targetID, structure));

    this.dialog.close();
  }
  private updateVisibility() {
    if (!this.game) return;
    this.style.display = this.game.inSpawnPhase() ? "none" : "block";
  }
}
// customElements.define("bomber-menu", BomberMenu);
