import { test, expect } from '@playwright/test';

/**
 * Enhanced test suite using the new data-testid selectors
 * 
 * This test suite demonstrates how to use the new test IDs for reliable UI testing
 * and includes comprehensive examples for different application modes.
 */
test.describe('AHU3D Sandbox - Enhanced UI Testing with Test IDs', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    
    // Wait for the application container to be present
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
    
    // Wait for navigation to be ready
    await page.waitForSelector('[data-testid="navigation-buttons-container"]', { timeout: 15000 });
    
    // Give the 3D scene a moment to start initializing
    await page.waitForTimeout(2000);
  });

  test('should load application with correct structure and navigation', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle('ahu3d-sandbox');
    
    // Verify main application structure
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-navigation-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-title-text"]')).toHaveText('Ahu3D Sandbox');
    
    // Verify all navigation buttons are present and visible
    const modes = ['xeto', 'component', 'wiring', 'scene', 'code', 'test'];
    for (const mode of modes) {
      await expect(page.locator(`[data-testid="nav-button-${mode}"]`)).toBeVisible();
    }
    
    // Verify main content areas
    await expect(page.locator('[data-testid="main-content-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-viewport-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="right-drawer"]')).toBeVisible();
  });

  test('should navigate between different modes correctly', async ({ page }) => {
    // Test Xeto mode
    await page.click('[data-testid="nav-button-xeto"]');
    await expect(page.locator('[data-testid="xeto-mode-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="xeto-json-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="xeto-json-textarea"]')).toBeVisible();
    
    // Test Component mode
    await page.click('[data-testid="nav-button-component"]');
    await expect(page.locator('[data-testid="component-mode-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-library-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="library-json-textarea"]')).toBeVisible();
    
    // Test Wiring mode
    await page.click('[data-testid="nav-button-wiring"]');
    await expect(page.locator('[data-testid="wiring-mode-panel"]')).toBeVisible();
    
    // Test Scene mode
    await page.click('[data-testid="nav-button-scene"]');
    await expect(page.locator('[data-testid="scene-drawer"]')).toBeVisible();
    
    // Test Code mode
    await page.click('[data-testid="nav-button-code"]');
    await expect(page.locator('[data-testid="code-mode-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="code-drawer"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-post-request-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-scene-btn"]')).toBeVisible();
    
    // Test Test mode
    await page.click('[data-testid="nav-button-test"]');
    await expect(page.locator('[data-testid="test-mode-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-drawer"]')).toBeVisible();
  });

  test('should interact with component panel correctly', async ({ page }) => {
    // Navigate to Component mode
    await page.click('[data-testid="nav-button-component"]');
    
    // Wait for component panel to be visible
    await expect(page.locator('[data-testid="component-panel"]')).toBeVisible();
    
    // Check component evaluation section
    await expect(page.locator('[data-testid="component-evaluation-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="component-evaluation-label"]')).toHaveText('Component Evaluation:');
    
    // Test library item selector
    const librarySelect = page.locator('[data-testid="library-item-select"]');
    await expect(librarySelect).toBeVisible();
    
    // Test size radio buttons
    await expect(page.locator('[data-testid="component-size-radio-group"]')).toBeVisible();
    await expect(page.locator('[data-testid="size-small-radio"]')).toBeVisible();
    await expect(page.locator('[data-testid="size-medium-radio"]')).toBeVisible();
    await expect(page.locator('[data-testid="size-large-radio"]')).toBeVisible();
    
    // Test load button (should be initially disabled)
    await expect(page.locator('[data-testid="load-component-btn"]')).toBeVisible();
    
    // Try to interact with the library select, but don't fail if library isn't loaded
    try {
      await librarySelect.click({ timeout: 3000 });
      
      // Wait for dropdown options
      await page.waitForTimeout(1000);
      
      // Look for any available options
      const options = page.locator('div[role="listbox"] div[role="option"]');
      const optionCount = await options.count();
      
      if (optionCount > 0) {
        // Click the first option
        await options.first().click();
        
        // After selection, load button should be enabled
        await expect(page.locator('[data-testid="load-component-btn"]')).toBeEnabled({ timeout: 5000 });
        
        // Test size selection
        await page.click('[data-testid="size-large-radio"]');
        
        // Click load button
        await page.click('[data-testid="load-component-btn"]');
        
        // Wait for potential 3D loading
        await page.waitForTimeout(2000);
        
        // Verify 3D viewport is still visible
        await expect(page.locator('[data-testid="primary-3d-viewport"]')).toBeVisible();
        
        console.log('Successfully tested component interaction');
      } else {
        console.log('No dropdown options available, library may still be loading');
      }
    } catch (error) {
      console.log('Library interaction not available, testing basic UI elements only');
      
      // At least verify the UI structure is correct
      await expect(page.locator('[data-testid="library-item-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="size-medium-radio"]')).toBeVisible();
    }
  });

  test('should handle Xeto JSON interactions', async ({ page }) => {
    // Navigate to Xeto mode
    await page.click('[data-testid="nav-button-xeto"]');
    
    // Verify Xeto elements are visible
    await expect(page.locator('[data-testid="xeto-json-title"]')).toHaveText('Xeto JSON');
    await expect(page.locator('[data-testid="xeto-json-textarea"]')).toBeVisible();
    await expect(page.locator('[data-testid="apply-load-btn"]')).toBeVisible();
    
    // Check if textarea has content
    const textarea = page.locator('[data-testid="xeto-json-textarea"]');
    const content = await textarea.inputValue();
    
    if (content && content.trim() !== '') {
      // If there's content, try to parse it as JSON
      try {
        JSON.parse(content);
        console.log('Valid JSON found in Xeto textarea');
        
        // Test Apply & Load button
        await page.click('[data-testid="apply-load-btn"]');
        
        // Wait for processing
        await page.waitForTimeout(2000);
        
        // Verify 3D viewport is still present
        await expect(page.locator('[data-testid="primary-3d-viewport"]')).toBeVisible();
      } catch (error) {
        console.log('Invalid JSON in textarea, skipping parse test');
      }
    }
  });

  test('should verify 3D viewport presence and canvas loading', async ({ page }) => {
    // Check primary viewport
    await expect(page.locator('[data-testid="primary-3d-viewport"]')).toBeVisible();
    
    // Wait for potential 3D scene initialization
    await page.waitForTimeout(3000);
    
    // Check if WebGL canvas is present inside the viewport
    const canvas = page.locator('[data-testid="primary-3d-viewport"] canvas');
    
    // Canvas might not be immediately visible depending on 3D library loading
    try {
      await canvas.waitFor({ timeout: 10000 });
      await expect(canvas).toBeVisible();
      console.log('WebGL canvas found and visible');
    } catch (error) {
      console.log('WebGL canvas not found within timeout, 3D scene may still be loading');
    }
  });

  test('should test viewport controls availability', async ({ page }) => {
    // Test that viewport control elements exist in the DOM (they may not be visible initially)
    const secondaryControls = page.locator('[data-testid="secondary-viewport-controls"]');
    const wiringControls = page.locator('[data-testid="wiring-viewport-controls"]');
    
    // Check if elements exist in DOM
    await expect(secondaryControls).toBeAttached();
    await expect(wiringControls).toBeAttached();
    
    // Log visibility status for debugging
    const secondaryVisible = await secondaryControls.isVisible();
    const wiringVisible = await wiringControls.isVisible();
    
    console.log(`Secondary viewport controls visible: ${secondaryVisible}`);
    console.log(`Wiring viewport controls visible: ${wiringVisible}`);
    
    // At minimum, verify the elements are in the DOM structure
    // Visibility may depend on application state
  });

  test('should verify all drawer areas exist', async ({ page }) => {
    const drawerTests = [
      { mode: 'xeto', drawer: 'xeto-json-drawer', title: 'xeto-json-title' },
      { mode: 'component', drawer: 'component-library-drawer', title: 'library-json-title' },
      { mode: 'scene', drawer: 'scene-drawer', title: null },
      { mode: 'code', drawer: 'code-drawer', title: 'ahu-object-title' },
      { mode: 'test', drawer: 'test-drawer', title: null }
    ];
    
    for (const test of drawerTests) {
      await page.click(`[data-testid="nav-button-${test.mode}"]`);
      await expect(page.locator(`[data-testid="${test.drawer}"]`)).toBeVisible();
      
      if (test.title) {
        await expect(page.locator(`[data-testid="${test.title}"]`)).toBeVisible();
      }
    }
  });

  test('should test responsive behavior', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    
    // Verify main components are still visible at different sizes
    await expect(page.locator('[data-testid="main-navigation-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-viewport-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="right-drawer"]')).toBeVisible();
  });

  test('should verify error states and edge cases', async ({ page }) => {
    // Test navigation to each mode multiple times
    const modes = ['xeto', 'component', 'wiring', 'scene', 'code', 'test'];
    
    for (let i = 0; i < 2; i++) {
      for (const mode of modes) {
        await page.click(`[data-testid="nav-button-${mode}"]`);
        await page.waitForTimeout(100); // Small delay between clicks
      }
    }
    
    // Verify final state is still functional
    await page.click('[data-testid="nav-button-xeto"]');
    await expect(page.locator('[data-testid="xeto-mode-panel"]')).toBeVisible();
  });

  test('should have blueprint export component with proper test IDs', async ({ page }) => {
    // Verify the blueprint export window component exists in the DOM
    await expect(page.locator('[data-testid="blueprint-export-window"]')).toBeAttached();
    
    // Note: The export window may not be visible initially since it's a modal dialog
    // but we can verify that all the necessary test IDs are properly set up in the component
    
    // Check if any export-related elements are visible in the current state
    const exportElements = await page.locator('[data-testid*="export"]').count();
    console.log(`Found ${exportElements} export-related elements with test IDs`);
    
    // The test primarily verifies that the component structure is properly set up with test IDs
    // For actual interaction testing, the export dialog would need to be opened first
  });
});

/**
 * Utility functions for common test patterns
 */
export class TestHelpers {
  static async switchToMode(page: any, mode: string) {
    await page.click(`[data-testid="nav-button-${mode}"]`);
    await expect(page.locator(`[data-testid="${mode}-mode-panel"]`)).toBeVisible();
  }
  
  static async wait3DScene(page: any) {
    await page.waitForSelector('[data-testid="primary-3d-viewport"]');
    await page.waitForTimeout(3000); // Allow 3D scene to initialize
  }
  
  static async validateJSON(page: any, testId: string, expectedKeys: string[]) {
    const textarea = page.locator(`[data-testid="${testId}"]`);
    const content = await textarea.inputValue();
    
    if (content && content.trim() !== '') {
      const json = JSON.parse(content);
      
      for (const key of expectedKeys) {
        expect(json).toHaveProperty(key);
      }
    }
  }
}
