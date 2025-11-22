import { RESEARCH_TECH_IDS } from "../../tech/TechEffects";

/**
 * Bot archetype types - distinct AI personalities
 */
export enum ArchetypeType {
  Rusher = "Rusher",
  Turtle = "Turtle",
  Nuker = "Nuker",
  Naval = "Naval",
  Economist = "Economist",
}

/**
 * Configuration for a bot archetype
 */
export interface BotArchetypeConfig {
  // Combat behavior
  readonly attackCadence: number; // Ticks between attack checks
  readonly triggerRatio: number; // Troop ratio to trigger attack (0-1)
  readonly reserveRatio: number; // Troops to keep in reserve (0-1)

  // Naval behavior
  readonly boatSpawnCadence: number; // Ticks between boat spawn checks
  readonly boatCapMultiplier: number; // Multiplier on boat cap (0.5-2.0)

  // Nuclear behavior
  readonly nukeCadence: number; // Ticks between nuke checks
  readonly nukeCandidateCap: number; // Max nuke targets to evaluate
  readonly nukeAggressiveness: number; // Threshold for nuking (0-1)

  // Economic behavior
  readonly defenseInvestment: number; // % gold for defense (0-1)
  readonly offenseInvestment: number; // % gold for offense (0-1)
  readonly structureInvestment: number; // % gold for structures (0-1)

  // Research behavior (Tech Tree)
  readonly researchInvestment: number; // % gold for research (0-1)
  readonly techPriorities: readonly string[]; // Tech IDs in priority order
  // Structure behavior
  readonly cityDensity: number; // Tiles per City
  readonly portDensity: number; // Tiles per Port
  readonly defensePostDensity: number; // Border tiles per Defense Post

  readonly airfieldCap: number;
  readonly siloCap: number;
  readonly labCap: number;
  readonly factoryCap: number;
  readonly academyCap: number;
  readonly hospitalCap: number;

  readonly buildPriority: readonly string[]; // UnitType IDs in priority order

  // Upgrade behavior
  readonly upgradeInvestment: number; // % gold for upgrades (0-1)
  readonly upgradePriority: readonly string[]; // Structure types in priority order
  readonly upgradeThreshold: number; // Min gold before considering upgrades
  readonly maxUpgradeLevel: number; // Max level to upgrade structures to
}

/**
 * Archetype configurations - tuned for distinct playstyles
 */
