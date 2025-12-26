import {
  Difficulty,
  Execution,
  Game,
  Nation,
  Player,
  PlayerID,
  PlayerType,
  Relation,
  TerrainType,
  Tick,
  UnitType,
  UpgradeType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { GameID } from "../Schemas";
import { RESEARCH_TECH_IDS } from "../tech/TechEffects";
import { flattenedEmojiTable, simpleHash } from "../Util";
import { EmojiExecution } from "./EmojiExecution";
import { NukeExecutionHelper } from "./NukeExecutionHelper";
import { PeaceRequestExecution } from "./PeaceRequestExecution";
import { SetResearchInvestmentExecution } from "./SetResearchInvestmentExecution";
import { SetRoadInvestmentExecution } from "./SetRoadInvestmentExecution";
import { SpawnExecution } from "./SpawnExecution";
import { TransportShipExecution } from "./TransportShipExecution";
import { UnitCreationHelper } from "./UnitCreationHelper";
import { closestTwoTiles } from "./Util";
import { BotBehavior } from "./utils/BotBehavior";

export enum BotPersonality {
  Balanced = 0,
  LandWarfare = 1,
  AirSupremacy = 2,
  NavalPower = 3,
  Nuclear = 4,
}

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

  // Personality and investment settings
  private personality: BotPersonality = BotPersonality.Balanced;
  private researchInvestment: number = 0.2;
  private roadInvestment: number = 0.2;
  private researchPriority: string | null = null;
  private initialTilesOwned: number | null = null;
  private difficulty: Difficulty = Difficulty.Medium;

  constructor(
    gameID: GameID,
    private nation: Nation,
  ) {
    this.random = new PseudoRandom(
      simpleHash(nation.playerInfo.id) + simpleHash(gameID),
    );

    // Apply difficulty-based settings
    this.applyDifficultySettings();

    // Apply personality (affects difficulty settings)
    this.applyPersonality();

    // Apply randomization for variety (±10% variance)
    this.applyRandomVariance();

    // Initialize other fields
    this.attackTick = this.random.nextInt(0, this.attackRate);
    this.diplomacyTick = this.random.nextInt(0, 10);
    this.heckleEmoji = ["🤡", "😡"].map((e) => flattenedEmojiTable.indexOf(e));
  }

  private applyDifficultySettings(): void {
    const difficulty = this.difficulty;

    // Difficulty-based combat parameters
    switch (difficulty) {
      case Difficulty.Easy:
        this.attackRate = 50;
        this.triggerRatio = 0.8;
        this.reserveRatio = 0.6;
        break;
      case Difficulty.Medium:
        this.attackRate = 40;
        this.triggerRatio = 0.7;
        this.reserveRatio = 0.5;
        break;
      case Difficulty.Hard:
        this.attackRate = 30;
        this.triggerRatio = 0.6;
        this.reserveRatio = 0.4;
        break;
      case Difficulty.Impossible:
        this.attackRate = 25;
        this.triggerRatio = 0.5;
        this.reserveRatio = 0.3;
        break;
    }
  }

  private applyPersonality(): void {
    // 30% balanced, 17.5% each specialized type
    const roll = this.random.nextFloat(0, 1);
    if (roll < 0.3) this.personality = BotPersonality.Balanced;
    else if (roll < 0.475) this.personality = BotPersonality.LandWarfare;
    else if (roll < 0.65) this.personality = BotPersonality.AirSupremacy;
    else if (roll < 0.825) this.personality = BotPersonality.NavalPower;
    else this.personality = BotPersonality.Nuclear;

    // Personality modifiers
    switch (this.personality) {
      case BotPersonality.LandWarfare:
        this.attackRate = Math.max(20, this.attackRate - 10);
        this.triggerRatio *= 0.85;
        this.reserveRatio *= 0.75;
        this.researchPriority = "land";
        break;
      case BotPersonality.AirSupremacy:
        this.attackRate = Math.max(25, this.attackRate - 5);
        this.researchPriority = "air";
        this.researchInvestment = Math.min(0.3, this.researchInvestment * 1.3);
        break;
      case BotPersonality.NavalPower:
        this.researchPriority = "sea";
        this.researchInvestment = Math.min(0.28, this.researchInvestment * 1.2);
        break;
      case BotPersonality.Nuclear:
        this.attackRate += 5;
        this.triggerRatio *= 1.1;
        this.researchPriority = "nuclear";
        this.researchInvestment = Math.min(0.35, this.researchInvestment * 1.5);
        break;
      case BotPersonality.Balanced:
        // No changes - baseline behavior, no research priority
        this.researchPriority = null;
        break;
    }
  }

  private applyRandomVariance(): void {
    const variance = () => 0.9 + this.random.nextFloat(0, 1) * 0.2; // 0.9 to 1.1

    this.triggerRatio *= variance();
    this.reserveRatio *= variance();
    this.researchInvestment *= variance();
    this.roadInvestment *= variance();

    // Clamp to reasonable bounds
    this.triggerRatio = Math.max(0.4, Math.min(0.9, this.triggerRatio));
    this.reserveRatio = Math.max(0.2, Math.min(0.7, this.reserveRatio));
    this.researchInvestment = Math.max(
      0.15,
      Math.min(0.35, this.researchInvestment),
    );
    this.roadInvestment = Math.max(0.15, Math.min(0.3, this.roadInvestment));
  }

  init(mg: Game) {
    this.mg = mg;
    this.difficulty = mg.config().gameConfig().difficulty;
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
      if (ticks % this.attackRate === this.attackTick) {
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

      // Track initial territory size for dynamic troop ratio
      this.initialTilesOwned = this.player.numTilesOwned();

      // Expose personality for dev mode debugging
      (this.player as any).botPersonality = () => this.personality;

      this.player.addUpgrade(UpgradeType.InternationalTrade);

      // Set research/road investment based on personality and randomization
      this.mg.addExecution(
        new SetResearchInvestmentExecution(
          this.player,
          this.researchInvestment,
        ),
      );
      this.mg.addExecution(
        new SetRoadInvestmentExecution(this.player, this.roadInvestment),
      );

      // Set research priority if personality has one
      if (this.researchPriority !== null) {
        (this.player as any).setResearchPriority?.(this.researchPriority);
      }
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
      this.personality,
    );

    this.nukeHelper ??= new NukeExecutionHelper(
      this.random,
      this.mg,
      this.player,
      this.personality,
      this.difficulty,
    );

    this.unitCreationHelper ??= new UnitCreationHelper(
      this.random,
      this.mg,
      this.player,
      this.personality,
    );

    if (this.firstMove) {
      this.firstMove = false;
      this.behavior.sendAttack(this.mg.terraNullius());
      return;
    }

    if (ticks % 100 === this.diplomacyTick) {
      // Dynamic troop ratio based on threat level and game state
      const incomingTroops = this.player
        .incomingAttacks()
        .reduce((sum, attack) => sum + attack.troops(), 0);
      const ourTroops = this.player.troops();

      let targetRatio = 0.6; // Default

      // Under significant attack: go defensive
      if (incomingTroops > ourTroops * 0.15) {
        targetRatio = 0.85;
      }
      // Winning/safe: invest in economy
      else if (
        this.initialTilesOwned &&
        this.player.numTilesOwned() > this.initialTilesOwned * 1.5
      ) {
        targetRatio = 0.45;
      }

      // Personality modifier
      if (this.personality === BotPersonality.LandWarfare) {
        targetRatio = Math.min(0.9, targetRatio + 0.1);
      }

      // Apply if different
      if (Math.abs(this.player.targetTroopRatio() - targetRatio) > 0.05) {
        this.player.setTargetTroopRatio(targetRatio);
      }

      if (!this.hasSetInvestmentRate) {
        this.player.setInvestmentRate(0.1);
        this.hasSetInvestmentRate = true;
      }

      this.updateRelationsFromEmbargos();
      this.behavior.handleAllianceRequests();
      this.behavior.handleBombers();

      // Track incoming nukes for retaliation
      if (this.nukeHelper) {
        for (const other of this.mg.players()) {
          if (!other.isPlayer() || other === this.player) continue;
          // Check for nukes heading toward our territory
          const incomingNukes = other
            .units(
              UnitType.AtomBomb,
              UnitType.HydrogenBomb,
              UnitType.MIRV,
              UnitType.MIRVWarhead,
            )
            .filter((nuke) => {
              const targetTile = (nuke as any).target?.(); // NukeExecution has target() method
              return targetTile && targetTile.owner() === this.player;
            });
          if (incomingNukes.length > 0) {
            this.nukeHelper.markNukedBy(other.id());
          }
        }
      }

      // Grant Roads via research tech if AI has enough gold and doesn't have it
      if (
        this.player.gold() > 1_000_000 &&
        !this.player.hasUpgrade(UpgradeType.Roads)
      ) {
        this.player.addResearchedTech(
          RESEARCH_TECH_IDS.NATIONAL_RECONSTRUCTION_PROGRAM,
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

    // Context-aware emoji selection
    let emoji: string;
    const ourTroops = this.player.troops();
    const theirTroops = enemy.troops();

    // Winning hard
    if (ourTroops > theirTroops * 2) {
      emoji = this.random.randElement(["💪", "🔥", "😎"]);
    }
    // Losing
    else if (ourTroops < theirTroops * 0.5) {
      emoji = this.random.randElement(["😰", "🏳️", "😱"]);
    }
    // Personality-based
    else if (this.personality === BotPersonality.LandWarfare) {
      emoji = this.random.randElement(["😡", "⚔️", "💀"]);
    } else if (this.personality === BotPersonality.AirSupremacy) {
      emoji = this.random.randElement(["✈️", "💣", "🚁"]);
    } else if (this.personality === BotPersonality.NavalPower) {
      emoji = this.random.randElement(["🚢", "⚓", "🌊"]);
    } else if (this.personality === BotPersonality.Nuclear) {
      emoji = this.random.randElement(["☢️", "💀", "☠️"]);
    } else {
      emoji = this.random.randElement(["🤡", "😡"]); // Existing
    }

    this.mg.addExecution(
      new EmojiExecution(
        this.player,
        enemy.id(),
        flattenedEmojiTable.indexOf(emoji),
      ),
    );
  }

  private maybeSendBoatAttack(other: Player) {
    if (this.player === null) throw new Error("not initialized");
    if (this.player.isOnSameTeam(other)) return;
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
}
