import { UnitType } from "../game/Game";

export type ThemeId = "neutral" | "nato" | "russia" | "china";

export interface AllianceThemeDef {
  id: ThemeId;
  displayNameKey: string; // e.g. theme.nato.name
}

export const AllianceThemes: ReadonlyArray<AllianceThemeDef> = [
  { id: "neutral", displayNameKey: "theme.neutral.name" },
  { id: "nato", displayNameKey: "theme.nato.name" },
  { id: "russia", displayNameKey: "theme.russia.name" },
  { id: "china", displayNameKey: "theme.china.name" },
];

export const ThemeIds: ThemeId[] = AllianceThemes.map((t) => t.id);

// Optional: mapping helper for unit slugs; kept in client resolver for UI.
export const UnitSlug: Record<UnitType, string> = {
  [UnitType.City]: "city",
  [UnitType.Port]: "port",
  [UnitType.Airfield]: "airfield",
  [UnitType.Hospital]: "hospital",
  [UnitType.ResearchLab]: "research_lab",
  [UnitType.Academy]: "academy",
  [UnitType.MissileSilo]: "missile_silo",
  [UnitType.SAMLauncher]: "sam_launcher",
  [UnitType.DefensePost]: "defense_post",
  [UnitType.FighterJet]: "fighter_jet",
  [UnitType.Warship]: "warship",
  [UnitType.Submarine]: "submarine",
  [UnitType.AtomBomb]: "atom_bomb",
  [UnitType.HydrogenBomb]: "hydrogen_bomb",
  [UnitType.MIRV]: "mirv",
  [UnitType.MIRVWarhead]: "mirv_warhead",
  [UnitType.TransportShip]: "transport",
  [UnitType.Shell]: "shell",
  [UnitType.SAMMissile]: "sam_missile",
  [UnitType.TradeShip]: "trade_ship",
  [UnitType.Construction]: "construction",
  [UnitType.CargoPlane]: "cargo_plane",
  [UnitType.Bomber]: "bomber",
  [UnitType.Paratrooper]: "paratrooper",
};
