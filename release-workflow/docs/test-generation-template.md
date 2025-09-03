# GitHub MCP Test Generation Template

## Quick Start:
1. **Copy** this entire template
2. **Replace** `[CURRENT_BRANCH_NAME]` with your actual branch (e.g., `project-0-05-07`)
3. **Send** the complete prompt to GitHub Copilot

---

**GitHub MCP Test Generation Request**

Please analyze the latest commits and generate comprehensive Playwright tests following the Project release workflow.

**Repository Information:**
- **Sandbox Repository**: 2112-lab/project
- **Module Repository**: 2112-lab/module
- **Current Branch**: [CURRENT_BRANCH_NAME] (e.g., project-0-05-07)
- **Development Server**: http://localhost:3000 (assumed running)

**MCP Analysis Requirements:**
1. Use GitHub MCP to read latest commits from both repositories
2. Analyze commit messages, changed files, and PR descriptions
3. Identify affected functionality areas and integration points
4. Determine test scope based on actual changes made
5. Map commits to appropriate test categories (UI, API, integration, regression)

**Test Generation Requirements:**

**Core Test Categories:**
- **UI Interaction Tests**: Navigation, component interactions, user workflows
- **API Integration Tests**: Module functionality, data flow
- **Component Tests**: Vue component rendering, props, events, lifecycle
- **Integration Tests**: Cross-repository dependencies, data flow between components
- **Regression Tests**: Existing functionality that might be affected

**Test Design Principles:**
- **Automated Analysis**: GitHub MCP analyzes commits to determine test scope
- **Data-TestId Attributes**: REQUIRED for all interactive elements. If `data-testid` attributes are missing from elements needed for testing, add them to the Vue components BEFORE generating tests. This ensures reliable, maintainable test selectors.
- **Simple & Reliable**: Use stable selectors (data-testid attributes)
- **Meaningful**: Test actual user workflows, not implementation details
- **Fast**: Keep tests under 30 seconds each
- **Modular**: Each test should be independent and self-contained
- **Local Only**: All testing happens on developer machine before push
- **Targeted**: Only test new functionality identified by GitHub MCP analysis
- **Visual**: Always use --headed parameter for visual feedback during testing
- **Blocking**: New tests must pass before code can be pushed
- **Reproducible**: Same commits always generate same test recommendations

**Test File Structure:**
```javascript
// Use this structure for generated test files
import { test, expect } from '@playwright/test';

test.describe('[Feature Name] - [Brief Description]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Add any necessary setup
  });

  test('[Test Case Description]', async ({ page }) => {
    // Test implementation
  });
});
```

**Expected Output:**
1. **Analysis Summary**: Brief overview of commits analyzed and changes identified
2. **Test Files**: Complete Playwright test files ready to run
3. **Test Coverage**: Explanation of what functionality is covered by each test
4. **Selectors Used**: List of data-testid attributes and selectors used
5. **Execution Instructions**: How to run the generated tests locally

**Important Notes:**
- Generate tests ONLY for functionality identified by MCP commit analysis
- Do NOT generate tests for the entire application - focus on changes
- Ensure all tests can run with `npx playwright test [filename] --headed`
- Tests must pass locally before pushing to version branch
- Follow the established patterns from existing test files in `/tests` directory

**MCP Analysis Focus Areas:**
- New Vue components added/modified
- Module API changes and new methods
- UI interaction modifications and user workflow updates
- 3D scene rendering and functionality changes
- Data flow and component integration updates
- Cross-repository dependency changes

Please generate the tests now based on the MCP analysis of the latest commits.</content>
<parameter name="filePath">c:\Users\caleb\Documents\Nuxt_Devops\github\project\docs\test-generation-template.md
