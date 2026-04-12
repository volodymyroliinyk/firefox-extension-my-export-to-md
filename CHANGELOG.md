# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project follows Semantic Versioning.

## [1.0.7] - 2026-04-11

### Added

- Added an optional Firefox runtime smoke test script (`npm run test:smoke`) to validate extension startup in a real
  browser environment.

### Changed

- Migrated extension manifest/runtime flow to MV3-compatible structure while preserving Firefox compatibility behavior.
- Strengthened release flow ordering and consistency by creating release commit/tag before external publishing.

### Fixed

- Removed broad host permissions usage to align with least-privilege extension security practices.
- Hardened `web-ext` lint wrapper to preserve diagnostics output and use more robust JSON report handling.
- Added failure cleanup in release automation to remove local release tag when publishing fails mid-flow.

## [1.0.0 - 1.0.6] - 2026-04-11 (retrospective)

### Added

- Initialized the Firefox extension project and core export-to-Markdown functionality.
- Implemented full-page and selected-element export flow.
- Added markdown-themed extension icons across manifest/action contexts.
- Added HTML table conversion support, including `colspan` and `rowspan` handling.
- Added comprehensive automated tests for background/content/parser flows.

### Changed

- Refactored source modules for stronger structure, naming consistency, and safer message handling.
- Strengthened build and test quality gates (lint, type-check, unit tests, release packaging checks).
- Tightened TypeScript strictness configuration and test pipeline validation.

### Fixed

- Fixed packaging flow issues around release artifact composition and icon availability.
- Stabilized release/build automation behavior to reduce false-success and consistency risks.
