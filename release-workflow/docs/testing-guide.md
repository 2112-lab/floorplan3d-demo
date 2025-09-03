# Project - Playwright Testing Guide

This guide provides comprehensive information about the test IDs and selectors available for Playwright testing in the Project application.

## Test ID Strategy

We use `data-testid` attributes for reliable element identification in tests. The naming convention follows a hierarchical pattern:

```
[section]-[component]-[element]
```

## Main Application Test IDs

### Navigation and Layout
- `app-container` - Main application container
- `main-navigation-bar` - Top navigation bar
- `app-title` - Application title container
- `app-title-link` - Home page link
- `app-title-text` - "Project" text
- `navigation-buttons-container` - Container for mode buttons
- `nav-button-xeto` - Xeto mode button
- `nav-button-component` - Component mode button
- `nav-button-wiring` - Wiring mode button
- `nav-button-scene` - Scene mode button
- `nav-button-code` - Code mode button
- `nav-button-test` - Test mode button

### Content Areas
- `main-content-area` - Main content container
- `primary-viewport-area` - Left side viewport area
- `primary-3d-viewport` - Primary 3D scene container
- `secondary-konva-container` - Secondary 2D canvas container
- `primary-konva-container` - Primary Konva canvas
- `wiring-viewport` - Wiring mode viewport
- `wiring-table-container` - Wiring table container
- `wiring-diagram-container` - Wiring diagram container

### Bottom Panels (Mode-specific)
- `bottom-panel` - Bottom toolbar container
- `component-mode-panel` - Component mode controls
- `wiring-mode-panel` - Wiring mode controls
- `xeto-mode-panel` - Xeto mode controls
- `code-mode-panel` - Code mode controls
- `test-mode-panel` - Test mode controls

### Component Specific Containers
- `xeto-generator-container` - Xeto generator component
- `testing-diagram-container` - Testing diagram component

### Code Mode Buttons
- `send-post-request-btn` - Send POST request button
- `reset-scene-btn` - Reset scene button

### Right Drawer
- `right-drawer` - Right sidebar container
- `xeto-json-drawer` - Xeto JSON editor drawer
- `component-library-drawer` - Component library drawer
- `scene-drawer` - Scene configuration drawer
- `code-drawer` - Code output drawer
- `test-drawer` - Test mode drawer

### Drawer Elements
- `xeto-json-title` - "Xeto JSON" title
- `apply-load-btn` - Apply & Load button
- `xeto-json-textarea` - Xeto JSON text editor
- `library-json-title` - "Library JSON" title
- `library-json-textarea` - Library JSON text area
- `ahu-object-title` - "AHU Object" title
- `ahu-object-textarea` - AHU object display area

### Viewport Controls
- `secondary-viewport-controls` - Secondary viewport controls
- `wiring-viewport-controls` - Wiring viewport controls
- `blueprint-export-window` - Blueprint export modal

## Component Panel Test IDs

### Component Evaluation Section
- `component-panel` - Main component panel container
- `component-panel-col-1` - First column
- `component-evaluation-section` - Component evaluation container
- `component-evaluation-label` - "Component Evaluation:" label
- `library-item-select-container` - Select dropdown container
- `library-item-select` - Component library dropdown
- `component-size-radio-group` - Size selection radio group
- `size-small-radio` - Small size radio button
- `size-medium-radio` - Medium size radio button
- `size-large-radio` - Large size radio button
- `load-component-btn` - Load component button

## Example Playwright Test Usage

### Basic Navigation Test
```typescript
import { test, expect } from '@playwright/test';

test('should navigate between modes', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Wait for app to load
  await page.waitForSelector('[data-testid="app-container"]');
  
  // Click Xeto mode
  await page.click('[data-testid="nav-button-xeto"]');
  await expect(page.locator('[data-testid="xeto-mode-panel"]')).toBeVisible();
  
  // Click Component mode
  await page.click('[data-testid="nav-button-component"]');
  await expect(page.locator('[data-testid="component-mode-panel"]')).toBeVisible();
  
  // Verify component panel is present
  await expect(page.locator('[data-testid="component-panel"]')).toBeVisible();
});
```

