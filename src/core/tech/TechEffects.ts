import { CityAAExecution } from "../execution/CityAAExecution";
import { Game, Player, UpgradeType } from "../game/Game";
import {
  getAllPolicyDirectives,
  getPolicyOption,
  type PolicyDirectiveId,
} from "./PolicyDirectives";
import { RESEARCH_TECH_IDS } from "./TechIds";
// Re-export for backward compatibility with existing imports
export { RESEARCH_TECH_IDS } from "./TechIds";

export interface TechMeta {
  name: string;
  shortDescription?: string;
  description?: string;
}

export interface DefenseCasualtyModifiers {
  // Multiplier to apply to the attacker's troop loss when the defender is a player
  attackerLossMul: number;
  // Multiplier to apply to the defender's troop loss when the defender is a player
  defenderLossMul: number;
}

export interface AttackSpeedModifiers {
  // Multiplier to apply to attack speed (tiles conquered per tick)
  speedMul: number;
}

export interface ConstructionSpeedModifiers {
  // Multiplier to apply to construction speed (higher = faster)
  speedMul: number;
}

export interface ResearchEffectivenessModifiers {
  // Multiplier to apply to research effectiveness (higher = faster research)
  effectivenessMul: number;
}

export interface IncomeModifiers {
  // Multiplier for domestic income (non-trade income from population/industry)
  domesticIncomeMul: number;
}

export interface InfrastructureEffectivenessModifiers {
  // Multiplier to apply to infrastructure spending effectiveness (higher = more roads per gold)
  effectivenessMul: number;
}

export interface TradeIncomeModifiers {
  // Multiplier to apply to trade income (from roads and trade ships)
  incomeMul: number;
  // Additional multiplier for trade ship income specifically (stacks with incomeMul)
  tradeShipIncomeMul: number;
}

export interface RoadEffectModifiers {
  // Multiplier to apply to road effects (higher = stronger road bonuses)
  effectMul: number;
}

// Central registry shape for tech effects: on-complete side-effects and battle modifiers
export type TechEffect = {
  // Runs once when the tech is completed
  onComplete?: (player: Player, game: Game) => void;
  // Applied each time casualty modifiers are computed while defending
  defense?: (mods: DefenseCasualtyModifiers) => void;
  // Applied each time casualty modifiers are computed while attacking
  attack?: (mods: DefenseCasualtyModifiers) => void;
  // Applied to modify offensive attack speed
  attackSpeed?: (mods: AttackSpeedModifiers) => void;
  // Applied to modify construction speed
  constructionSpeed?: (mods: ConstructionSpeedModifiers) => void;
  // Applied to modify research effectiveness
  researchEffectiveness?: (mods: ResearchEffectivenessModifiers) => void;
  // Applied to modify gross gold income
  income?: (mods: IncomeModifiers) => void;
  // Applied to modify infrastructure spending effectiveness
  infrastructureEffectiveness?: (
    mods: InfrastructureEffectivenessModifiers,
  ) => void;
  // Applied to modify trade income
  tradeIncome?: (mods: TradeIncomeModifiers) => void;
  // Applied to modify road effects (bonuses from roads)
  roadEffect?: (mods: RoadEffectModifiers) => void;
};

export type TechDefinition = {
  meta: TechMeta;
  effects?: TechEffect;
};

