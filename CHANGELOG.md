# Changelog

All notable changes to this project will be documented in this file.

## [1.0.7] - 2026-02-07

### Added
- **Database Backup**: Added ability to export and share the database file from Settings for data safety during updates.
- **Tagging System**: Extracted `TagPickerModal` for reusable tag management across the app.
- **Post-Hoc Tagging**: Added "Add Tag" button to feed items to categorize existing captures.
- **Improved Video Player**: Added `InstagramVideo` with better gesture controls (Single Tap Mute, Double Tap Review, Long Press Pause).
- **Video Posters**: Implemented `posterSource` to prevent white flashes during video loading.

### Changed
- **Capture Workflow**: Redesigned `CaptureModal` to focus on content first. Captures now default to unscheduled, allowing users to categorize and schedule later.
- **UI Renaming**: Renamed "Backlog" to "Archive" throughout the UI for clearer taxonomy.
- **Styling**: Refined `LabelManagementModal` and `SettingsModal` with proper color constants and improved layouts.
- **Assets**: Updated application icons.

### Fixed
- **Gesture Conflicts**: Resolved conflict between single and double taps on video media.
- **Build Compatibility**: Downgraded `expo-sharing` to match Expo v50 requirements.
- **Linting**: Fixed 100+ linting issues related to color literals and unused variables.

## [1.0.6] - 2026-02-05
- Previous version.
