import { test, expect } from '@playwright/test';
import type { 
  ConsoleMessage, 
  WebGLCanvasInfo, 
  Ahu3DInfo, 
  LibraryInfo, 
  SceneState 
} from './types';

/**
 * Comprehensive test suite for verifying 3D scene loading in the AHU3D Sandbox application
 * 
 * This test suite verifies:
 * - Initial page load and structure
 * - 3D scene initialization and rendering
 * - WebGL canvas presence and configuration
 * - AHU3D engine instance and components
 * - Scene loading indicators and console logs
 */
test.describe('AHU3D Sandbox - 3D Scene Loading Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    
    // Wait for the application to initialize
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for essential elements to be present with increased timeout
    await page.waitForSelector('.rubik-mono-one-regular:has-text("Ahu3D Sandbox")', { timeout: 30000 });
    
    // Wait for Vue app to be mounted and navigation to be ready
    await page.waitForSelector('button:has-text("Xeto")', { timeout: 15000 });
    
    // Give the 3D scene a moment to start initializing
    await page.waitForTimeout(3000);
  });

  test('should load the application and display navigation tabs', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle('ahu3d-sandbox');
    
    // Verify main navigation tabs are present by targeting the navigation area more specifically
    // Look for buttons within the navigation row that aren't part of other UI components
    const navButtons = page.locator('button.mx-1'); // These are the nav buttons with mx-1 class
    
    await expect(navButtons.filter({ hasText: 'Xeto' })).toBeVisible();
    await expect(navButtons.filter({ hasText: 'Component' })).toBeVisible();
    await expect(navButtons.filter({ hasText: 'Wiring' })).toBeVisible();
    await expect(navButtons.filter({ hasText: 'Scene' })).toBeVisible();
    await expect(navButtons.filter({ hasText: 'Code' })).toBeVisible();
    await expect(navButtons.filter({ hasText: 'Test' })).toBeVisible();
    
    // Verify the application header
    await expect(page.locator('.rubik-mono-one-regular:has-text("Ahu3D Sandbox")')).toBeVisible();
  });

  test('should have primary viewport with 3D canvas element', async ({ page }) => {
    // Wait for the primary viewport container
    const primaryViewport = page.locator('#primaryViewport');
    await expect(primaryViewport).toBeVisible();
    
    // Check for canvas element within the primary viewport
    const canvas = primaryViewport.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Verify canvas has reasonable dimensions
    const canvasInfo = await canvas.evaluate((element) => {
      const canvasEl = element as HTMLCanvasElement;
      return {
        width: canvasEl.width,
        height: canvasEl.height,
        offsetWidth: canvasEl.offsetWidth,
        offsetHeight: canvasEl.offsetHeight
      };
    });
    
    expect(canvasInfo.width).toBeGreaterThan(0);
    expect(canvasInfo.height).toBeGreaterThan(0);
    expect(canvasInfo.offsetWidth).toBeGreaterThan(0);
    expect(canvasInfo.offsetHeight).toBeGreaterThan(0);
  });

  test('should initialize AHU3D engine with required components', async ({ page }) => {
    // Wait for the AHU3D instance to be available
    await page.waitForFunction(() => typeof window.ahu3dInstance !== 'undefined', { timeout: 20000 });
    
    // Verify AHU3D instance exists and has required properties
    const ahu3dInfo = await page.evaluate(() => {
      const ahu3d = window.ahu3dInstance;
      return {
        exists: !!ahu3d,
        type: typeof ahu3d,
        constructor: ahu3d?.constructor?.name,
        hasAhuObject: !!ahu3d?.ahuObject,
        hasSceneHelper: !!ahu3d?.sceneHelper,
        hasComponents: !!ahu3d?.components,
        hasLibrary: !!ahu3d?.library,
        sceneHelperType: ahu3d?.sceneHelper?.constructor?.name
      };
    });
    
    expect(ahu3dInfo.exists).toBe(true);
    expect(ahu3dInfo.type).toBe('object');
    expect(ahu3dInfo.constructor).toBe('Ahu3D');
    expect(ahu3dInfo.hasAhuObject).toBe(true);
    expect(ahu3dInfo.hasSceneHelper).toBe(true);
    expect(ahu3dInfo.hasComponents).toBe(true);
    expect(ahu3dInfo.hasLibrary).toBe(true);
    expect(ahu3dInfo.sceneHelperType).toBe('Scene3D');
  });

  test('should have WebGL-enabled canvas for 3D rendering', async ({ page }) => {
    // Check for WebGL support and canvas with WebGL context
    const webglInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const webglCanvases: WebGLCanvasInfo[] = [];
      
      canvases.forEach(canvas => {
        const canvasEl = canvas as HTMLCanvasElement;
        try {
          const gl = canvasEl.getContext('webgl') || 
                    canvasEl.getContext('webgl2') || 
                    canvasEl.getContext('experimental-webgl');
          
          if (gl) {
            webglCanvases.push({
              width: canvasEl.width,
              height: canvasEl.height,
              parentId: canvasEl.parentElement?.id,
              hasWebGL: true
            });
          }
        } catch (e: any) {
          // Context already taken, but still indicates WebGL usage
          if (e.message?.includes('existing context')) {
            webglCanvases.push({
              width: canvasEl.width,
              height: canvasEl.height,
              parentId: canvasEl.parentElement?.id,
              hasWebGL: true,
              contextTaken: true
            });
          }
        }
      });
      
      return {
        totalCanvases: canvases.length,
        webglCanvases: webglCanvases,
        hasWebGLCanvas: webglCanvases.length > 0
      };
    });
    
    expect(webglInfo.hasWebGLCanvas).toBe(true);
    expect(webglInfo.webglCanvases.length).toBeGreaterThan(0);
    
    // Verify at least one WebGL canvas is in the primary viewport
    const primaryViewportCanvas = webglInfo.webglCanvases.find(
      canvas => canvas.parentId === 'primaryViewport'
    );
    expect(primaryViewportCanvas).toBeDefined();
    expect(primaryViewportCanvas?.width).toBeGreaterThan(1000); // Reasonable size for 3D rendering
    expect(primaryViewportCanvas?.height).toBeGreaterThan(500);
  });

  test('should display 3D scene loading console messages', async ({ page }) => {
    const consoleMessages: ConsoleMessage[] = [];
    
    // Collect console messages during page load
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Reload page to capture all console messages
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for 3D loading to complete
    await page.waitForFunction(() => typeof window.ahu3dInstance !== 'undefined', { timeout: 20000 });
    await page.waitForTimeout(3000); // Allow additional loading
    
    // Filter for 3D-related loading messages
    const sceneLoadingMessages = consoleMessages.filter(msg => 
      msg.text.includes('loadInstanceSet') ||
      msg.text.includes('loadModel finished') ||
      msg.text.includes('createDuct') ||
      msg.text.includes('render3D') ||
      msg.text.includes('runAhu3D') ||
      msg.text.includes('Scene3D') ||
      msg.text.includes('THREE.') ||
      msg.text.includes('loadAppliedXeto')
    );
    
    // Verify essential 3D loading messages are present
    expect(sceneLoadingMessages.length).toBeGreaterThan(5);
    
    // Check for specific loading completion indicators
    const hasInstanceLoading = consoleMessages.some(msg => 
      msg.text.includes('loadInstanceSet')
    );
    const hasModelLoading = consoleMessages.some(msg => 
      msg.text.includes('loadModel finished')
    );
    const hasRender3D = consoleMessages.some(msg => 
      msg.text.includes('render3D')
    );
    
    expect(hasInstanceLoading).toBe(true);
    expect(hasModelLoading).toBe(true);
    expect(hasRender3D).toBe(true);
  });

  test('should have loaded component library and assets', async ({ page }) => {
    // Wait for 3D engine initialization
    await page.waitForFunction(() => typeof window.ahu3dInstance !== 'undefined', { timeout: 20000 });
    
    // Verify component library is loaded
    const libraryInfo = await page.evaluate(() => {
      const ahu3d = window.ahu3dInstance;
      const library = ahu3d?.library;
      
      if (!library) return { loaded: false };
      
      // Check for expected component types
      const expectedComponents = [
        'AirFilter', 'CoolingCoil', 'Damper', 'Fan', 
        'FanHorizontal', 'FanPropeller', 'GenericSensor', 
        'TemperatureSensor', 'HeatingCoil'
      ];
      
      const availableComponents = Object.keys(library);
      const hasExpectedComponents = expectedComponents.some(comp => 
        availableComponents.includes(comp)
      );
      
      return {
        loaded: true,
        componentCount: availableComponents.length,
        availableComponents: availableComponents,
        hasExpectedComponents: hasExpectedComponents
      };
    });
    
    expect(libraryInfo.loaded).toBe(true);
    expect(libraryInfo.componentCount).toBeGreaterThan(0);
    expect(libraryInfo.hasExpectedComponents).toBe(true);
  });

  test('should have properly positioned 3D components in scene', async ({ page }) => {
    // Wait for scene to be fully loaded
    await page.waitForFunction(() => typeof window.ahu3dInstance !== 'undefined', { timeout: 20000 });
    await page.waitForTimeout(5000); // Allow 3D rendering to complete
    
    // Check for loaded components in the AHU object
    const componentsInfo = await page.evaluate(() => {
      const ahu3d = window.ahu3dInstance;
      const ahuObject = ahu3d?.ahuObject;
      
      if (!ahuObject) return { hasComponents: false };
      
      // Check components property
      const components = ahu3d.components;
      const componentKeys = components ? Object.keys(components) : [];
      
      return {
        hasComponents: !!components,
        componentCount: componentKeys.length,
        hasAhuObject: !!ahuObject,
        ahuObjectId: ahuObject.id,
        componentSample: componentKeys.slice(0, 5) // First 5 components
      };
    });
    
    expect(componentsInfo.hasComponents).toBe(true);
    expect(componentsInfo.hasAhuObject).toBe(true);
    expect(componentsInfo.componentCount).toBeGreaterThan(0);
  });

  test('should handle scene viewport controls and interactions', async ({ page }) => {
    // Wait for full initialization
    await page.waitForFunction(() => typeof window.ahu3dInstance !== 'undefined', { timeout: 20000 });
    
    // Test that secondary viewport component is present
    const secondaryViewport = page.locator('div').filter({ hasText: /Secondary Viewport|Viewport/ }).first();
    
    // Instead of looking for specific ref attributes, look for common viewport controls
    // Check for presence of viewport control elements by testing common UI patterns
    const hasViewportControls = await page.evaluate(() => {
      // Look for common viewport control patterns in the DOM
      const buttons = document.querySelectorAll('button');
      const hasZoomControls = Array.from(buttons).some(btn => 
        btn.textContent?.includes('%') || 
        btn.textContent?.includes('zoom') ||
        btn.getAttribute('aria-label')?.includes('zoom')
      );
      
      // Look for viewport containers
      const hasViewports = document.querySelector('#primaryViewport') !== null;
      
      return {
        hasZoomControls,
        hasViewports,
        buttonCount: buttons.length
      };
    });
    
    expect(hasViewportControls.hasViewports).toBe(true);
    expect(hasViewportControls.buttonCount).toBeGreaterThan(5); // Should have multiple UI buttons
  });

  test('should load Xeto configuration and apply to 3D scene', async ({ page }) => {
    // Wait for initialization
    await page.waitForFunction(() => typeof window.ahu3dInstance !== 'undefined', { timeout: 20000 });
    
    // Click on Xeto tab first to ensure Xeto panel is visible
    await page.click('button:has-text("Xeto")');
    await page.waitForTimeout(1000);
    
    // Check that Xeto JSON content is present and populated
    // Look for textarea or text input that contains Xeto content
    const xetoContent = await page.evaluate(() => {
      // Look for text areas or inputs that might contain Xeto JSON
      const textareas = document.querySelectorAll('textarea');
      const inputs = document.querySelectorAll('input[type="text"]');
      
      let content = '';
      
      // Check textareas first
      for (const textarea of textareas) {
        const textareaEl = textarea as HTMLTextAreaElement;
        if (textareaEl.value && textareaEl.value.includes('novo.graphics')) {
          content = textareaEl.value;
          break;
        }
      }
      
      // If no content in textareas, check text inputs
      if (!content) {
        for (const input of inputs) {
          const inputEl = input as HTMLInputElement;
          if (inputEl.value && inputEl.value.includes('novo.graphics')) {
            content = inputEl.value;
            break;
          }
        }
      }
      
      return content;
    });
    
    // Verify Xeto content contains expected patterns
    expect(xetoContent).toContain('novo.graphics');
    
    // Verify Auto Load checkbox exists by looking for checkbox inputs
    const hasAutoLoadCheckbox = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      return Array.from(checkboxes).some(checkbox => {
        const label = checkbox.closest('label') || 
                     checkbox.parentElement?.querySelector('label') ||
                     document.querySelector(`label[for="${checkbox.id}"]`);
        return label?.textContent?.includes('Auto Load') || 
               checkbox.parentElement?.textContent?.includes('Auto Load');
      });
    });
    
    expect(hasAutoLoadCheckbox).toBe(true);
    
    // Verify Apply & Load button is present
    const applyButton = page.locator('button:has-text("Apply & Load")');
    await expect(applyButton).toBeVisible();
  });

  test('should maintain stable 3D scene after full initialization', async ({ page }) => {
    // Wait for complete initialization
    await page.waitForFunction(() => typeof window.ahu3dInstance !== 'undefined', { timeout: 20000 });
    await page.waitForTimeout(8000); // Allow full loading
    
    // Take initial snapshot of 3D state
    const initialState = await page.evaluate(() => {
      const ahu3d = window.ahu3dInstance;
      return {
        hasAhuObject: !!ahu3d?.ahuObject,
        hasSceneHelper: !!ahu3d?.sceneHelper,
        componentCount: ahu3d?.components ? Object.keys(ahu3d.components).length : 0,
        timestamp: Date.now()
      };
    });
    
    // Wait a bit more and verify state remains consistent
    await page.waitForTimeout(3000);
    
    const laterState = await page.evaluate(() => {
      const ahu3d = window.ahu3dInstance;
      return {
        hasAhuObject: !!ahu3d?.ahuObject,
        hasSceneHelper: !!ahu3d?.sceneHelper,
        componentCount: ahu3d?.components ? Object.keys(ahu3d.components).length : 0,
        timestamp: Date.now()
      };
    });
    
    // Verify 3D scene remains stable
    expect(laterState.hasAhuObject).toBe(initialState.hasAhuObject);
    expect(laterState.hasSceneHelper).toBe(initialState.hasSceneHelper);
    expect(laterState.componentCount).toBe(initialState.componentCount);
    expect(laterState.componentCount).toBeGreaterThan(0);
  });
});