### Component Interaction Test
```typescript
test('should load a component', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Navigate to Component mode
  await page.click('[data-testid="nav-button-component"]');
  
  // Select a component from library
  await page.click('[data-testid="library-item-select"]');
  await page.click('text=Fan');
  
  // Select size
  await page.click('[data-testid="size-large-radio"]');
  
  // Load the component
  await page.click('[data-testid="load-component-btn"]');
  
  // Verify component is loaded in 3D viewport
  await expect(page.locator('[data-testid="primary-3d-viewport"]')).toBeVisible();
});
```

### Xeto JSON Test
```typescript
test('should modify and apply Xeto JSON', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Navigate to Xeto mode
  await page.click('[data-testid="nav-button-xeto"]');
  
  // Verify Xeto drawer is visible
  await expect(page.locator('[data-testid="xeto-json-drawer"]')).toBeVisible();
  
  // Modify JSON content
  const textarea = page.locator('[data-testid="xeto-json-textarea"]');
  await textarea.click();
  // ... modify JSON content
  
  // Apply changes
  await page.click('[data-testid="apply-load-btn"]');
});
```

### Wiring Mode Test
```typescript
test('should switch to wiring mode and view diagram', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Navigate to Wiring mode
  await page.click('[data-testid="nav-button-wiring"]');
  
  // Verify wiring panel is visible
  await expect(page.locator('[data-testid="wiring-mode-panel"]')).toBeVisible();
  
  // Check for wiring controls (these would need to be added to WiringPanel.vue)
  await expect(page.locator('[data-testid="wiring-viewport-controls"]')).toBeVisible();
});
```

## Best Practices for Testing

### 1. Use Specific Selectors
Always prefer `data-testid` selectors over CSS classes or element types:
```typescript
// Good
await page.click('[data-testid="nav-button-xeto"]');

// Avoid
await page.click('.mx-1:has-text("Xeto")');
```

### 2. Wait for Elements
Always wait for elements to be available before interacting:
```typescript
await page.waitForSelector('[data-testid="app-container"]');
await page.click('[data-testid="nav-button-component"]');
```

### 3. Test State Changes
Verify that mode changes actually affect the UI:
```typescript
await page.click('[data-testid="nav-button-xeto"]');
await expect(page.locator('[data-testid="xeto-mode-panel"]')).toBeVisible();
await expect(page.locator('[data-testid="component-mode-panel"]')).not.toBeVisible();
```

### 4. Test 3D Scene Loading
For 3D-related tests, add appropriate waits:
```typescript
// Wait for 3D scene to initialize
await page.waitForTimeout(3000);
// Check for WebGL canvas
const canvas = page.locator('[data-testid="primary-3d-viewport"] canvas');
await expect(canvas).toBeVisible();
```

## Adding Test IDs to Components

When adding test IDs to new components, follow these guidelines:

### 1. Component Root
Always add a test ID to the component's root element:
```vue
<template>
  <div data-testid="my-component">
    <!-- component content -->
  </div>
</template>
```

### 2. Interactive Elements
Add test IDs to all interactive elements:
```vue
<v-btn @click="doSomething" data-testid="action-button">
  Click Me
</v-btn>

<v-select 
  v-model="selected"
  :items="items"
  data-testid="item-selector"
/>
```

### 3. Form Elements
Add test IDs to form inputs and their containers:
```vue
<v-text-field
  v-model="inputValue"
  label="Enter Value"
  data-testid="value-input"
/>
```

### 4. Dynamic Elements
For dynamic elements, use descriptive patterns:
```vue
<v-btn 
  v-for="item in items"
  :key="item.id"
  :data-testid="`item-button-${item.id}`"
  @click="selectItem(item)"
>
  {{ item.name }}
</v-btn>
```

## Common Test Patterns

### Mode Switching
```typescript
const switchToMode = async (mode: string) => {
  await page.click(`[data-testid="nav-button-${mode}"]`);
  await expect(page.locator(`[data-testid="${mode}-mode-panel"]`)).toBeVisible();
};
```

### 3D Scene Interaction
```typescript
const wait3DScene = async () => {
  await page.waitForSelector('[data-testid="primary-3d-viewport"]');
  await page.waitForTimeout(3000); // Allow 3D scene to initialize
};
```

### JSON Validation
```typescript
const validateJSON = async (testId: string, expectedKeys: string[]) => {
  const textarea = page.locator(`[data-testid="${testId}"]`);
  const content = await textarea.inputValue();
  const json = JSON.parse(content);
  
  for (const key of expectedKeys) {
    expect(json).toHaveProperty(key);
  }
};
```

This testing guide provides a solid foundation for creating comprehensive Playwright tests for the Project application.