// Unified registry containing both metadata and effects per tech
export const TECHS: Readonly<Record<string, TechDefinition>> = Object.freeze({
  // Sea techs - Level 1: Missile Navy
  [RESEARCH_TECH_IDS.SEA_MISSILE_NAVY]: {
    meta: {
      name: "Missile Navy",
      shortDescription: "Warship L2, Sub L2",
      description:
        "Develop guided missile technology for naval warfare. Unlocks Warship Level 2, Submarine Level 2.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.WarshipLevel2)) {
          player.addUpgrade?.(UpgradeType.WarshipLevel2);
        }
        if (!player.hasUpgrade?.(UpgradeType.SubmarineLevel2)) {
          player.addUpgrade?.(UpgradeType.SubmarineLevel2);
        }
      },
    },
  },
  // Sea techs - Level 2: Advanced Fleet
  [RESEARCH_TECH_IDS.SEA_ADVANCED_FLEET]: {
    meta: {
      name: "Advanced Fleet",
      shortDescription: "Warship L3, Ship AA",
      description:
        "Advanced naval systems and fleet integration. Unlocks Warship Level 3, Ship Anti-Air Systems.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.WarshipLevel3)) {
          player.addUpgrade?.(UpgradeType.WarshipLevel3);
        }
        if (!player.hasUpgrade?.(UpgradeType.WarshipAntiAir)) {
          player.addUpgrade?.(UpgradeType.WarshipAntiAir);
        }
      },
    },
  },
  // Sea techs - Level 3: Nuclear Submarines
  [RESEARCH_TECH_IDS.SEA_NUCLEAR_SUBMARINES]: {
    meta: {
      name: "Nuclear Submarines",
      shortDescription: "Subs can launch nukes",
      description:
        "Ballistic missile submarine programs for strategic deterrence. Unlocks Submarines can launch nuclear weapons.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.NuclearSubmarineResearch)) {
          player.addUpgrade?.(UpgradeType.NuclearSubmarineResearch);
        }
      },
    },
  },
  // Sea techs - Level 4: TBD
  [RESEARCH_TECH_IDS.SEA_TBD_LEVEL4]: {
    meta: {
      name: "Sea Level 4 - TBD",
      shortDescription: "Placeholder sea tech",
      description: "Placeholder for future sea-based technology.",
    },
  },
  // Land techs - Level 1: Roads & Hospitals (moved from Economy)
  [RESEARCH_TECH_IDS.LAND_ROADS_HOSPITALS]: {
    meta: {
      name: "Roads & Hospitals",
      shortDescription: "Unlocks Roads, Hospitals",
      description:
        "Infrastructure and medical systems. Unlocks Roads, Hospitals.",
    },
    effects: {
      onComplete: (player, game) => {
        if (!player.hasUpgrade?.(UpgradeType.Roads)) {
          player.addUpgrade?.(UpgradeType.Roads);
          game.markPlayerNodesForReconnection?.(player);
        }
        if (!player.hasUpgrade?.(UpgradeType.HospitalResearch)) {
          player.addUpgrade?.(UpgradeType.HospitalResearch);
        }
      },
    },
  },
  // Land techs - Level 2: Military Academy
  [RESEARCH_TECH_IDS.LAND_MILITARY_ACADEMY]: {
    meta: {
      name: "Military Academy",
      shortDescription: "Academy building, City AA",
      description:
        "Establish military training infrastructure. Unlocks Military Academy building, City Anti-Air systems.",
    },
    effects: {
      onComplete: (player, game) => {
        if (!player.hasUpgrade?.(UpgradeType.MilitaryAcademy)) {
          player.addUpgrade?.(UpgradeType.MilitaryAcademy);
        }
        if (!player.hasUpgrade?.(UpgradeType.CityAntiAir)) {
          player.addUpgrade?.(UpgradeType.CityAntiAir);
          // Start the city AA execution to fire bullets at planes
          game.addExecution(new CityAAExecution(player));
        }
      },
    },
  },
  // Land techs - Level 3: SAM Systems
  [RESEARCH_TECH_IDS.LAND_SAM_SYSTEMS]: {
    meta: {
      name: "SAM Systems",
      shortDescription: "AA Guns, SAM L2",
      description:
        "Surface-to-air missile system deployment. Unlocks AA Guns, SAM Level 2.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.SAMLevel2)) {
          player.addUpgrade?.(UpgradeType.SAMLevel2);
        }
      },
    },
  },
  // Land techs - Level 4: Doomsday Device
  [RESEARCH_TECH_IDS.LAND_DOOMSDAY_DEVICE]: {
    meta: {
      name: "Doomsday Device",
      shortDescription: "SAM L3, Doomsday",
      description:
        "Ultimate defensive deterrent system. Unlocks SAM Level 3, Doomsday Device.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.SAMLevel3)) {
          player.addUpgrade?.(UpgradeType.SAMLevel3);
        }
        if (!player.hasUpgrade?.(UpgradeType.DoomsdayDeviceResearch)) {
          player.addUpgrade?.(UpgradeType.DoomsdayDeviceResearch);
        }
      },
    },
  },
  // Air techs - Level 1: Paratroopers
  [RESEARCH_TECH_IDS.AIR_PARATROOPERS]: {
    meta: {
      name: "Paratroopers",
      shortDescription: "Paratroopers, Fighter L2",
      description:
        "Airborne infantry and assault doctrine. Unlocks Paratroopers, Fighter Level 2.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.AirUpgrade1)) {
          player.addUpgrade?.(UpgradeType.AirUpgrade1);
        }
        if (!player.hasUpgrade?.(UpgradeType.FighterLevel2)) {
          player.addUpgrade?.(UpgradeType.FighterLevel2);
        }
      },
    },
  },
  // Air techs - Level 2: Advanced Jets
  [RESEARCH_TECH_IDS.AIR_ADVANCED_JETS]: {
    meta: {
      name: "Advanced Jets",
      shortDescription: "Fighter L3, Bomber L2",
      description:
        "Next-generation aircraft systems. Unlocks Fighter Level 3, Bomber Level 2.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.FighterLevel3)) {
          player.addUpgrade?.(UpgradeType.FighterLevel3);
        }
        if (!player.hasUpgrade?.(UpgradeType.BomberLevel2)) {
          player.addUpgrade?.(UpgradeType.BomberLevel2);
        }
      },
    },
  },
  // Air techs - Level 3: Naval Strike
  [RESEARCH_TECH_IDS.AIR_NAVAL_STRIKE]: {
    meta: {
      name: "Naval Strike",
      shortDescription: "Fighter L4, Bomber L3, Anti-ship",
      description:
        "Advanced naval attack capability for aircraft. Unlocks Fighter Level 4, Bomber Level 3, Naval strike weapons.",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.FighterLevel4)) {
          player.addUpgrade?.(UpgradeType.FighterLevel4);
        }
        if (!player.hasUpgrade?.(UpgradeType.BomberLevel3)) {
          player.addUpgrade?.(UpgradeType.BomberLevel3);
        }
        if (!player.hasUpgrade?.(UpgradeType.FighterJetNavalTargeting)) {
          player.addUpgrade?.(UpgradeType.FighterJetNavalTargeting);
        }
      },
    },
  },
  // Air techs - Level 4: TBD
  [RESEARCH_TECH_IDS.AIR_TBD_LEVEL4]: {
    meta: {
      name: "Air Level 4 - TBD",
      shortDescription: "Placeholder air tech",
      description: "Placeholder for future air-based technology.",
    },
  },
  // Nuclear techs - Level 1: Nuclear Fission
  [RESEARCH_TECH_IDS.NUCLEAR_FISSION]: {
    meta: {
      name: "Nuclear Fission",
      shortDescription: "Enables Atom Bomb, Silo",
      description: "Enables: Atom Bomb, Silo",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.NuclearFission)) {
          player.addUpgrade?.(UpgradeType.NuclearFission);
        }
        // Note: MissileSilo building is unlocked via gameplay progression
      },
    },
  },
  // Nuclear techs - Level 2: Thermonuclear Staging
  [RESEARCH_TECH_IDS.THERMONUCLEAR_STAGING]: {
    meta: {
      name: "Thermonuclear Staging",
      shortDescription: "Enables Hydrogen Bomb",
      description: "Enables: Hydrogen Bomb",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.ThermonuclearStaging)) {
          player.addUpgrade?.(UpgradeType.ThermonuclearStaging);
        }
      },
    },
  },
  // Nuclear techs - Level 3: MIRV Technology
  [RESEARCH_TECH_IDS.MIRV_TECHNOLOGY]: {
    meta: {
      name: "MIRV Technology",
      shortDescription: "Enables MIRV",
      description: "Enables: MIRV",
    },
    effects: {
      onComplete: (player) => {
        if (!player.hasUpgrade?.(UpgradeType.MIRVTechnology)) {
          player.addUpgrade?.(UpgradeType.MIRVTechnology);
        }
      },
    },
  },
  // Nuclear techs - Level 4: TBD
  [RESEARCH_TECH_IDS.NUCLEAR_TBD_LEVEL4]: {
    meta: {
      name: "Nuclear Level 4 - TBD",
      shortDescription: "Placeholder nuclear tech",
      description: "Placeholder for future nuclear technology.",
    },
  },
});
// Back-compat export for existing UI code: derive TECH_METADATA from TECHS
export const TECH_METADATA: Readonly<Record<string, TechMeta>> = Object.freeze(
  Object.fromEntries(Object.entries(TECHS).map(([id, def]) => [id, def.meta])),
);

