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
      const s1 = SUBMARINE_UPGRADES[0];
      return `Unlocks:\n• Cruisers (HP: ${w2.maxHealth}, Dmg: ${w2.damageMin}-${w2.damageMax})\n• Diesel-Electric Subs (HP: ${s1.maxHealth}, Dmg: ${s1.damageMin}-${s1.damageMax})`;
    }
    case RESEARCH_TECH_IDS.SEA_ADVANCED_FLEET: {
      const w3 = WARSHIP_UPGRADES[2];
      const s2 = SUBMARINE_UPGRADES[1];
      return `Unlocks:\n• Aegis Warships (HP: ${w3.maxHealth}, Dmg: ${w3.damageMin}-${w3.damageMax})\n• Tactical Subs (HP: ${s2.maxHealth}, Dmg: ${s2.damageMin}-${s2.damageMax})`;
    }
    case RESEARCH_TECH_IDS.SEA_NUCLEAR_SUBMARINES: {
      const s3 = SUBMARINE_UPGRADES[2];
      return `Unlocks:\n• Attack Subs (HP: ${s3.maxHealth}, Dmg: ${s3.damageMin}-${s3.damageMax})\n• Ship Anti-Air: Defends fleet against air attacks.`;
    }
    case RESEARCH_TECH_IDS.SEA_TBD_LEVEL4:
      return `Unlocks:\n• Nuclear Subs: Ballistic missile submarines can launch nuclear weapons while submerged.`;

    // --- LAND ---
    case RESEARCH_TECH_IDS.LAND_ROADS_HOSPITALS:
      return `Unlocks:\n• Roads: Increases movement speed and generates trade income.\n• Trade Routes: International trade routes boost economy.`;
    case RESEARCH_TECH_IDS.LAND_MILITARY_ACADEMY:
      return `Unlocks:\n• City Anti-Air: Defends city against air attacks.\n• Improved SAM: Increased range and accuracy.`;
    case RESEARCH_TECH_IDS.LAND_SAM_SYSTEMS:
      return `Unlocks:\n• Advanced SAM: Maximum range and accuracy.\n• Hospitals: Increases population growth rate.`;
    case RESEARCH_TECH_IDS.LAND_DOOMSDAY_DEVICE:
      return `Unlocks:\n• Military Academy: Allows training of advanced units.`;

    // --- AIR ---
    case RESEARCH_TECH_IDS.AIR_PARATROOPERS: {
      const f1 = FIGHTER_UPGRADES[0];
      return `Unlocks:\n• Gen 1 Fighters (HP: ${f1.maxHealth}, Dmg: ${f1.damageMin}-${f1.damageMax})\n• Paratroopers: Can drop infantry behind enemy lines.`;
    }
    case RESEARCH_TECH_IDS.AIR_ADVANCED_JETS: {
      const f2 = FIGHTER_UPGRADES[1];
      const b2 = BOMBER_UPGRADES[1];
      return `Unlocks:\n• Gen 2 Fighters (HP: ${f2.maxHealth}, Dmg: ${f2.damageMin}-${f2.damageMax})\n• Heavy Bombers (HP: ${b2.maxHealth}, Dmg: ${b2.damageMin}-${b2.damageMax}, Range: ${b2.targetRange})`;
    }
    case RESEARCH_TECH_IDS.AIR_NAVAL_STRIKE: {
      const f3 = FIGHTER_UPGRADES[2];
      return `Unlocks:\n• Gen 3 Fighters (HP: ${f3.maxHealth}, Dmg: ${f3.damageMin}-${f3.damageMax})\n• Naval Strike: Fighters can attack naval units.`;
    }
    case RESEARCH_TECH_IDS.AIR_TBD_LEVEL4: {
      const f4 = FIGHTER_UPGRADES[3];
      const b3 = BOMBER_UPGRADES[2];
      return `Unlocks:\n• Gen 4 Fighters (HP: ${f4.maxHealth}, Dmg: ${f4.damageMin}-${f4.damageMax})\n• Supersonic Bombers (HP: ${b3.maxHealth}, Dmg: ${b3.damageMin}-${b3.damageMax}, Range: ${b3.targetRange})`;
    }

    // --- NUCLEAR ---
    case RESEARCH_TECH_IDS.NUCLEAR_FISSION:
      return `Unlocks:\n• Atom Bomb: Basic nuclear weapon.\n• Missile Silo: Launch facility for nuclear weapons.`;
    case RESEARCH_TECH_IDS.THERMONUCLEAR_STAGING:
      return `Unlocks:\n• Hydrogen Bomb: High-yield nuclear weapon. Larger blast radius.`;
    case RESEARCH_TECH_IDS.MIRV_TECHNOLOGY:
      return `Unlocks:\n• MIRV: Multiple Independent Reentry Vehicles. Harder to intercept.`;
    case RESEARCH_TECH_IDS.NUCLEAR_TBD_LEVEL4:
      return `Unlocks:\n• Doomsday Device: Automatically launches all nukes if you are defeated.`;

    default:
      return "No detailed information available.";
  }
}
