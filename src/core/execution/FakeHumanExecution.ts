import {
  Execution,
  Game,
  Nation,
  Player,
  PlayerID,
  PlayerType,
  Relation,
  TerrainType,
  Tick,
  UpgradeType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { GameID } from "../Schemas";
import { flattenedEmojiTable } from "../Util";
import { EmojiExecution } from "./EmojiExecution";
import { NukeExecutionHelper } from "./NukeExecutionHelper";
import { PeaceRequestExecution } from "./PeaceRequestExecution";
import { PurchaseUpgradeExecution } from "./PurchaseUpgradeExecution";
import { ResearchTreeSelectExecution } from "./ResearchTreeSelectExecution";
import { SetResearchInvestmentExecution } from "./SetResearchInvestmentExecution";
import { SetRoadInvestmentExecution } from "./SetRoadInvestmentExecution";
import { SpawnExecution } from "./SpawnExecution";
import { TransportShipExecution } from "./TransportShipExecution";
import { UnitCreationHelper } from "./UnitCreationHelper";
import { closestTwoTiles } from "./Util";
import {
  ARCHETYPE_CONFIGS,
  ArchetypeType,
  BotArchetypeConfig,
  hashArchetypeSeed,
  selectArchetype,
} from "./utils/BotArchetype";
import { BotBehavior } from "./utils/BotBehavior";

export class FakeHumanExecution implements Execution {
  private firstMove = true;

  private active = true;
  private random: PseudoRandom;
  private behavior: BotBehavior | null = null;
  private mg: Game;
  private player: Player | null = null;
  private nukeHelper: NukeExecutionHelper | null = null;
  private unitCreationHelper: UnitCreationHelper | null = null;

  private attackRate: number;
  private attackTick: number;
  private diplomacyTick: number;
  private triggerRatio: number;
  private reserveRatio: number;

  private lastEmojiSent = new Map<Player, Tick>();
  private embargoMalusApplied = new Set<PlayerID>();
  private heckleEmoji: number[];
  private hasSetInvestmentRate = false;

  // alongside other private fields
  private boatDestinations: TileRef[] = [];

  // Archetype system
  private archetype: ArchetypeType;
  private config: BotArchetypeConfig;
  private spawnRate = 40; // Fixed spawn rate for spawn phase (not affected by archetype)

  constructor(
    gameID: GameID,
    private nation: Nation,
  ) {
    // Select archetype deterministically
    this.archetype = selectArchetype(gameID, nation.playerInfo.id);
    this.config = ARCHETYPE_CONFIGS[this.archetype];

    // Use archetype-specific seed for randomness
    this.random = new PseudoRandom(
      hashArchetypeSeed(gameID, nation.playerInfo.id),
    );

    // Apply archetype configs
    this.attackRate = this.config.attackCadence;
    this.attackTick = this.random.nextInt(0, this.attackRate);
    this.diplomacyTick = this.random.nextInt(0, 500);
    this.triggerRatio = this.config.triggerRatio;
    this.reserveRatio = this.config.reserveRatio;
    this.heckleEmoji = ["🤡", "😡"].map((e) => flattenedEmojiTable.indexOf(e));
  }

  init(mg: Game) {
    this.mg = mg;
  }

  private updateRelationsFromEmbargos() {
    const player = this.player;
    if (player === null) return;
    const others = this.mg.players().filter((p) => p.id() !== player.id());

    others.forEach((other: Player) => {
      const embargoMalus = -20;
      if (
        other.hasEmbargoAgainst(player) &&
        !this.embargoMalusApplied.has(other.id())
      ) {
        player.updateRelation(other, embargoMalus);
        this.embargoMalusApplied.add(other.id());
      } else if (
        !other.hasEmbargoAgainst(player) &&
        this.embargoMalusApplied.has(other.id())
      ) {
        player.updateRelation(other, -embargoMalus);
        this.embargoMalusApplied.delete(other.id());
      }
    });
  }

  private handleEmbargoesToHostileNations() {
    const player = this.player;
    if (player === null) return;
    const others = this.mg.players().filter((p) => p.id() !== player.id());

    others.forEach((other: Player) => {
      /* When player is hostile starts embargo. Do not stop until neutral again */
      if (
        player.relation(other) <= Relation.Hostile &&
        !player.hasEmbargoAgainst(other)
      ) {
        player.addEmbargo(other.id(), false);
      } else if (
        player.relation(other) >= Relation.Neutral &&
        player.hasEmbargoAgainst(other)
      ) {
        player.stopEmbargo(other.id());
      }
    });
  }

  tick(ticks: number) {
    if (this.mg.inSpawnPhase()) {
      // Use fixed spawn rate during spawn phase (not affected by archetype)
      if (ticks % this.spawnRate === this.attackTick % this.spawnRate) {
        const rl = this.randomLand();
        if (rl === null) {
          console.warn(`cannot spawn ${this.nation.playerInfo.name}`);
        } else {
          this.mg.addExecution(new SpawnExecution(this.nation.playerInfo, rl));
        }
      }
      return;
    }

    if (this.player === null) {
      this.player =
        this.mg.players().find((p) => p.id() === this.nation.playerInfo.id) ??
        null;
      if (this.player === null) {
        return;
      }
      this.player.addUpgrade(UpgradeType.InternationalTrade);
      this.player.addUpgrade(UpgradeType.SubmarineResearch);

      // Set research and road investment based on archetype
      this.mg.addExecution(
        new SetResearchInvestmentExecution(
          this.player,
          this.config.researchInvestment,
        ),
      );
      this.mg.addExecution(new SetRoadInvestmentExecution(this.player, 0.2));
    }

    if (!this.player.isAlive()) {
      this.active = false;
      return;
    }

    // Player is unavailable during init()
    this.behavior ??= new BotBehavior(
      this.random,
      this.mg,
      this.player,
      this.triggerRatio,
      this.reserveRatio,
    );

    this.nukeHelper ??= new NukeExecutionHelper(
      this.random,
      this.mg,
      this.player,
    );

    this.unitCreationHelper ??= new UnitCreationHelper(
      this.random,
      this.mg,
      this.player,
      this.config,
    );

    if (this.firstMove) {
      this.firstMove = false;
      this.behavior.sendAttack(this.mg.terraNullius());
      return;
    }

    // Handle research priorities every 500 ticks
    if (ticks % 500 === this.diplomacyTick % 500) {
      this.handleResearch();
    }

    if (ticks % 100 === this.diplomacyTick % 100) {
      if (
        this.player.troops() > 100_000 &&
        this.player.targetTroopRatio() > 0.6
      ) {
        this.player.setTargetTroopRatio(0.6);
      }

      if (!this.hasSetInvestmentRate) {
        this.player.setInvestmentRate(0.1);
        this.hasSetInvestmentRate = true;
      }

      this.updateRelationsFromEmbargos();
      this.behavior.handleAllianceRequests();
      this.behavior.handleBombers();
      if (
        this.player.gold() > 1_000_000 &&
        !this.player.hasUpgrade(UpgradeType.Roads)
      ) {
        this.mg.addExecution(
          new PurchaseUpgradeExecution(this.player, UpgradeType.Roads),
        );
      }
      this.unitCreationHelper.handleUnits();
      this.handleEmbargoesToHostileNations();

      // Auto-peace: if at war but no aggression between sides for 30 seconds, request peace
      // NOTE: Only auto-initiated between AIs (FakeHuman/Bot). Do not initiate peace with human players.
      const turnMs = this.mg.config().serverConfig().turnIntervalMs();
      const thresholdTicks = Math.ceil(30_000 / Math.max(1, turnMs));
      const me = this.player;
      for (const other of this.mg.players()) {
        if (!other.isPlayer?.() || other === me) continue;
        if (!me.isAtWarWith(other)) continue;
        // Skip if the other side is a human; let them initiate peace explicitly.
        if (other.type() === PlayerType.Human) continue;
        const lastMe = me.lastAggressionTick(other);
        const lastOther = other.lastAggressionTick(me);
        const last = Math.max(lastMe, lastOther);
        if (last >= 0 && this.mg.ticks() - last > thresholdTicks) {
          // Immediate peace request (auto-accept via execution)
          this.mg.addExecution(new PeaceRequestExecution(me, other.id()));
        }
      }
    }

    if (ticks % this.attackRate === this.attackTick) {
      const attackedTN = this.handleTN();
      if (!attackedTN) {
        this.handleEnemies();
      }
    }
    if (ticks % 10 === this.attackTick % 10) {
      this.checkOverwhelm();
    }
  }

  handleEnemies() {
    if (
      this.player === null ||
      this.behavior === null ||
      this.nukeHelper === null
    ) {
      throw new Error("not initialized");
    }
    this.behavior.forgetOldEnemies();
    this.behavior.assistAllies();
    const enemy = this.behavior.selectEnemy();
    if (!enemy) return;
    this.maybeSendEmoji(enemy);
    this.nukeHelper.maybeSendNuke(enemy);
    if (this.player.sharesBorderWith(enemy)) {
      this.behavior.sendAttack(enemy);
    } else {
      this.maybeSendBoatAttack(enemy);
    }
  }

  private maybeSendEmoji(enemy: Player) {
    if (this.player === null) throw new Error("not initialized");
    if (enemy.type() !== PlayerType.Human) return;
    const lastSent = this.lastEmojiSent.get(enemy) ?? -300;
    if (this.mg.ticks() - lastSent <= 300) return;
    this.lastEmojiSent.set(enemy, this.mg.ticks());
    this.mg.addExecution(
      new EmojiExecution(
        this.player,
        enemy.id(),
        this.random.randElement(this.heckleEmoji),
      ),
    );
  }

  private maybeSendBoatAttack(other: Player) {
    if (this.player === null) throw new Error("not initialized");
    if (this.player.isOnSameTeam(other)) return;

    // Apply boat spawn cadence check
    if (
      this.mg.ticks() % this.config.boatSpawnCadence !==
      this.attackTick % this.config.boatSpawnCadence
    ) {
      return;
    }

    const closest = closestTwoTiles(
      this.mg,
      Array.from(this.player.borderTiles()).filter((t) =>
        this.mg.isOceanShore(t),
      ),
      Array.from(other.borderTiles()).filter((t) => this.mg.isOceanShore(t)),
    );
    if (closest === null) {
      return;
    }
    if (this.isTooCloseToExistingBoat(closest.y)) return;
    const troopsToSend = this.player.troops() / 5;
    this.mg.addExecution(
      new TransportShipExecution(
        this.player,
        other.id(),
        closest.y,
        troopsToSend,
        null,
      ),
    );
  }

  randomLand(): TileRef | null {
    const delta = 25;
    let tries = 0;
    while (tries < 50) {
      tries++;
      const cell = this.nation.spawnCell;
      const x = this.random.nextInt(cell.x - delta, cell.x + delta);
      const y = this.random.nextInt(cell.y - delta, cell.y + delta);
      if (!this.mg.isValidCoord(x, y)) {
        continue;
      }
      const tile = this.mg.ref(x, y);
      if (this.mg.isLand(tile) && !this.mg.hasOwner(tile)) {
        if (
          this.mg.terrainType(tile) === TerrainType.Mountain &&
          this.random.chance(2)
        ) {
          continue;
        }
        return tile;
      }
    }
    return null;
  }

  private randOceanShoreTile(tile: TileRef, dist: number): TileRef | null {
    if (this.player === null) throw new Error("not initialized");
    const x = this.mg.x(tile);
    const y = this.mg.y(tile);
    for (let i = 0; i < 500; i++) {
      const randX = this.random.nextInt(x - dist, x + dist);
      const randY = this.random.nextInt(y - dist, y + dist);
      if (!this.mg.isValidCoord(randX, randY)) {
        continue;
      }
      const randTile = this.mg.ref(randX, randY);
      if (!this.mg.isOceanShore(randTile)) {
        continue;
      }
      const owner = this.mg.owner(randTile);
      if (!owner.isPlayer()) {
        return randTile;
      }
      if (!owner.isFriendly(this.player)) {
        return randTile;
      }
    }
    return null;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return true;
  }

  private handleTN(): boolean {
    if (this.player === null || this.behavior === null)
      throw new Error("not initialized");

    const tn = this.mg.terraNullius();
    if (!tn) return false;

    /* ---------- 1. land-border check (unchanged) ---------- */
    const bordersTN = Array.from(this.player.borderTiles()).some((tile) =>
      this.mg
        .neighbors(tile)
        .some((n) => this.mg.isLand(n) && this.mg.ownerID(n) === tn.smallID()),
    );

    if (bordersTN) {
      this.behavior.sendAttack(tn);
      return true;
    }

    /* ---------- 2. boat attack: sample a few shore tiles only ---------- */

    // Use the same expanding radius as BotBehavior (defaults to 100)
    const radius = this.behavior.enemySearchRadius ?? 100;

    const shoreSample = this.random.sampleArray(
      Array.from(this.player.borderTiles()).filter((t) =>
        this.mg.isOceanShore(t),
      ),
      8, // check at most 8 shore tiles
    );

    for (const tile of shoreSample) {
      const dst = this.randOceanShoreTile(tile, radius);
      if (dst && this.mg.ownerID(dst) === tn.smallID()) {
        this.mg.addExecution(
          new TransportShipExecution(
            this.player,
            null, // Terra Nullius
            dst,
            this.player.troops() / 10,
            null,
          ),
        );
        return true;
      }
    }
    return false;
  }
  private isTooCloseToExistingBoat(dst: TileRef): boolean {
    for (const prev of this.boatDestinations) {
      const dx = this.mg.x(dst) - this.mg.x(prev);
      const dy = this.mg.y(dst) - this.mg.y(prev);
      if (dx * dx + dy * dy <= 100 * 100) return true;
    }
    return false;
  }

  private checkOverwhelm() {
    if (!this.player || !this.behavior) return;

    const currentEnemy = (this.behavior as any).enemy as Player | null;
    if (!currentEnemy) return;

    if (
      currentEnemy.type() === PlayerType.Bot &&
      this.player.attackingTroops() > currentEnemy.troops() * 2
    ) {
      this.behavior.clearEnemy();
      this.handleEnemies();
    }
  }

  /**
   * Handle research priorities based on archetype
   */
  private handleResearch() {
    if (!this.player) return;

    // Set research investment based on archetype
    const targetInvestment = this.config.researchInvestment;
    const currentInvestment = this.player.researchInvestmentRate();

    if (Math.abs(currentInvestment - targetInvestment) > 0.05) {
      this.mg.addExecution(
        new SetResearchInvestmentExecution(this.player, targetInvestment),
      );
    }

    // Select next priority tech to research
    if (!this.player.hasResearchedTech) return; // No tech system

    // Note: Player doesn't have researchedTechs() method, so we check each tech individually
    const completedTechs = new Set<string>();
    for (const techId of this.config.techPriorities) {
      if (this.player.hasResearchedTech(techId)) {
        completedTechs.add(techId);
      }
    }

    for (const techId of this.config.techPriorities) {
      // Skip if already researched
      if (completedTechs.has(techId)) continue;

      // NOTE: Current tech tree has no prerequisites, so any order is valid.
      // Future: Add isTechAvailable() helper if prerequisites are added.

      // Trigger research
      this.mg.addExecution(
        new ResearchTreeSelectExecution(this.player, techId),
      );
      return; // Only research one tech at a time
    }

    // If we reach here, all priority techs are researched.
    // Research investment continues, points accumulate for non-priority techs.
  }
}
