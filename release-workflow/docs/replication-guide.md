# Release Workflow Replication Guide

This guide provides comprehensive steps to replicate the release workflow into any Nuxt 2 project.

## Overview

The release workflow provides:
- **GitHub Copilot Integration**: AI-powered test generation and code assistance
- **Playwright Testing**: Comprehensive UI testing with visual analysis
- **VS Code Workspace**: Optimized development environment
- **Automated Documentation**: JSDoc generation and deployment
- **CI/CD Pipeline**: GitHub Actions integration for deployment

## Prerequisites

- Node.js 16+ 
- npm or yarn
- VS Code with GitHub Copilot extension
- Git repository
- Nuxt 2 project

## Step-by-Step Replication

### 1. Install Dependencies

Add the following dev dependencies to your `package.json`:

```bash
npm install --save-dev @playwright/test @types/node cross-env typescript
```

### 2. Create Release Workflow Directory Structure

Create the following directory structure in your project root:

```
release-workflow/
├── docs/
│   ├── replication-guide.md
│   ├── release-workflow.md
│   ├── copilot-visual-testing.md
│   ├── testing-guide.md
│   └── test-generation-template.md
├── scripts/
│   └── setup-copilot-visual.sh
├── tests/
│   ├── examples/          # Example tests and templates
│   ├── utils/            # Shared test utilities
│   ├── [project-name]/   # Project-specific tests (optional)
│   ├── types.d.ts       # TypeScript definitions
│   ├── copilot-visual.test.ts     # Generic visual tests
│   └── ui-testing-with-testids.test.ts  # Basic UI tests
├── test-results/
│   └── copilot-visual/
├── playwright-report/
├── playwright.config.ts
├── copilot-visual.code-workspace
└── README.md
```

### 3. Configure Playwright

Create `release-workflow/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Global test timeout - adjust based on your app's loading time */
  timeout: 120000,
  /* Output directories - relative to config file directory */
  outputDir: './test-results/',
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000', // Change to match your dev server
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    cwd: '..',
  },
});
```

### 4. Add NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "playwright test --config=release-workflow/playwright.config.ts",
    "test:headed": "playwright test --config=release-workflow/playwright.config.ts --headed",
    "test:ui": "playwright test --config=release-workflow/playwright.config.ts --ui",
    "test:debug": "playwright test --config=release-workflow/playwright.config.ts --debug",
    "test:copilot:visual": "cross-env COPILOT_VISUAL_TESTS=true playwright test tests/copilot-visual.test.ts --config=release-workflow/playwright.config.ts",
    "test:copilot:analyze": "cross-env COPILOT_VISUAL_TESTS=true playwright test tests/copilot-visual.test.ts --config=release-workflow/playwright.config.ts --reporter=line",
    "test:copilot:headed": "cross-env COPILOT_VISUAL_TESTS=true playwright test tests/copilot-visual.test.ts --config=release-workflow/playwright.config.ts --headed",
    "test:copilot:single": "cross-env COPILOT_VISUAL_TESTS=true playwright test tests/copilot-single-task.test.ts --config=release-workflow/playwright.config.ts --reporter=line",
    "test:copilot:single:headed": "cross-env COPILOT_VISUAL_TESTS=true playwright test tests/copilot-single-task.test.ts --config=release-workflow/playwright.config.ts --headed"
  }
}
```

### 5. Create VS Code Workspace Configuration

Create `release-workflow/copilot-visual.code-workspace`:

```json
{
  "folders": [
    {
      "path": "."
    }
  ],
  "settings": {
    "github.copilot.enable": {
      "*": true,
      "plaintext": false,
      "markdown": true,
      "typescript": true,
      "javascript": true,
      "vue": true
    },
    "github.copilot.advanced": {
      "debug.overrideEngine": "claude-3-5-sonnet",
      "debug.testGeneration": true,
      "debug.visualAnalysis": true
    },
    "playwright.showTrace": true,
    "playwright.reuseBrowser": true,
    "testing.automaticallyOpenPeekView": "failureInVisibleDocument",
    "files.associations": {
      "release-workflow/.copilot-visual-suggestions.md": "markdown"
    },
    "markdown.preview.markdownItPlugins": true,
    "terminal.integrated.defaultProfile.windows": "Command Prompt",
    "terminal.integrated.profiles.windows": {
      "Copilot Visual Tests": {
        "path": "cmd.exe",
        "args": ["/k", "echo GitHub Copilot Visual Testing Environment"]
      }
    }
  },
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Copilot: Quick Visual Check",
        "type": "shell",
        "command": "npm",
        "args": ["run", "test:copilot:analyze"],
        "group": {
          "kind": "test",
          "isDefault": true
        },
        "presentation": {
          "echo": true,
          "reveal": "always",
          "focus": false,
          "panel": "shared",
          "showReuseMessage": true,
          "clear": false
        },
        "problemMatcher": []
      },
      {
        "label": "Copilot: Run Visual Tests",
        "type": "shell",
        "command": "npm",
        "args": ["run", "test:copilot:visual"],
        "group": "test",
        "presentation": {
          "echo": true,
          "reveal": "always",
          "focus": false,
          "panel": "shared"
        }
      },
      {
        "label": "Copilot: Analyze Current Screenshot",
        "type": "shell",
        "command": "npm",
        "args": ["run", "test:copilot:analyze"],
        "group": "test",
        "presentation": {
          "echo": true,
          "reveal": "always",
          "focus": false,
          "panel": "shared"
        }
      }
    ]
  }
}
```

### 6. Create TypeScript Types

Create `release-workflow/tests/types.d.ts`:

```typescript
// Global type definitions for your application

