# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.1.0] - 2025-01-21

### Added
- Complete file upload functionality in chat interface
- File preview system with thumbnails for images and videos
- File removal functionality before sending
- Visual feedback through toast notifications
- Memory management for file previews

### Fixed
- Paperclip button now properly opens file browser
- File input element was missing from chat interface
- Send button logic now handles both text and file uploads
- Memory leaks from file previews are now prevented

### Changed
- Simplified ref management from dynamic refs to single file input ref
- Enhanced send message logic to support file uploads
- Improved user experience with file selection and preview

### Technical Details
- Added `filePreviews` state for managing file preview data
- Implemented proper file type validation (images and videos)
- Added file cleanup using `URL.revokeObjectURL()`
- Enhanced FormData handling for file uploads to backend

## [1.0.0] - 2025-01-20

### Initial Release
- Basic chat interface with video background
- Voice recording functionality
- Text message support
- Visitor badge system
- Laboratory-themed UI design