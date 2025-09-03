# Release Workflow Tests

This directory contains Playwright tests for the release workflow system, organized by scope and purpose.

## Directory Structure

### Generic Tests (Root Level)
These tests are generic and can be adapted for any Nuxt 2 project:

- **`copilot-visual.test.ts`** - GitHub Copilot visual analysis tests
- **`copilot-single-task.test.ts`** - Single-task Copilot testing
- **`ui-testing-with-testids.test.ts`** - Basic UI testing with test IDs
- **`types.d.ts`** - TypeScript type definitions for tests

### Project-Specific Tests
- **`ahu3d/`** - AHU3D Sandbox-specific tests (examples for complex applications)
- **`examples/`** - Additional test examples and templates
- **`utils/`** - Shared test utilities and helpers

## Test Categories

### 1. Generic Visual Tests
Tests that work with any Nuxt 2 application:
- Application loading and initialization
- Basic UI responsiveness
- Navigation functionality
- Console error detection
- Performance monitoring

### 2. Application-Specific Tests
Located in subdirectories, these demonstrate testing patterns for:
- Complex 3D applications (`ahu3d/`)
- Domain-specific functionality
- Advanced user workflows
- Integration testing

### 3. Copilot Integration Tests
Tests that leverage GitHub Copilot for:
- Automated visual analysis
- AI-powered test suggestions
- Code quality assessment
- Accessibility validation

## Running Tests

### All Tests
```bash
npm run test
```

### Visual Tests with Copilot
```bash
npm run test:copilot:visual
```

### Quick Analysis
```bash
npm run test:copilot:analyze
```

### Specific Test Categories
```bash
# Generic tests only (excludes project-specific folders)
npx playwright test --ignore=**/ahu3d/** --config=release-workflow/playwright.config.ts

# Project-specific tests only
npx playwright test tests/ahu3d/ --config=release-workflow/playwright.config.ts
```

## Adapting for Your Project

When using this workflow for a different project:

1. **Keep the generic tests** - They provide basic functionality validation
2. **Replace project-specific tests** - Create tests for your application's unique features
3. **Update type definitions** - Modify `types.d.ts` to match your application's globals
4. **Customize Copilot tests** - Adapt visual analysis for your application's UI patterns

## Test Utilities

The `utils/` directory contains shared utilities:
- **Visual testing managers** - For screenshot capture and analysis
- **Test data generators** - For creating test scenarios
- **Custom matchers** - For application-specific assertions
- **Setup helpers** - For test environment configuration

## Best Practices

1. **Use test IDs** - Add `data-testid` attributes for reliable element selection
2. **Test user workflows** - Focus on critical user journeys
3. **Include accessibility** - Test for ARIA compliance and keyboard navigation
4. **Monitor performance** - Include timing and resource usage checks
5. **Leverage Copilot** - Use AI analysis for comprehensive test coverage

## Environment Setup

Tests expect:
- Application running on `http://localhost:3000`
- Node.js 16+ with Playwright installed
- VS Code with GitHub Copilot extension (for AI features)
- Proper environment variables configured

See the main documentation for complete setup instructions.