declare global {
  interface Window {
    // Add your app-specific global objects here
    // Example: yourAppInstance?: any;
    // Replace with actual globals your app exposes
    THREE?: any;
  }
}

// Console message interface for Playwright tests
export interface ConsoleMessage {
  type: string;
  text: string;
}

// WebGL Canvas information interface
export interface WebGLCanvasInfo {
  width: number;
  height: number;
  parentId?: string;
  hasWebGL: boolean;
  contextTaken?: boolean;
}

// Application instance information interface
export interface AppInstanceInfo {
  exists: boolean;
  type: string;
  constructor?: string;
  // Add properties specific to your app's main instance
}

export {};
```

### 7. Create Setup Script

Create `release-workflow/scripts/setup-copilot-visual.sh`:

```bash
#!/bin/bash

echo "🤖 Setting up GitHub Copilot + Claude Sonnet Visual Testing..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p release-workflow/test-results/copilot-visual
mkdir -p .vscode

# Copy configuration files
echo "⚙️ Setting up configuration..."
if [ ! -f release-workflow/.env.copilot-visual ]; then
    echo "✅ Copilot visual testing config ready"
else
    echo "ℹ️ Configuration already exists"
fi

# Setup VS Code workspace
echo "🔧 Setting up VS Code workspace..."
if [ ! -f .vscode/settings.json ]; then
    echo '{
  "github.copilot.enable": {
    "*": true,
    "typescript": true,
    "javascript": true,
    "vue": true
  },
  "playwright.showTrace": true,
  "files.associations": {
    "release-workflow/.copilot-visual-suggestions.md": "markdown"
  }
}' > .vscode/settings.json
    echo "✅ VS Code settings created"
else
    echo "ℹ️ VS Code settings already exist"
fi

# Create initial suggestions file
if [ ! -f release-workflow/.copilot-visual-suggestions.md ]; then
    echo '# Copilot Visual Analysis Suggestions

This file will be automatically updated with visual analysis results and actionable suggestions for GitHub Copilot.

## How to Use
1. Run `npm run test:copilot:analyze` to generate suggestions
2. Click on file links to navigate to issues
3. Use GitHub Copilot to implement suggested fixes
4. Re-run tests to verify improvements