export const ARCHETYPE_CONFIGS: Record<ArchetypeType, BotArchetypeConfig> = {
  [ArchetypeType.Rusher]: {
    // Aggressive early attacks, minimal defense
    attackCadence: 300, // Attack frequently
    triggerRatio: 0.5, // Attack with 50% troop advantage
    reserveRatio: 0.1, // Keep only 10% in reserve

    boatSpawnCadence: 400,
    boatCapMultiplier: 0.7, // Fewer boats

    nukeCadence: 500,
    nukeCandidateCap: 3, // Don't waste time on nukes
    nukeAggressiveness: 0.8, // Only nuke when very advantageous

    defenseInvestment: 0.2, // Minimal defense
    offenseInvestment: 0.6, // Heavy offense
    structureInvestment: 0.2, // Some economy

    researchInvestment: 0.1, // Low research
    techPriorities: [
      RESEARCH_TECH_IDS.WWII_LESSONS, // Combat boost
      RESEARCH_TECH_IDS.URBAN_PLANNING, // More troops
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Basic economy
    ],

    // Structure behavior - Rusher
    cityDensity: 8000, // Low density
    portDensity: 15000, // Low density
    defensePostDensity: 200, // Very low density

    airfieldCap: 2,
    siloCap: 0,
    labCap: 0,
    factoryCap: 3,
    academyCap: 2,
    hospitalCap: 0,

    buildPriority: ["Factory", "Air Field", "Academy", "Port", "City"],

    // Upgrade behavior - Rusher
    upgradeInvestment: 0.1, // 10% - minimal upgrades
    upgradePriority: ["City", "Academy"],
    upgradeThreshold: 500_000,
    maxUpgradeLevel: 2,
  },

  [ArchetypeType.Turtle]: {
    // Heavy defense, patient expansion
    attackCadence: 450, // Attack infrequently
    triggerRatio: 0.6, // Only attack with 60% advantage
    reserveRatio: 0.3, // Keep 30% in reserve

    boatSpawnCadence: 450,
    boatCapMultiplier: 1.0, // Standard boats

    nukeCadence: 400,
    nukeCandidateCap: 5,
    nukeAggressiveness: 0.6, // Moderate nuke usage

    defenseInvestment: 0.5, // Heavy defense
    offenseInvestment: 0.25, // Low offense
    structureInvestment: 0.25, // Moderate economy

    researchInvestment: 0.15, // Moderate research
    techPriorities: [
      RESEARCH_TECH_IDS.WWII_LESSONS, // Defense boost
      RESEARCH_TECH_IDS.CITY_ANTI_AIR, // City defense
      RESEARCH_TECH_IDS.WARSHIP_ANTI_AIR, // Naval defense
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Roads
      RESEARCH_TECH_IDS.STRUCTURE_INSURANCE, // Building protection
    ],

    // Structure behavior - Turtle
    cityDensity: 6000, // Standard
    portDensity: 12000, // Standard
    defensePostDensity: 60, // Very high density (Wall of Steel)

    airfieldCap: 1,
    siloCap: 1,
    labCap: 1,
    factoryCap: 0,
    academyCap: 0,
    hospitalCap: 3,

    buildPriority: ["Defense Post", "SAM Launcher", "Hospital", "City", "Port"],

    // Upgrade behavior - Turtle
    upgradeInvestment: 0.3, // 30% - heavy upgrades
    upgradePriority: ["SAM Launcher", "Hospital", "City"],
    upgradeThreshold: 200_000,
    maxUpgradeLevel: 5,
  },

  [ArchetypeType.Nuker]: {
    // Nuclear weapons focus, moderate aggression
    attackCadence: 400,
    triggerRatio: 0.55, // Moderate aggression
    reserveRatio: 0.25,

    boatSpawnCadence: 400,
    boatCapMultiplier: 1.2, // More boats for nuke delivery

    nukeCadence: 200, // Check nukes frequently (was 250)
    nukeCandidateCap: 10, // Evaluate many targets (was 8)
    nukeAggressiveness: 0.9, // Very Aggressive (was 0.3 which was conservative)

    defenseInvestment: 0.2, // Lower defense (rely on offense)
    offenseInvestment: 0.4,
    structureInvestment: 0.4, // Higher economy to afford silos

    researchInvestment: 0.2, // High research for nuke tech
    techPriorities: [
      RESEARCH_TECH_IDS.SUBMARINE_WARFARE, // Stealth nukes
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Nuclear subs
      RESEARCH_TECH_IDS.URBAN_PLANNING, // Population for nukes
      RESEARCH_TECH_IDS.AUTOMATION, // Economic power
    ],

    // Structure behavior - Nuker
    cityDensity: 7000, // Moderate
    portDensity: 12000, // Standard
    defensePostDensity: 150, // Low density

    airfieldCap: 1,
    siloCap: 6, // High cap (was 3) - "Many silos"
    labCap: 3, // High cap
    factoryCap: 0,
    academyCap: 0,
    hospitalCap: 0,

    buildPriority: [
      "Missile Silo",
      "Research Lab",
      "SAM Launcher",
      "City",
      "Port",
    ],

    // Upgrade behavior - Nuker
    upgradeInvestment: 0.25, // 25% - moderate upgrades
    upgradePriority: ["Missile Silo", "SAM Launcher", "City"],
    upgradeThreshold: 1_000_000, // High threshold to save for Silos (1M cost)
    maxUpgradeLevel: 3, // Respects silo/SAM max of 3
  },

  [ArchetypeType.Naval]: {
    // Maritime dominance, boat-heavy strategy
    attackCadence: 350,
    triggerRatio: 0.55,
    reserveRatio: 0.2,

    boatSpawnCadence: 250, // Spawn boats frequently
    boatCapMultiplier: 2.0, // Double boat cap

    nukeCadence: 400,
    nukeCandidateCap: 5,
    nukeAggressiveness: 0.5,

    defenseInvestment: 0.3,
    offenseInvestment: 0.45,
    structureInvestment: 0.25,

    researchInvestment: 0.18, // High research for naval tech
    techPriorities: [
      RESEARCH_TECH_IDS.SUBMARINE_WARFARE, // Submarines
      RESEARCH_TECH_IDS.WARSHIP_ANTI_AIR, // Naval defense
      RESEARCH_TECH_IDS.FIGHTER_JET_NAVAL_TARGETING, // Air-sea combo
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Nuke from sea
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Trade routes
    ],

    // Structure behavior - Naval
    cityDensity: 6000, // Standard
    portDensity: 4000, // Very high density
    defensePostDensity: 120, // Moderate

    airfieldCap: 2, // Naval air support
    siloCap: 1,
    labCap: 1,
    factoryCap: 0,
    academyCap: 0,
    hospitalCap: 0,

    buildPriority: ["Port", "Air Field", "City", "Defense Post"],

    // Upgrade behavior - Naval
    upgradeInvestment: 0.25, // 25% - high upgrades
    upgradePriority: ["Port", "SAM Launcher", "City"],
    upgradeThreshold: 250_000,
    maxUpgradeLevel: 4,
  },

  [ArchetypeType.Economist]: {
    // Economic powerhouse, late-game strength
    attackCadence: 400, // Attack rarely
    triggerRatio: 0.6, // Only attack with advantage
    reserveRatio: 0.3,

    boatSpawnCadence: 500,
    boatCapMultiplier: 0.8, // Fewer boats

    nukeCadence: 350,
    nukeCandidateCap: 6,
    nukeAggressiveness: 0.55,

    defenseInvestment: 0.35,
    offenseInvestment: 0.3,
    structureInvestment: 0.35, // Heavy economy

    researchInvestment: 0.25, // Very high research
    techPriorities: [
      RESEARCH_TECH_IDS.POST_WAR_RECONSTRUCTION, // Roads unlock
      RESEARCH_TECH_IDS.INTERNATIONAL_TRADE, // Allied roads
      RESEARCH_TECH_IDS.URBAN_PLANNING, // Population
      RESEARCH_TECH_IDS.AUTOMATION, // 2× trade income
      RESEARCH_TECH_IDS.STRUCTURE_INSURANCE, // Protect investments
      RESEARCH_TECH_IDS.NUCLEAR_SUBMARINES, // Late game power
    ],

    // Structure behavior - Economist
    cityDensity: 4000, // Very high density
    portDensity: 8000, // High density
    defensePostDensity: 100, // Moderate

    airfieldCap: 1,
    siloCap: 1,
    labCap: 4, // Very high cap
    factoryCap: 0,
    academyCap: 0,
    hospitalCap: 0,

    buildPriority: ["City", "Port", "Research Lab", "Defense Post"],

    // Upgrade behavior - Economist
    upgradeInvestment: 0.35, // 35% - HIGHEST upgrades
    upgradePriority: ["City", "Port", "Research Lab", "Factory"],
    upgradeThreshold: 150_000,
    maxUpgradeLevel: 10, // Highest max level
  },
};

/**
 * Select archetype deterministically based on game ID and nation ID
 */
export function selectArchetype(
  gameID: string,
  nationID: string,
): ArchetypeType {
  const seed = `${gameID}-${nationID}`;
  const hash = hashString(seed);
  const archetypes = Object.values(ArchetypeType);
  return archetypes[hash % archetypes.length];
}

/**
 * Simple string hash function for deterministic archetype selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Hash seed for archetype-specific random number generation
 */
export function hashArchetypeSeed(gameID: string, nationID: string): number {
  return hashString(`archetype-${gameID}-${nationID}`);
}
