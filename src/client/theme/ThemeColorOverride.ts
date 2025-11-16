import { Colord } from "colord";
import { ColorAllocator } from "../../core/configuration/ColorAllocator";
import { fallbackColors, humanColors } from "../../core/configuration/Colors";
import { ColoredTeams } from "../../core/game/Game";
import { PlayerView } from "../../core/game/GameView";
import { UserSettings } from "../../core/game/UserSettings";
import { ThemeId } from "../../core/theme/AllianceThemes";

const allocator = new ColorAllocator(humanColors, fallbackColors);

function mapThemeToTeam(themeId: ThemeId) {
  switch (themeId) {
    case "nato":
      return ColoredTeams.Blue;
    case "russia":
      return ColoredTeams.Red;
    case "china":
      return ColoredTeams.Yellow;
    default:
      return null;
  }
}

export function computeCustomTerritoryColor(owner: PlayerView): Colord | null {
  const settings = new UserSettings();
  if (!settings.enableAllianceThemes()) return null;
  const id = settings.themeId();
  const team = mapThemeToTeam(id as ThemeId);
  if (!team) return null;
  return allocator.assignTeamPlayerColor(team, owner.id());
}
