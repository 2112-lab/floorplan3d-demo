# AHU3D-Specific Tests

This directory contains Playwright tests that are specific to the AHU3D Sandbox application. These tests serve as examples of how the release workflow can be used with a complex application that includes:

- 3D rendering and scene management
- Component-based architecture
- Wiring and electrical systems
- Blueprint export functionality
- Xeto configuration generation

## Test Files

### `3d-scene-loading.test.ts`
Tests the loading and rendering of 3D scenes, including:
- WebGL canvas initialization
- Component library loading
- 3D scene rendering validation
- Performance checks for 3D operations

### `blueprint-export.test.ts`
Tests blueprint export functionality:
- 3D scene to 2D blueprint conversion
- Export format validation (PNG, SVG, PDF)
- Blueprint quality and accuracy checks
- Export workflow user interactions

### `component-panel-and-wiring.test.ts`
Tests component management and wiring features:
- Component library browsing and loading
- Component placement in 3D scenes
- Wiring system integration
- Component properties and connections

### `wiring-export.test.ts`
Tests electrical wiring export functionality:
- Wiring diagram generation
- Cable and connection export
- Wiring documentation formats
- Integration with external systems

### `xeto-generator.test.ts`
Tests Xeto configuration generation:
- Grid-based component placement
- Xeto JSON format generation
- Configuration validation
- Assembly generation from layouts

## Usage

These tests are specific to the AHU3D Sandbox application and use:
- `window.ahu3dInstance` global object
- AHU3D-specific component libraries
- Domain-specific test scenarios
- Application-specific UI elements

## For Other Projects

When adapting the release workflow for other projects:

1. **Replace these tests** with tests specific to your application domain
2. **Use the test structure** as a template for comprehensive testing
3. **Adapt the patterns** for your application's specific features
4. **Keep the generic tests** in the parent directory for basic functionality

## Running AHU3D Tests

To run only the AHU3D-specific tests:

```bash
# Run all AHU3D tests
npx playwright test tests/ahu3d/ --config=release-workflow/playwright.config.ts

# Run a specific AHU3D test
npx playwright test tests/ahu3d/xeto-generator.test.ts --config=release-workflow/playwright.config.ts

# Run with browser visible
npx playwright test tests/ahu3d/ --config=release-workflow/playwright.config.ts --headed
```

These tests require the AHU3D Sandbox application to be running on `http://localhost:3000` and demonstrate advanced testing patterns for complex web applications.
