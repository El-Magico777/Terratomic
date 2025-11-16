import { UnitType } from "../../core/game/Game";
import { UserSettings } from "../../core/game/UserSettings";
import { ThemeId, UnitSlug } from "../../core/theme/AllianceThemes";
import { translateText } from "../Utils";

function toStructureKey(u: UnitType): string | null {
  switch (u) {
    case UnitType.City:
    case UnitType.Port:
    case UnitType.Airfield:
    case UnitType.Hospital:
    case UnitType.ResearchLab:
    case UnitType.Academy:
    case UnitType.MissileSilo:
    case UnitType.SAMLauncher:
    case UnitType.DefensePost:
      return UnitSlug[u];
    default:
      return null;
  }
}

function toUnitKey(u: UnitType): string | null {
  switch (u) {
    case UnitType.FighterJet:
    case UnitType.Warship:
    case UnitType.Submarine:
    case UnitType.AtomBomb:
    case UnitType.HydrogenBomb:
    case UnitType.MIRV:
    case UnitType.MIRVWarhead:
      return UnitSlug[u];
    default:
      return null;
  }
}

function themedKey(
  themeId: ThemeId,
  kind: "unit" | "structure",
  slug: string,
): string {
  return `theme.${themeId}.${kind}.${slug}`;
}

function baseUnitKey(slug: string): string {
  return `unit_type.${slug}`;
}

export function getActiveThemeId(settings: UserSettings): ThemeId {
  const id = settings.themeId();
  if (id === "nato" || id === "russia" || id === "china" || id === "neutral")
    return id;
  return "neutral";
}

export function resolveUnitName(u: UnitType, settings: UserSettings): string {
  if (!settings.enableAllianceThemes()) return defaultName(u);
  const themeId = getActiveThemeId(settings);
  const slug = toUnitKey(u);
  if (!slug) return defaultName(u);

  // Prefer themed i18n key; fallback to base unit_type key
  const themed = themedKey(themeId, "unit", slug);
  const localized = translateText(themed);
  if (localized !== themed) return localized;

  const base = translateText(baseUnitKey(slug));
  if (base !== baseUnitKey(slug)) return base;
  return defaultName(u);
}

export function resolveStructureName(
  u: UnitType,
  settings: UserSettings,
): string {
  if (!settings.enableAllianceThemes()) return defaultName(u);
  const themeId = getActiveThemeId(settings);
  const slug = toStructureKey(u);
  if (!slug) return defaultName(u);

  const themed = themedKey(themeId, "structure", slug);
  const localized = translateText(themed);
  if (localized !== themed) return localized;

  const base = translateText(baseUnitKey(slug));
  if (base !== baseUnitKey(slug)) return base;
  return defaultName(u);
}

function defaultName(u: UnitType): string {
  return String(u);
}