// Helper accessors around TECHS for safe, typed consumption across the codebase
export type MissingBehavior = "throw" | "warn" | "silent";
export interface GetTechOptions {
  strict?: boolean; // when true, on missing -> throw
  onMissing?: MissingBehavior; // default: "warn" when strict=false
}

export function getTech(
  techId: string,
  opts: GetTechOptions = {},
): TechDefinition {
  const def = TECHS[techId];
  if (def) return def;
  const strict = opts.strict ?? false;
  const onMissing: MissingBehavior =
    opts.onMissing ?? (strict ? "throw" : "warn");
  const message = `[TechEffects] Unknown tech id: ${techId}`;
  if (strict || onMissing === "throw") {
    throw new Error(message);
  }
  // Return a stub definition to keep callers robust in non-strict mode
  return { meta: { name: techId } } satisfies TechDefinition;
}

export function getTechMeta(techId: string, opts?: GetTechOptions): TechMeta {
  return getTech(techId, opts).meta;
}

export function getTechEffects(
  techId: string,
  opts?: GetTechOptions,
): TechEffect | undefined {
  return getTech(techId, opts).effects;
}

export function listTechs(): Array<{ id: string; meta: TechMeta }> {
  return Object.entries(TECHS).map(([id, def]) => ({ id, meta: def.meta }));
}

