import {
  BOMBER_UPGRADES,
  FIGHTER_UPGRADES,
  SUBMARINE_UPGRADES,
  WARSHIP_UPGRADES,
} from "../core/game/UnitUpgrades";
import { RESEARCH_TECH_IDS } from "../core/tech/TechIds";

export function getDetailedTechTooltip(techId: string): string {
  switch (techId) {
    // --- SEA ---
    case RESEARCH_TECH_IDS.SEA_MISSILE_NAVY: {
      const w2 = WARSHIP_UPGRADES[1];
      const s2 = SUBMARINE_UPGRADES[1];
      return `Unlocks:\n• Warship L2 (HP: ${w2.maxHealth}, Dmg: ${w2.damageMin}-${w2.damageMax})\n• Submarine L2 (HP: ${s2.maxHealth}, Dmg: ${s2.damageMin}-${s2.damageMax})`;
    }
    case RESEARCH_TECH_IDS.SEA_ADVANCED_FLEET: {
      const w3 = WARSHIP_UPGRADES[2];
      return `Unlocks:\n• Warship L3 (HP: ${w3.maxHealth}, Dmg: ${w3.damageMin}-${w3.damageMax})\n• Ship Anti-Air: Defends fleet against air attacks.`;
    }
    case RESEARCH_TECH_IDS.SEA_NUCLEAR_SUBMARINES:
      return `Unlocks:\n• Nuclear Submarines: Submarines can launch nuclear missiles while submerged.`;

    // --- LAND ---
    case RESEARCH_TECH_IDS.LAND_ROADS_HOSPITALS:
      return `Unlocks:\n• Roads: Increases movement speed and generates trade income.\n• Hospitals: Increases population growth rate.`;
    case RESEARCH_TECH_IDS.LAND_MILITARY_ACADEMY:
      return `Unlocks:\n• Military Academy: Allows training of advanced units.\n• City Anti-Air: Defends city against air attacks.`;
    case RESEARCH_TECH_IDS.LAND_SAM_SYSTEMS:
      return `Unlocks:\n• SAM Systems: Long-range surface-to-air missile defense.\n• SAM L2: Increased range and accuracy.`;
    case RESEARCH_TECH_IDS.LAND_DOOMSDAY_DEVICE:
      return `Unlocks:\n• Doomsday Device: Automatically launches all nukes if you are defeated.\n• SAM L3: Maximum range and accuracy.`;

    // --- AIR ---
    case RESEARCH_TECH_IDS.AIR_PARATROOPERS: {
      const f2 = FIGHTER_UPGRADES[1];
      return `Unlocks:\n• Paratroopers: Can drop infantry behind enemy lines.\n• Fighter L2 (HP: ${f2.maxHealth}, Dmg: ${f2.damageMin}-${f2.damageMax})`;
    }
    case RESEARCH_TECH_IDS.AIR_ADVANCED_JETS: {
      const f3 = FIGHTER_UPGRADES[2];
      const b2 = BOMBER_UPGRADES[1];
      return `Unlocks:\n• Fighter L3 (HP: ${f3.maxHealth}, Dmg: ${f3.damageMin}-${f3.damageMax})\n• Bomber L2 (HP: ${b2.maxHealth}, Dmg: ${b2.damageMin}-${b2.damageMax}, Range: ${b2.targetRange})`;
    }
    case RESEARCH_TECH_IDS.AIR_NAVAL_STRIKE: {
      const f4 = FIGHTER_UPGRADES[3];
      const b3 = BOMBER_UPGRADES[2];
      return `Unlocks:\n• Fighter L4 (HP: ${f4.maxHealth}, Dmg: ${f4.damageMin}-${f4.damageMax})\n• Bomber L3 (HP: ${b3.maxHealth}, Dmg: ${b3.damageMin}-${b3.damageMax}, Range: ${b3.targetRange})\n• Naval Strike: Fighters can attack naval units.`;
    }

    // --- NUCLEAR ---
    case RESEARCH_TECH_IDS.NUCLEAR_FISSION:
      return `Unlocks:\n• Atom Bomb: Basic nuclear weapon.\n• Missile Silo: Launch facility for nuclear weapons.`;
    case RESEARCH_TECH_IDS.THERMONUCLEAR_STAGING:
      return `Unlocks:\n• Hydrogen Bomb: High-yield nuclear weapon. Larger blast radius.`;
    case RESEARCH_TECH_IDS.MIRV_TECHNOLOGY:
      return `Unlocks:\n• MIRV: Multiple Independent Reentry Vehicles. Harder to intercept.`;

    default:
      return "No detailed information available.";
  }
}