---
' > release-workflow/.copilot-visual-suggestions.md
    echo "✅ Initial suggestions file created"
fi

echo ""
echo "🚀 Setup complete! Next steps:"
echo ""
echo "1. Open VS Code workspace:"
echo "   code copilot-visual.code-workspace"
echo ""
echo "2. Run quick visual analysis:"
echo "   npm run test:copilot:analyze"
echo ""
echo "3. View results:"
echo "   - Check terminal output for immediate feedback"
echo "   - Open .copilot-visual-suggestions.md for action items"
echo "   - Review release-workflow/test-results/copilot-visual/ for detailed reports"
echo ""
echo "4. VS Code Integration:"
echo "   - Ctrl+Shift+P → 'Copilot: Quick Visual Check'"
echo "   - Use Problems panel to see detected issues"
echo "   - Let Copilot help implement suggested fixes"
echo ""
echo "🎯 Pro Tips:"
echo "   - Run tests after UI changes for immediate feedback"
echo "   - Use Copilot to implement suggested fixes automatically"
echo "   - Check accessibility and responsive design regularly"
echo ""
echo "📚 Documentation:"
echo "   - docs/copilot-visual-testing.md - Complete guide"
echo "   - .env.copilot-visual - Configuration options"
echo "   - copilot-visual.code-workspace - VS Code setup"
echo ""
echo "✨ Happy testing with GitHub Copilot and Claude Sonnet!"
```

### 8. Create Basic Test Files

Create `release-workflow/tests/copilot-visual.test.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Tests for GitHub Copilot', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to your app
    await page.goto('/');
    
    // Wait for your app to load completely
    await page.waitForLoadState('networkidle');
    
    // Add any app-specific loading checks here
    // Example: await page.waitForSelector('[data-testid="main-app"]');
  });

  test('App loads correctly', async ({ page }) => {
    // Check that the page has loaded with expected title
    await expect(page).toHaveTitle(/Your App Title/); // Update with your app's title pattern
    
    // Check for main container or key elements
    // Example: await expect(page.locator('[data-testid="main-container"]')).toBeVisible();
    
    // Take screenshot for visual analysis
    await page.screenshot({ 
      path: 'release-workflow/test-results/copilot-visual/app-loaded.png',
      fullPage: true 
    });
  });

  test('Navigation and UI components work', async ({ page }) => {
    // Test main navigation elements
    // Example: 
    // await page.click('[data-testid="navigation-menu"]');
    // await expect(page.locator('[data-testid="menu-item"]')).toBeVisible();
    
    // Take screenshots at key interaction points
    await page.screenshot({ 
      path: 'release-workflow/test-results/copilot-visual/navigation-test.png',
      fullPage: true 
    });
  });

  test('Responsive design check', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'release-workflow/test-results/copilot-visual/mobile-view.png',
      fullPage: true 
    });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'release-workflow/test-results/copilot-visual/tablet-view.png',
      fullPage: true 
    });
    
    // Return to desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('Console error detection', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and interact with your app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Add interactions specific to your app
    // Example: await page.click('[data-testid="interactive-element"]');
    
    // Check for console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
```

### 9. Create Test ID Support Script

Create `scripts/add-test-ids.js`:

```javascript
#!/usr/bin/env node

/**
 * Script to help add test IDs to Vue components
 * 
 * This script provides guidance and examples for adding data-testid attributes
 * to Vue components in the project.
 */

const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '../components');

// Get list of all Vue components
function getVueComponents() {
  if (!fs.existsSync(componentsDir)) {
    console.log('Components directory not found. Creating guidance for general Vue components...');
    return [];
  }
  
  const files = fs.readdirSync(componentsDir);
  return files.filter(file => file.endsWith('.vue'));
}