export function forEachTech(
  fn: (id: string, def: TechDefinition) => void,
): void {
  for (const [id, def] of Object.entries(TECHS)) fn(id, def);
}

export function applyTechCompletionEffects(
  player: Player,
  game: Game,
  techId: string,
): void {
  const entry = TECHS[techId]?.effects;
  entry?.onComplete?.(player, game);
}

/**
 * Compute casualty multipliers when a player is defending, based on researched techs and policy directives.
 * - attackerLossMul > 1 increases enemy losses
 * - defenderLossMul < 1 reduces own losses
 */
export function defenseCasualtyModifiers(defender: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): DefenseCasualtyModifiers {
  const mods: DefenseCasualtyModifiers = {
    attackerLossMul: 1.0,
    defenderLossMul: 1.0,
  };
  for (const [techId, def] of Object.entries(TECHS)) {
    if (defender.hasResearchedTech?.(techId)) {
      def.effects?.defense?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = defender.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.defenderLossMul) {
        mods.defenderLossMul *= option.effects.defenderLossMul;
      }
      if (option?.effects.attackerLossMulOnDefense) {
        mods.attackerLossMul *= option.effects.attackerLossMulOnDefense;
      }
    }
  }
  return mods;
}

/**
 * Compute casualty multipliers when a player is attacking, based on researched techs and policy directives.
 * Returned multipliers stack multiplicatively with defender-side modifiers.
 * - attackerLossMul < 1 reduces own losses
 * - defenderLossMul > 1 increases enemy losses
 */
export function attackCasualtyModifiers(attacker: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): DefenseCasualtyModifiers {
  const mods: DefenseCasualtyModifiers = {
    attackerLossMul: 1.0,
    defenderLossMul: 1.0,
  };
  for (const [techId, def] of Object.entries(TECHS)) {
    if (attacker.hasResearchedTech?.(techId)) {
      def.effects?.attack?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = attacker.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.attackerLossMul) {
        mods.attackerLossMul *= option.effects.attackerLossMul;
      }
      if (option?.effects.enemyLossMulOnAttack) {
        mods.defenderLossMul *= option.effects.enemyLossMulOnAttack;
      }
    }
  }
  return mods;
}

/**
 * Compute attack speed multiplier based on researched techs and policy directives.
 * speedMul > 1 increases tiles conquered per tick (faster attacks).
 */
export function attackSpeedModifiers(attacker: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): AttackSpeedModifiers {
  const mods: AttackSpeedModifiers = {
    speedMul: 1.0,
  };
  for (const [techId, def] of Object.entries(TECHS)) {
    if (attacker.hasResearchedTech?.(techId)) {
      def.effects?.attackSpeed?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = attacker.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.attackSpeedMul) {
        mods.speedMul *= option.effects.attackSpeedMul;
      }
    }
  }
  return mods;
}

/**
 * Compute construction speed multiplier based on researched techs and policy directives.
 * speedMul > 1 means construction completes faster (fewer ticks).
 */
