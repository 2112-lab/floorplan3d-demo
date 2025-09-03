# Project - Claude + Playwright MCP Integration Guide

This guide shows how to use Claude with the Playwright MCP server to create and run tests for the Project application.

## Quick Setup for Claude + Playwright MCP

### 1. Essential Test Selectors Reference

```typescript
// Main Navigation
'[data-testid="nav-button-xeto"]'          // Xeto mode button
'[data-testid="nav-button-component"]'     // Component mode button
'[data-testid="nav-button-wiring"]'        // Wiring mode button
'[data-testid="nav-button-scene"]'         // Scene mode button
'[data-testid="nav-button-code"]'          // Code mode button
'[data-testid="nav-button-test"]'          // Test mode button

// Main Areas
'[data-testid="primary-3d-viewport"]'      // 3D scene area
'[data-testid="xeto-json-textarea"]'       // Xeto JSON editor
'[data-testid="apply-load-btn"]'           // Apply & Load button
'[data-testid="component-panel"]'          // Component controls
'[data-testid="library-item-select"]'      // Component selector

// Component Panel
'[data-testid="load-component-btn"]'       // Load component button
'[data-testid="size-small-radio"]'         // Small size option
'[data-testid="size-medium-radio"]'        // Medium size option
'[data-testid="size-large-radio"]'         // Large size option

// Drawers
'[data-testid="xeto-json-drawer"]'         // Xeto editor panel
'[data-testid="component-library-drawer"]' // Component library panel
'[data-testid="scene-drawer"]'             // Scene controls panel
'[data-testid="code-drawer"]'              // Code output panel
'[data-testid="test-drawer"]'              // Test panel
```

### 2. Common Test Patterns with Claude

#### Pattern 1: Mode Navigation Test
```typescript
test('navigate to component mode', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('[data-testid="app-container"]');
  
  // Switch to component mode
  await page.click('[data-testid="nav-button-component"]');
  await expect(page.locator('[data-testid="component-mode-panel"]')).toBeVisible();
});
```

#### Pattern 2: 3D Scene Interaction
```typescript
test('load 3D component', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="nav-button-component"]');
  
  // Select a component
  await page.click('[data-testid="library-item-select"]');
  await page.click('text=Fan');
  
  // Load it
  await page.click('[data-testid="load-component-btn"]');
  
  // Verify 3D scene
  await expect(page.locator('[data-testid="primary-3d-viewport"] canvas')).toBeVisible();
});
```

#### Pattern 3: Xeto JSON Manipulation
```typescript
test('modify xeto configuration', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="nav-button-xeto"]');
  
  // Get current JSON
  const textarea = page.locator('[data-testid="xeto-json-textarea"]');
  const currentJson = await textarea.inputValue();
  
  // Modify JSON (example)
  const modifiedJson = currentJson.replace('"size": "medium"', '"size": "large"');
  await textarea.fill(modifiedJson);
  
  // Apply changes
  await page.click('[data-testid="apply-load-btn"]');
});
```

### 3. Claude Prompts for Test Creation

#### Basic UI Test Creation
```
Create a Playwright test that:
1. Navigates to the Project app
2. Switches to component mode using [data-testid="nav-button-component"]
3. Verifies the component panel is visible using [data-testid="component-panel"]
4. Selects a component from the library dropdown
5. Clicks the load button to display it in 3D
```

#### Complex Workflow Test
```
Create a Playwright test that simulates a complete AHU design workflow:
1. Start in Xeto mode
2. Modify the JSON configuration in [data-testid="xeto-json-textarea"]
3. Apply the changes with [data-testid="apply-load-btn"]
4. Switch to component mode
5. Verify the 3D scene shows the updated configuration
6. Take a screenshot for verification
```

#### Error Handling Test
```
Create a Playwright test that tests error scenarios:
1. Navigate to Xeto mode
2. Input invalid JSON into [data-testid="xeto-json-textarea"]
3. Try to apply it with [data-testid="apply-load-btn"]
4. Verify error handling (check for error messages or alerts)
5. Restore valid JSON and verify recovery
```

### 4. Advanced Claude + Playwright Patterns

#### Visual Regression Testing
```typescript
test('visual regression for 3D scene', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="nav-button-component"]');
  
  // Load a specific component
  await page.selectOption('[data-testid="library-item-select"]', 'Fan');
  await page.click('[data-testid="load-component-btn"]');
  
  // Wait for 3D scene to render
  await page.waitForTimeout(3000);
  
  // Take screenshot of 3D viewport
  await expect(page.locator('[data-testid="primary-3d-viewport"]')).toHaveScreenshot('fan-component.png');
});
```

#### Performance Testing
```typescript
test('measure 3D scene loading performance', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="nav-button-xeto"]');
  await page.click('[data-testid="apply-load-btn"]');
  
  // Wait for 3D scene to load
  await page.waitForSelector('[data-testid="primary-3d-viewport"] canvas');
  
  const loadTime = Date.now() - startTime;
  console.log(`3D scene loaded in ${loadTime}ms`);
  
  expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
});
```

#### Wiring System Testing
```typescript
test('test wiring diagram functionality', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="nav-button-wiring"]');
  
  // Test wiring mode panel
  await expect(page.locator('[data-testid="wiring-mode-panel"]')).toBeVisible();
  
  // Test viewport controls
  await expect(page.locator('[data-testid="wiring-viewport-controls"]')).toBeAttached();
});
```

### 5. Claude Prompts for Debugging

#### Debugging Failed Tests
```
My Playwright test is failing when trying to click [data-testid="nav-button-component"]. 
Can you help me debug this by:
1. Adding proper waits
2. Checking if the element exists
3. Adding error handling
4. Creating a more robust selector strategy
```

#### Test Maintenance
```
Update this Playwright test to handle the new test IDs I've added to the Project app:
[Previous test code]

New available test IDs:
- data-testid="component-evaluation-section"
- data-testid="library-item-select"
- data-testid="size-medium-radio"
```

### 6. Running Tests with Playwright MCP

#### Basic Test Execution
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/ui-testing-with-testids.test.ts

# Run with browser visible
npx playwright test --headed

# Run specific test by name
npx playwright test -g "should navigate between modes"
```

#### Debug Mode
```bash
# Run in debug mode
npx playwright test --debug

# Generate test code by recording
npx playwright codegen http://localhost:3000
```

### 7. Best Practices for Claude + Playwright

1. **Always specify test IDs in prompts**: Include the exact `data-testid` values
2. **Ask for robust error handling**: Request timeout handling and element verification
3. **Request reusable patterns**: Ask Claude to create helper functions for common actions
4. **Include waiting strategies**: Always ask for proper wait conditions
5. **Test edge cases**: Prompt Claude to consider error scenarios and loading states

### 8. Example Claude Conversation Starters

```
"Create a comprehensive Playwright test suite for the Project application that tests all navigation modes using the data-testid selectors I've provided. Include proper error handling and waiting strategies."

"Help me debug this Playwright test that's failing on the component loading functionality. The test should use [data-testid='load-component-btn'] but it's timing out."

"Generate a Playwright test that validates the 3D scene loads correctly after modifying Xeto JSON configuration. Include visual verification and performance checks."

"Create a test that simulates a complete user workflow: load app → modify Xeto JSON → apply changes → switch to component mode → verify 3D scene updates."
```

This guide provides the foundation for effective testing with Claude and Playwright MCP server integration.
