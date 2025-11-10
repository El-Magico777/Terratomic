# User Story: In-Game UI Scale Slider

**As a player,** I want a slider in the in-game settings modal to control the game's UI scale, so that I can easily adjust the visual size of the game elements to my preference without leaving the game or relying on browser-specific zoom controls.

## Acceptance Criteria

- **Location:** A new slider control is added to the "Basic" settings tab within the `UserSettingModal`.
- **Functionality:**
  - The slider allows the player to adjust the game's UI scale.
  - Moving the slider immediately changes the visual scale of the game's UI elements.
  - The slider's initial position reflects the currently applied UI scale.
  - The UI scale setting persists across game sessions (e.g., saved in `localStorage`).
- **Range:** The slider should offer a reasonable range for UI scaling (e.g., from 75% to 150%).
- **Labeling:** The slider should have a clear label (e.g., "UI Scale") and display the current percentage value next to it.
- **Styling:** The slider should be styled consistently with other `setting-slider` components already present in the `UserSettingModal`.
- **Non-Regression:** All existing functionality and styling of the `UserSettingModal` and other settings must remain untouched.

## Initial Research - Involved Files

- `src/client/UserSettingModal.ts`: The component where the new slider will be added and its logic handled.
- `src/client/components/baseComponents/setting/SettingSlider.ts`: The reusable slider component that will be used.
- `src/client/Main.ts`: The main entry point where the initial UI scale will be applied on game load.
- `src/client/styles/main.css` or relevant CSS: For applying the scaling effect to the main game container.