export function constructionSpeedModifiers(player: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): ConstructionSpeedModifiers {
  const mods: ConstructionSpeedModifiers = {
    speedMul: 1.0,
  };
  // Apply tech effects
  for (const [techId, def] of Object.entries(TECHS)) {
    if (player.hasResearchedTech?.(techId)) {
      def.effects?.constructionSpeed?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = player.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.constructionSpeedMul) {
        mods.speedMul *= option.effects.constructionSpeedMul;
      }
    }
  }
  return mods;
}

/**
 * Compute research effectiveness multiplier based on researched techs.
 * effectivenessMul > 1 means research progresses faster.
 */
export function researchEffectivenessModifiers(
  player: Player,
): ResearchEffectivenessModifiers {
  const mods: ResearchEffectivenessModifiers = {
    effectivenessMul: 1.0,
  };
  for (const [techId, def] of Object.entries(TECHS)) {
    if (player.hasResearchedTech?.(techId)) {
      def.effects?.researchEffectiveness?.(mods);
    }
  }
  return mods;
}

/**
 * Compute income multiplier based on researched techs and policy directives.
 * incomeMul > 1 means higher gross gold income.
 * domesticIncomeMul > 1 means higher domestic (non-trade) income.
 */
export function incomeModifiers(player: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): IncomeModifiers {
  const mods: IncomeModifiers = {
    domesticIncomeMul: 1.0,
  };
  // Apply tech effects
  for (const [techId, def] of Object.entries(TECHS)) {
    if (player.hasResearchedTech?.(techId)) {
      def.effects?.income?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = player.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.domesticIncomeMul) {
        mods.domesticIncomeMul *= option.effects.domesticIncomeMul;
      }
    }
  }
  return mods;
}

/**
 * Compute infrastructure spending effectiveness multiplier based on researched techs and policy directives.
 * effectivenessMul > 1 means more roads per gold spent.
 */
export function infrastructureEffectivenessModifiers(player: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): InfrastructureEffectivenessModifiers {
  const mods: InfrastructureEffectivenessModifiers = {
    effectivenessMul: 1.0,
  };
  for (const [techId, def] of Object.entries(TECHS)) {
    if (player.hasResearchedTech?.(techId)) {
      def.effects?.infrastructureEffectiveness?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = player.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.infrastructureSpendingEffectivenessMul) {
        mods.effectivenessMul *=
          option.effects.infrastructureSpendingEffectivenessMul;
      }
    }
  }
  return mods;
}

/**
 * Compute trade income multiplier based on researched techs and policy directives.
 * incomeMul > 1 means higher trade income.
 * tradeShipIncomeMul > 1 means higher income for trade ship owners.
 */
export function tradeIncomeModifiers(player: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): TradeIncomeModifiers {
  const mods: TradeIncomeModifiers = {
    incomeMul: 1.0,
    tradeShipIncomeMul: 1.0,
  };
  for (const [techId, def] of Object.entries(TECHS)) {
    if (player.hasResearchedTech?.(techId)) {
      def.effects?.tradeIncome?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = player.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.tradeIncomeMul) {
        mods.incomeMul *= option.effects.tradeIncomeMul;
      }
      if (option?.effects.tradeShipIncomeMul) {
        mods.tradeShipIncomeMul *= option.effects.tradeShipIncomeMul;
      }
    }
  }
  return mods;
}

/**
 * Compute road effect multiplier based on researched techs and policy directives.
 * effectMul > 1 means roads provide stronger bonuses.
 */
export function roadEffectModifiers(player: {
  hasResearchedTech?(techId: string): boolean;
  getPolicyChoice?(directiveId: string): string | null;
}): RoadEffectModifiers {
  const mods: RoadEffectModifiers = {
    effectMul: 1.0,
  };
  // Apply tech effects
  for (const [techId, def] of Object.entries(TECHS)) {
    if (player.hasResearchedTech?.(techId)) {
      def.effects?.roadEffect?.(mods);
    }
  }
  // Apply policy directive effects
  for (const directive of getAllPolicyDirectives()) {
    const chosenOptionId = player.getPolicyChoice?.(directive.id);
    if (chosenOptionId) {
      const option = getPolicyOption(
        directive.id as PolicyDirectiveId,
        chosenOptionId,
      );
      if (option?.effects.roadEffectMul) {
        mods.effectMul *= option.effects.roadEffectMul;
      }
    }
  }
  return mods;
}