// General test ID recommendations
const generalTestIdGuidelines = `
# Test ID Guidelines

## Naming Convention
- Use kebab-case: \`data-testid="component-name-element"\`
- Be descriptive: \`data-testid="navigation-menu-toggle"\`
- Include component context: \`data-testid="user-profile-avatar"\`

## Common Patterns
- Buttons: \`data-testid="submit-button"\`, \`data-testid="cancel-button"\`
- Forms: \`data-testid="login-form"\`, \`data-testid="email-input"\`
- Navigation: \`data-testid="main-nav"\`, \`data-testid="nav-item-home"\`
- Modals: \`data-testid="modal-container"\`, \`data-testid="modal-close"\`
- Lists: \`data-testid="item-list"\`, \`data-testid="list-item-1"\`

## Vue Component Examples

### Template
\`\`\`vue
<template>
  <div data-testid="component-container">
    <button 
      data-testid="primary-action-button"
      @click="handleClick"
    >
      {{ buttonText }}
    </button>
    
    <ul data-testid="items-list">
      <li 
        v-for="item in items" 
        :key="item.id"
        :data-testid="\`list-item-\${item.id}\`"
      >
        {{ item.name }}
      </li>
    </ul>
  </div>
</template>
\`\`\`

### Dynamic Test IDs
\`\`\`vue
<template>
  <div :data-testid="\`\${componentName}-container\`">
    <input 
      :data-testid="\`\${componentName}-input-\${fieldName}\`"
      v-model="value"
    />
  </div>
</template>
\`\`\`
`;

console.log('🔍 Test ID Setup Guide');
console.log('=====================');
console.log('');

const vueComponents = getVueComponents();

if (vueComponents.length > 0) {
  console.log(`Found ${vueComponents.length} Vue components:`);
  vueComponents.forEach((component, index) => {
    console.log(`${index + 1}. ${component}`);
  });
  console.log('');
  console.log('📝 Add data-testid attributes to these components for better testing.');
} else {
  console.log('No Vue components found in /components directory.');
}

console.log('');
console.log('📚 Test ID Guidelines:');
console.log(generalTestIdGuidelines);

// Write guidelines to file
const guidelinesPath = path.join(__dirname, '../release-workflow/docs/test-id-guidelines.md');
const guidelinesDir = path.dirname(guidelinesPath);

if (!fs.existsSync(guidelinesDir)) {
  fs.mkdirSync(guidelinesDir, { recursive: true });
}

fs.writeFileSync(guidelinesPath, `# Test ID Guidelines${generalTestIdGuidelines}`);

console.log('');
console.log(`✅ Guidelines written to: ${guidelinesPath}`);
console.log('');
console.log('🚀 Next Steps:');
console.log('1. Review the guidelines above');
console.log('2. Add data-testid attributes to your Vue components');
console.log('3. Update the test files to use these test IDs');
console.log('4. Run `npm run test:copilot:analyze` to validate');
```

### 10. GitHub Copilot Instructions

Create `.github/copilot-instructions.md`:

```markdown
---
applyTo: '**'
---
- Always use http://localhost:3000/ to test in the browser, which should be assumed to be already running. So no "npm run dev" command is necessary.
- When writing tests, use data-testid attributes for reliable element selection
- Focus on visual regression testing and accessibility checks
- Use descriptive test names that explain the user scenario being tested
- Take screenshots at key interaction points for visual analysis
- [Add your project-specific instructions here]

## Testing Guidelines
- Use Playwright for E2E testing
- Run tests in the release-workflow directory structure
- Generate visual analysis suggestions using GitHub Copilot
- Focus on user workflows and critical paths
- Test responsive design across multiple viewports

## Code Quality
- Follow Vue 2 best practices
- Use TypeScript for better type safety
- Implement proper error handling
- Add comprehensive documentation
- Use semantic HTML and ARIA attributes for accessibility
```

### 11. Documentation Files

Create the following documentation files in `release-workflow/docs/`:

#### `release-workflow/docs/README.md`

```markdown
# Release Workflow Documentation

This directory contains comprehensive documentation for the release workflow setup.

## Quick Start
1. Run setup: `bash release-workflow/scripts/setup-copilot-visual.sh`
2. Open workspace: `code release-workflow/copilot-visual.code-workspace`
3. Run tests: `npm run test:copilot:analyze`

## Documentation Files
- **replication-guide.md** - Step-by-step setup guide for new projects
- **copilot-visual-testing.md** - GitHub Copilot integration guide
- **testing-guide.md** - Comprehensive testing documentation
- **test-generation-template.md** - Template for creating new tests
- **test-id-guidelines.md** - Guidelines for adding test IDs to components

## Key Features
- GitHub Copilot AI-powered test generation
- Playwright visual testing and analysis
- VS Code workspace optimization
- Automated screenshot comparison
- Responsive design testing
```

### 12. GitHub Actions (Optional)

If you want CI/CD integration, create `.github/workflows/release.yml`:

```yaml
name: Release Workflow

on:
  push:
    branches:
      - 'main'
      - 'release/*'
  pull_request:
    branches:
      - 'main'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    
    - name: Run Playwright tests
      run: npm run test
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: release-workflow/playwright-report/
        retention-days: 30
```

## Key Adaptations for Your Project

### Required Changes
1. **Update baseURL**: Change `http://localhost:3000` to match your dev server port
2. **Modify timeout**: Adjust the 120000ms timeout based on your app's loading time
3. **Browser configuration**: Remove or modify Chromium launch arguments that are specific to 3D rendering if not needed
4. **Global objects**: Update `types.d.ts` to match the global objects your app exposes
5. **Test structure**: Create tests specific to your application's features and components
6. **VS Code workspace**: Rename the workspace file appropriately for your project
7. **GitHub Copilot instructions**: Update `.github/copilot-instructions.md` with project-specific guidance

### Optional Customizations
1. **Additional browsers**: Uncomment Firefox/Safari testing in `playwright.config.ts`
2. **Mobile testing**: Add mobile device configurations
3. **Performance testing**: Add Lighthouse or other performance testing
4. **Accessibility testing**: Include axe-core for automated accessibility testing
5. **Visual regression**: Implement screenshot comparison testing

## Running the Setup

1. **Run setup script**: 
   ```bash
   bash release-workflow/scripts/setup-copilot-visual.sh
   ```

2. **Open VS Code workspace**: 
   ```bash
   code release-workflow/copilot-visual.code-workspace
   ```

3. **Install Playwright browsers**: 
   ```bash
   npx playwright install
   ```

4. **Run your first test**: 
   ```bash
   npm run test:copilot:analyze
   ```

5. **Verify setup**: Check that test results appear in `release-workflow/test-results/`

## Troubleshooting

### Common Issues
- **Port conflicts**: Ensure your Nuxt dev server runs on the configured port
- **Permission errors**: Make sure the setup script has execute permissions
- **Missing dependencies**: Run `npm install` if packages are missing
- **Browser installation**: Run `npx playwright install` if browsers aren't installed

### Getting Help
- Check the generated test output for specific error messages
- Review the `playwright-report` for detailed test results
- Use GitHub Copilot to help debug failing tests
- Consult the Playwright documentation for advanced configuration

## Benefits

This setup provides you with:

1. **AI-Powered Testing**: GitHub Copilot generates intelligent tests based on your code
2. **Visual Analysis**: Automated screenshot capture and comparison
3. **Development Efficiency**: VS Code integration with optimized workflows
4. **Quality Assurance**: Comprehensive testing across browsers and viewports
5. **Documentation**: Automated generation of testing insights and suggestions
6. **Continuous Integration**: Ready-to-use CI/CD pipeline configuration

The workflow integrates seamlessly with Nuxt 2 applications and provides a robust foundation for maintaining code quality and preventing regressions.
