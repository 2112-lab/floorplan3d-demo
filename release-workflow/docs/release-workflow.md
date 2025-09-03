# Release Workflow

## Overview

This document describes the automated workflow for releasing new features and bug fixes. The workflow ensures quality through automated testing and maintains up-to-date documentation.

## Workflow Architecture

```
Local Development → GitHub MCP Commit Analysis → Automated Test Generation → Local Playwright Testing → Push Version Branch → GitHub Actions (Docs + Deployment) → Hosting Platform Deployment
```

## Tools Integration

### 1. GitHub Copilot with Claude
- **Role**: Code assistance and test generation
- **Usage**: Generate Playwright test cases for new features/bug fixes
- **Integration**: VS Code extension for real-time assistance

### 2. GitHub MCP (Model Context Protocol)
- **Role**: Automated commit analysis and test determination
- **Usage**: Analyze latest commits from project repositories
- **Integration**: Reads commit messages, changed files, and PR descriptions to determine test scope
- **Automation**: Eliminates manual staging analysis for more reliable test generation

### 3. Playwright + Playwright MCP Server
- **Role**: Local UI testing before deployment
- **Usage**: Run comprehensive tests in VS Code locally
- **Integration**: Tests run against `http://localhost:3000`
- **Location**: Tests stored in `/tests` directory

### 4. GitHub Actions
- **Role**: Documentation generation and deployment pipeline
- **Usage**: Documentation generation and deployment coordination
- **Triggers**: Push to version branches, tag creation

### 5. Hosting Platform
- **Role**: Frontend hosting and deployment
- **Usage**: Deploy application
- **Integration**: Connected to GitHub for automatic deployments

### 6. Documentation Generation
- **Role**: API documentation generation
- **Usage**: Generate docs from source code
- **Location**: Project-specific documentation directory
- **Output**: HTML documentation files

### 7. File Storage
- **Role**: Documentation hosting
- **Usage**: Store and serve documentation

## Detailed Workflow Steps

### Local Module Development Notes

Project-specific modules can be included in the repository for local development purposes:

- **Development Mode**: When development environment variables are set (e.g., `LOCAL_DEV=true`), the app uses local modules instead of published packages
- **Module Resolution**: Development mode points to local source files for immediate changes
- **Documentation**: Changes to local modules are used for documentation generation

### Phase 1: Local Development & Testing

#### 1.1 Version Branch Development
```bash
# 1. Create version-based deployment branch
git checkout -b project-{new-version}  # e.g., project-0-05-07
# Examples:
# git checkout -b project-0-05-07
# git checkout -b project-1-00-01
# git checkout -b project-2-01-03

# 2. Develop features in version branch
# - Make changes to components, pages, or local modules
# - Use development environment variables for local module development
# - All changes are committed to this deployment branch
# - This branch represents a deployable version, not a feature to merge

# 3. Generate tests with GitHub MCP + GitHub Copilot
# - GitHub MCP analyzes latest commits from both repos automatically
# - Claude generates Playwright test cases based on commit analysis
# - Focus on critical user journeys and feature-specific tests
```

#### 1.2 Automated Test Generation with GitHub MCP
```bash
# 1. Start the development server
npm run dev  # Runs on http://localhost:3000

# 2. Use GitHub MCP to analyze recent commits
# - MCP reads latest commits from project repositories
# - Analyzes commit messages, changed files, and PR descriptions
# - Determines test scope based on actual changes made

# 3. Generate targeted tests based on commit analysis:
# MCP identifies changes and suggests test coverage for:
# - New Vue components added/modified
# - Module API changes
# - UI interaction modifications
# - Data flow and integration updates
# - Application functionality changes

# 4. Claude generates Playwright tests based on MCP analysis
# - Tests are created for specific functionality identified by commits
# - No manual staging required - analysis is automated
# - Tests target actual changes made, not speculative staging

# 5. Use the standardized test generation template
# - Copy the template from docs/test-generation-template.md
# - Replace placeholders with your specific information
# - Send the complete prompt to GitHub Copilot
# - Template includes all necessary MCP analysis and test generation instructions
```

#### 1.3 Local Playwright Testing (Required Before Push)
```bash
# 1. Development server should already be running from step 1.2.1
# npm run dev  # Already running on http://localhost:3000

# 2. Run Playwright tests locally in VS Code - MUST PASS BEFORE PUSH
# - Use Playwright extension
# - Run ONLY the new tests generated from GitHub MCP analysis
# - ALWAYS use --headed parameter for visual feedback
# - New tests must pass before pushing to main

# 3. Test only new tests generated from MCP commit analysis:
npx playwright test new-feature.test.ts --headed    # Only test the newly generated test file

# 4. DO NOT run all tests - only test the new functionality
# Focus testing on the specific changes identified by MCP analysis

# 5. Only proceed to push if new tests pass
```

#### 1.4 Test Design Principles
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

### Phase 2: Push Version Branch

#### 2.1 Push Version Branch (After Local Testing)
```bash
# 1. Ensure new tests pass locally first (using --headed)
npx playwright test [new-test-file.test.ts] --headed

# 2. Only proceed if new tests pass - commit changes
git add .
git commit -m "feat: add new feature description"

# 3. Push version branch for deployment
git push origin project-0-05-07  # Push version branch
# Examples:
# git push origin project-0-05-07
# git push origin project-1-00-01
# git push origin project-2-01-03

# 4. This triggers automated documentation workflow and deployment
# Note: These are deployment branches, not branches that merge to main
```

### Phase 3: Automated Documentation Generation

#### 3.1 Automated Documentation Workflow
```bash
# Push version branch automatically triggers GitHub Actions documentation workflow
```

#### 3.2 GitHub Actions Documentation Workflow
GitHub Actions workflow (`.github/workflows/docs-deploy.yml`):
```yaml
name: Generate Docs & Deploy
on:
  push:
    branches: ['project-*']  # Trigger on push to version branches
  workflow_dispatch:

jobs:
  docs-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      # Install dependencies for local module directory
      - name: Install module dependencies
        run: |
          cd module
          npm ci
      
      # Generate API documentation with JSDoc
      - name: Generate JSDoc documentation
        run: |
          cd module
          
          # Extract version from package.json
          VERSION=$(node -p "require('./package.json').version")
          TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
          
          # Generate docs with version and timestamp
          npm run docs
          
          # Add version and timestamp to index.html
          sed -i "s/<title>/<title>MODULE API v$VERSION - Generated $TIMESTAMP | /g" docs/index.html
          
          # Create a version info file
          echo "{\"version\":\"$VERSION\",\"generated\":\"$TIMESTAMP\",\"commit\":\"${{ github.sha }}\"}" > docs/version.json
      
      # Configure AWS credentials
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      # Upload documentation to S3
      - name: Upload docs to S3
        run: |
          aws s3 sync module/docs/ s3://module-api-docs/ --delete
          aws s3 cp s3://module-api-docs/index.html s3://module-api-docs/index.html --metadata-directive REPLACE --cache-control "no-cache"
      
      # Notify completion
      - name: Documentation deployment notification
        run: |
          echo "📚 Documentation generated and uploaded to S3"
          echo "🚀 AWS Amplify will deploy version branch: ${{ github.ref_name }}"
```

### Phase 4: Documentation Management

#### 4.1 API Documentation Structure
```
s3://module-api-docs/
├── index.html                    # Main documentation page (with version info)
├── version.json                  # Version and generation metadata
├── module-Module-API.html        # API reference
├── module-Module-API-ModuleAPI.html
├── styles/
│   ├── jsdoc.css
│   └── prettify.css
├── scripts/
│   ├── nav.js
│   ├── search.js
│   └── prettify/
└── fonts/
    ├── Montserrat/
    └── Source-Sans-Pro/
```

#### 4.1.1 Version Information
The documentation includes:
- **Module Version**: Extracted from `module/package.json`
- **Generation Timestamp**: UTC timestamp when docs were generated
- **Git Commit Hash**: GitHub SHA of the commit that triggered generation
- **Version JSON**: Machine-readable version info at `/version.json`

#### 4.2 Documentation Versioning
- **Version Branches**: Each `project-{version}` branch generates its own documentation
- **Versioned**: Documentation tagged with branch version (0.5.7, 1.0.1, etc.)
- **Archive**: Previous version documentation maintained for reference
- **Version Tracking**: Each documentation build includes:
  - Module version from package.json
  - Branch version from branch name
  - Generation timestamp (UTC)
  - Git commit hash for traceability
  - Version.json file for programmatic access

#### 4.3 S3 Configuration
```json
{
  "bucket": "module-api-docs",
  "region": "us-east-1",
  "publicRead": true,
  "website": {
    "indexDocument": "index.html",
    "errorDocument": "error.html"
  },
  "cors": [
    {
      "allowedOrigins": ["*"],
      "allowedMethods": ["GET"],
      "allowedHeaders": ["*"]
    }
  ]
}
```

## Test Strategy

### Test Categories

#### 1. Core Functionality Tests
```javascript
// Example: 3D Scene Loading
test('should load 3D scene successfully', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('[data-testid="primary-3d-viewport"]');
  
  // Verify Module instance is created
  const moduleExists = await page.evaluate(() => window.moduleInstance !== undefined);
  expect(moduleExists).toBeTruthy();
});
```

#### 2. UI Interaction Tests
```javascript
// Example: Navigation between modes
test('should switch between sandbox modes', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Test Xeto mode
  await page.click('[data-testid="nav-button-xeto"]');
  await expect(page.locator('[data-testid="xeto-mode-panel"]')).toBeVisible();
  
  // Test Component mode
  await page.click('[data-testid="nav-button-component"]');
  await expect(page.locator('[data-testid="component-mode-panel"]')).toBeVisible();
});
```

#### 3. Feature-Specific Tests
```javascript
// Example: Component loading
test('should load component from library', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('[data-testid="nav-button-component"]');
  
  // Wait for component panel to load
  await page.waitForSelector('[data-testid="component-library-drawer"]');
  
  // Select and load a component
  await page.selectOption('select[data-testid="component-selector"]', 'Fan');
  await page.click('[data-testid="load-component-button"]');
  
  // Verify component loaded in 3D scene
  const componentLoaded = await page.evaluate(() => {
    return window.moduleInstance.sceneHelper.scene.children.length > 0;
  });
  expect(componentLoaded).toBeTruthy();
});
```

#### 4. Optional: Copilot Visual Quality Assurance
The Copilot visual testing workflow can be used as an alternative or complement to traditional functional testing:

```bash
# AI-powered visual analysis for UI changes
npm run test:copilot:analyze

# Comprehensive visual testing with screenshots
npm run test:copilot:visual --headed
```

**Benefits of Copilot Visual Testing:**
- **Automated UI/UX analysis**: Claude Sonnet 4 examines screenshots for visual issues
- **3D rendering quality**: WebGL performance and visual quality assessment
- **VS Code integration**: Results appear directly in Problems panel with file references

**When to Use:**
- After UI/component modifications identified by GitHub MCP analysis
- During 3D rendering or visualization updates
- As a quick quality check during iterative development

See the "Optional: Copilot Visual Testing Workflow" section for detailed integration guidance.

### Test Data Management
```javascript
// Use consistent test data
const testData = {
  xeto: require('../static/mock-data/xeto/sensor-prototype-2.json'),
  components: ['Fan', 'Damper', 'CoolingCoil'],
  viewportSizes: {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 1024, height: 768 }
  }
};
```

## Optional: Copilot Visual Testing Workflow

### AI-Powered Visual Quality Assurance

As an alternative or complementary testing strategy, this workflow leverages GitHub Copilot with Claude Sonnet 4's advanced image analysis capabilities to detect UI bugs and UX problems through automated visual analysis.

#### When to Use Copilot Visual Testing
- **UI-heavy changes**: When commits involve significant visual or interaction modifications
- **3D rendering updates**: When changes affect Three.js visualization or WebGL performance
- **UX iteration**: During design review cycles and user experience optimization

#### Quick Copilot Visual Analysis
```bash
# 1. Quick visual check after UI changes
npm run test:copilot:analyze

# 2. Comprehensive analysis with screenshots
npm run test:copilot:visual --headed

# 3. Interactive debugging mode
npm run test:copilot:headed

# 4. Single custom task testing
npm run test:copilot:single

# 5. Single custom task with visual debugging
npm run test:copilot:single:headed
```

#### Copilot Visual Testing Commands Comparison

| Command | Purpose | Speed | Output | Best Use Case |
|---------|---------|--------|--------|---------------|
| `npm run test:copilot:analyze` | **Comprehensive visual testing** with automated screenshot suite | ⚡ **Fastest** (~30 seconds) | Markdown report with actionable insights | Quick comprehensive checks after code changes, automated UI validation |
| `npm run test:copilot:visual --headed` | **Comprehensive visual testing** with full screenshot suite + browser visibility | 🐌 **Slowest** (~3-5 minutes) | Complete visual test report + screenshot gallery | Thorough quality assurance before releases, debugging with visual feedback |
| `npm run test:copilot:headed` | **Interactive debugging** with visual browser session | ⚖️ **Medium** (~1-2 minutes) | Real-time browser interaction + analysis | Debugging specific issues, iterative development, manual verification |
| `npm run test:copilot:single` | **Single custom task testing** with focused analysis | ⚡ **Ultra-fast** (~10-15 seconds) | Targeted analysis report for specific functionality | Testing one specific feature/component/interaction quickly |
| `npm run test:copilot:single:headed` | **Single custom task** with visual debugging | ⚖️ **Fast** (~30 seconds) | Interactive single task analysis | Debugging specific functionality with visual feedback |

**Detailed Command Breakdown:**

**1. `npm run test:copilot:analyze`**
- **What it does**: Runs comprehensive visual test suite with multiple screenshots across all app modes and features
- **Speed**: 30 seconds - multiple screenshot analysis across 3D viewport, desktop design, and cross-mode consistency
- **Output**: `.copilot-visual-suggestions.md` with AI insights
- **When to use**: Quick checks after code changes, immediate feedback
- **Pros**: Ultra-fast, lightweight, instant actionable feedback
- **Cons**: Limited to automated screenshot capture, no manual interaction

**2. `npm run test:copilot:visual --headed`**
- **What it does**: Full test suite with multiple screenshots across all app modes
- **Speed**: 3-5 minutes - comprehensive screenshot collection + AI analysis
- **Output**: Complete test report + screenshot gallery + Problems panel integration
- **When to use**: Pre-release QA, comprehensive UI validation, thorough testing
- **Pros**: Complete coverage, detailed analysis, comprehensive quality assurance
- **Cons**: Slower execution, resource intensive

**3. `npm run test:copilot:headed`**
- **What it does**: Opens interactive browser session with real-time AI guidance
- **Speed**: 1-2 minutes + manual interaction time
- **Output**: Interactive session + real-time feedback + analysis report
- **When to use**: Debugging specific issues, exploring UI problems, manual verification
- **Pros**: Interactive exploration, real-time feedback, manual control
- **Cons**: Requires manual interaction, semi-automated

**4. `npm run test:copilot:single`**
- **What it does**: Runs single customizable test case with focused AI analysis
- **Speed**: 10-15 seconds - single focused test execution
- **Output**: `.copilot-visual-suggestions.md` with targeted insights for specific functionality
- **When to use**: Testing one specific feature, component, or interaction quickly (e.g., Component Panel interactions, specific UI workflows)
- **Pros**: Ultra-fast, highly targeted, customizable for specific needs, minimal overhead
- **Cons**: Limited to single test case, requires manual customization of test file

**5. `npm run test:copilot:single:headed`**
- **What it does**: Single customizable test with visible browser for debugging
- **Speed**: 30 seconds - single test with visual feedback
- **Output**: Interactive single task analysis + targeted report
- **When to use**: Debugging specific functionality with visual feedback
- **Pros**: Fast, visual debugging, focused analysis, real-time interaction
- **Cons**: Requires manual test customization, limited to single scenario

**Workflow Integration Examples:**
```bash
# Development workflow - quick iteration
git add .
npm run test:copilot:analyze  # 30 seconds - quick check
# Fix issues if found, repeat

# Single feature testing - ultra-fast focused testing
npm run test:copilot:single  # 10-15 seconds - test specific functionality
# Customize the test file for your specific needs

# Pre-commit workflow - thorough validation  
npm run test:copilot:visual --headed  # 3-5 minutes - comprehensive check
git commit -m "feat: validated with full visual testing"

# Debugging workflow - interactive investigation
npm run test:copilot:headed  # Interactive - investigate specific issues
# Manual exploration with AI guidance

# Single task debugging - focused investigation
npm run test:copilot:single:headed  # 30 seconds - debug specific functionality
# Visual feedback for single feature testing

# Custom task workflow - modify test file for specific needs
# 1. Edit tests/copilot-single-task.test.ts
# 2. Customize the test case for your specific scenario
# 3. Run: npm run test:copilot:single
# 4. Get focused AI analysis for your specific task
```

#### Copilot Visual Testing Benefits
- **Instant AI feedback**: Claude Sonnet 4 analyzes screenshots for visual issues
- **VS Code integration**: Results appear directly in Problems panel with file links
- **Performance insights**: 3D rendering optimization and loading state analysis
- **Action items**: Direct suggestions formatted for GitHub Copilot assistance

#### Integration with Main Workflow
```bash
# Option 1: Replace traditional Playwright testing with Copilot visual analysis
# After GitHub MCP commit analysis:
npm run test:copilot:analyze  # Instead of generated Playwright tests

# Option 2: Complement traditional testing with visual analysis
# After running generated Playwright tests:
npm run test:copilot:analyze  # Additional visual quality assurance

# Option 3: Iterative development workflow
# During feature development:
npm run test:copilot:analyze  # Quick visual checks during coding
# Before commit:
npx playwright test [new-test.test.ts] --headed  # Traditional functional testing
```

#### Copilot Visual Output Files
- **`.copilot-visual-suggestions.md`**: Action items for GitHub Copilot assistance
- **`release-workflow/test-results/copilot-visual/copilot-analysis-report.md`**: Comprehensive visual analysis
- **VS Code Problems panel**: Direct issue reporting with file references

For detailed Copilot visual testing documentation, see `docs/copilot-visual-testing.md`.

## GitHub MCP-Driven Test Generation Process

### Using Commit Analysis for Intelligent Test Creation

This process leverages GitHub MCP to automatically analyze commits from both the project and module repositories, ensuring Playwright tests are targeted, comprehensive, and reproducible.

#### 1. Automated Commit Analysis with GitHub MCP
```bash
# 1. GitHub MCP automatically analyzes recent commits
# - Reads latest commits from both project and module repositories
# - Analyzes commit messages, changed files, and PR descriptions
# - No manual staging required - analysis happens automatically

# 2. MCP analyzes commit patterns and determines test scope:
# - Identifies new features, bug fixes, and refactoring changes
# - Maps changed files to affected functionality areas
# - Determines integration points between sandbox and module changes
# - Prioritizes test coverage based on change impact

# 3. Automated test scope determination:
# MCP identifies changes and suggests comprehensive test coverage for:
# - Vue component modifications and new components
# - Module API changes and new methods
# - UI interaction and user workflow updates
# - 3D scene rendering and functionality changes
# - Data flow and component integration updates
# - Cross-repository dependency changes
```

#### 2. Claude Test Generation Workflow with MCP Analysis
With GitHub MCP commit analysis complete, Claude generates targeted tests based on the automated analysis:

```bash
# 1. Claude receives MCP analysis results
# - Commit summaries from both repositories
# - Changed file lists with modification types
# - Impact assessment and risk analysis
# - Suggested test coverage areas

# 2. Claude analyzes MCP data to generate test cases
# Command: "Based on the GitHub MCP commit analysis, generate Playwright tests"

# 3. Claude generates test cases for:
# - New UI components and interactions identified by commits
# - Modified Module functionality
# - Updated user workflows and navigation patterns
# - Integration points between sandbox and module changes
# - Regression scenarios for modified functionality
# - Cross-repository dependency validation
```
# - Integration points between modules
```

#### 3. Commit Analysis Examples

##### Example 1: New Vue Component (Commit-Based)
```bash
# Commit: "feat: add wiring exporter component with CSV/JSON export"
# GitHub MCP analyzes:
# - New file: components/WiringExporter.vue
# - Modified: pages/index.vue (component integration)
# - Impact: New UI functionality for data export

# Claude generates tests for:
# - Component renders correctly with proper props
# - Export functionality works for CSV and JSON formats
# - User interactions (export buttons, format selection)
# - Integration with existing wiring diagram UI
# - Error handling for export failures
```

##### Example 2: Module Module Changes (Cross-Repository)
```bash
# Commit in module repo: "feat: enhance cable routing algorithm"
# Commit in project repo: "feat: integrate enhanced cable routing"
# GitHub MCP analyzes:
# - Modified: module/src/CableSystem.js (algorithm changes)
# - Modified: project/components/WiringDiagram.vue (integration)
# - Impact: Enhanced 3D cable visualization and routing

# Claude generates tests for:
# - 3D scene updates correctly with new routing algorithm
# - Cable routing functions work with complex layouts
# - API methods accessible via window.moduleInstance
# - Integration between sandbox UI and module functionality
# - Performance validation for large cable systems
```

##### Example 3: Page Modifications (Multi-Commit Analysis)
```bash
# Multiple commits analyzed:
# - "feat: add dark mode toggle to navigation"
# - "fix: improve responsive layout for mobile devices"
# - "refactor: optimize component loading performance"
# GitHub MCP analyzes:
# - Modified: pages/index.vue (multiple changes)
# - Impact: UI/UX improvements and performance enhancements

# Claude generates tests for:
# - New navigation elements (dark mode toggle)
# - Mode switching functionality across all sandbox modes
# - Data flow between components remains intact
# - Responsive behavior on different screen sizes
# - Performance improvements don't break existing functionality
```
```

#### 4. Automated Test Scope Determination Process

GitHub MCP follows this automated analysis pattern when examining commits from both repositories:

```javascript
// 1. Analyze commits from both repositories
const sandboxCommits = await mcp_github_list_commits({
  owner: '2112-lab',
  repo: 'project',
  sha: currentBranch
});

const moduleCommits = await mcp_github_list_commits({
  owner: '2112-lab',
  repo: 'module',
  sha: 'main'
});

// 2. Identify affected functionality areas
const affectedAreas = analyzeCommitImpact(sandboxCommits, moduleCommits);

// 3. Map commits to test categories
const testScope = {
  uiTests: identifyUITests(affectedAreas),
  apiTests: identifyAPITests(affectedAreas),
  integrationTests: identifyIntegrationTests(affectedAreas),
  regressionTests: identifyRegressionRisks(affectedAreas)
};

// 4. Generate prioritized test matrix
const testMatrix = generateTestMatrix(testScope, affectedAreas);
```

#### 5. Test Generation Commands for Claude with MCP

Use these specific commands to guide Claude's test generation using GitHub MCP data:

```bash
# Automated commit analysis
"Based on the GitHub MCP commit analysis, what Playwright tests do I need?"

# Repository-specific testing
"Analyze the latest commits from both module and project repos and generate tests"

# Feature-specific testing
"The commits show [feature description]. What user workflows should I test?"

# Cross-repository integration testing
"These commits span both repositories. What integration tests do I need?"

# Impact analysis
"What existing functionality might be affected by these commits?"

# Specific commit analysis
"Analyze commit [commit-hash] and generate appropriate tests"
```

#### 6. Commit Analysis Review Checklist

Before generating tests with GitHub MCP, ensure the analysis covers:

- [ ] Latest commits from both project and module repositories
- [ ] All modified Vue components identified
- [ ] Any updated module files analyzed
- [ ] Modified configuration files reviewed
- [ ] Updated plugin files examined
- [ ] New or modified static assets considered
- [ ] Cross-repository dependencies identified

#### 7. Test Generation Best Practices

##### 7.1 Automated Analysis Granularity
```bash
# GitHub MCP automatically analyzes related changes together:
# - Groups commits by feature or bug fix
# - Identifies cross-repository dependencies
# - Maps changes to affected functionality areas
# - No manual staging required - analysis is comprehensive
```

##### 7.2 Incremental Analysis for Complex Features
```bash
# For large features spanning multiple commits:

# Step 1: Core functionality commits
# GitHub MCP analyzes initial implementation commits
# Generate tests for core component rendering and basic functionality

# Step 2: Integration commits
# MCP analyzes commits that integrate components
# Generate tests for integration and navigation workflows

# Step 3: Enhancement commits
# MCP analyzes commits that add features/utilities
# Generate tests for utility functions and data flow enhancements
```

##### 7.4 Standardized Test Generation Template

```bash
# Use the official test generation template for consistent results:
# Location: docs/test-generation-template.md
# Benefits:
# - Pre-configured MCP analysis instructions
# - Standardized test structure and patterns
# - Complete repository and branch information
# - Built-in best practices and requirements
# - No custom prompt writing required

# Simply copy the template, fill in placeholders, and send to Copilot
```

#### 8. Post-Test Generation Workflow

After Claude generates tests based on GitHub MCP commit analysis:

```bash
# 1. Review generated tests
# - Ensure tests cover the functionality identified by MCP analysis
# - Verify test selectors match your components
# - Check test data and expected outcomes based on commit changes

# 2. Run ONLY the new tests locally (always use --headed)
npx playwright test [new-test-file.test.ts] --headed

# 3. Refine tests if needed
# - Update selectors if tests fail due to UI changes
# - Adjust timing or waits for dynamic content
# - Add additional test cases if MCP analysis revealed gaps

# 4. Re-run new tests until they pass
npx playwright test [new-test-file.test.ts] --headed

# 5. DO NOT run full test suite - only commit when new tests pass
git commit -m "feat: add [feature description] with comprehensive tests"
```

This GitHub MCP approach ensures Claude can provide precise, targeted test generation based on actual commit history, resulting in more reliable and reproducible test suites.

## Environment Configuration

### Development Environment
```bash
# .env.local
LOCAL_DEV=true
NODE_ENV=development
```

### CI Environment Variables
```bash
# GitHub Secrets
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AMPLIFY_APP_ID=<app-id>
```

### AWS Amplify Environment
```yaml
# amplify.yml
version: 1
applications:
  - appRoot: /
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

## Monitoring & Alerts

### GitHub Actions Notifications
- **Success**: Green check mark, documentation automatically updated
- **Failure**: GitHub notification for documentation generation issues
- **Documentation**: Automatically published to S3 on every successful run
- **No Testing**: GitHub Actions does not run any tests

### S3 Documentation Access
- **URL**: https://module-api-docs.s3.amazonaws.com/index.html
- **Version Info**: https://module-api-docs.s3.amazonaws.com/version.json
- **CDN**: Optional CloudFront distribution for global access
- **Monitoring**: CloudWatch for access patterns
- **Version Display**: Documentation title includes version and generation date

### AWS Amplify Deployment
- **URL**: Auto-generated by Amplify
- **Custom Domain**: Optional custom domain setup
- **Version Branch Deployments**: Each `project-{version}` branch creates its own deployment
- **Branch Pattern**: `project-*` branches are automatically deployed
- **No Main Branch**: Deployments come from version branches, not main

## Troubleshooting

### Common Issues

#### 1. Playwright Tests Failing
```bash
# Debug mode (always use --headed for visual feedback)
npx playwright test --debug --headed

# Headed mode for specific test
npx playwright test [specific-test.test.ts] --headed

# Note: Only test new functionality identified by GitHub MCP analysis
# Fix issues before pushing - do not run full test suite
# If tests fail, verify MCP analysis matches actual changes
```

#### 1.2 Copilot Visual Testing Issues
```bash
# If Copilot visual analysis is not working:
# 1. Verify environment variables in .env.copilot-visual
echo $COPILOT_VISUAL_TESTS  # Should be 'true'

# 2. Check VS Code workspace and GitHub Copilot extension
code module-copilot-visual.code-workspace

# 3. Run visual tests with verbose output
npm run test:copilot:headed  # For visual debugging

# 4. Check generated analysis files
ls -la release-workflow/test-results/copilot-visual/
cat .copilot-visual-suggestions.md

# 5. Verify screenshot generation
ls -la release-workflow/test-results/copilot-visual/screenshots/
```

#### 1.1 GitHub MCP Analysis Issues
```bash
# If MCP analysis seems incomplete:
# 1. Check that commits are properly pushed to both repositories
# 2. Verify commit messages follow conventional format
# 3. Ensure cross-repository dependencies are clearly documented
# 4. Review if recent commits might have been missed by analysis

# Re-run MCP analysis with specific commit range if needed
# Command: "Analyze commits from [start-sha] to [end-sha] in both repos"

# For standardized test generation:
# Use the official template: docs/test-generation-template.md
# Copy template → Replace [CURRENT_BRANCH_NAME] → Send to Copilot
```

#### 2. Documentation Generation Failures
```bash
# Local JSDoc generation
cd module
npm run docs

# Check JSDoc configuration
cat jsdoc.json

# Test version extraction
node -p "require('./package.json').version"

# Verify generated version info
cat docs/version.json
```

#### 3. S3 Upload Issues
```bash
# Check AWS CLI configuration
aws configure list

# Test S3 access
aws s3 ls s3://module-api-docs/
```

## Best Practices

### 1. Test Maintenance
- Review tests monthly for relevance
- Update selectors when UI changes
- Keep test data synchronized with development

### 2. Documentation Quality
- Write descriptive JSDoc comments
- Include code examples in documentation
- Maintain changelog for API changes

### 3. Security
- Use least-privilege AWS IAM policies
- Rotate AWS access keys regularly
- Secure GitHub secrets properly

### 4. Performance
- Optimize test execution time
- Use parallel test execution
- Cache dependencies in CI/CD

## Conclusion

This streamlined workflow provides a version-based deployment approach with automated GitHub MCP commit analysis and local testing as the quality gate. The workflow ensures code quality through comprehensive local testing while maintaining up-to-date documentation through automated GitHub Actions that trigger on version branch pushes.

The workflow emphasizes:
- **Automation**: GitHub MCP automatically analyzes commits from both repositories
- **Speed**: Push version branches after automated test generation and local testing passes
- **Version Control**: Each deployment is a versioned branch (project-{version})
- **Local Quality Assurance**: All Playwright testing happens on developer machine
- **Developer Experience**: Complete control over testing in VS Code environment
- **Reproducibility**: Same commits always generate same test recommendations
- **Cross-Repository Analysis**: MCP analyzes changes across both module and project repos
- **Reliability**: Automated test scope determination with local fail-fast approach
- **Trust**: Developers are responsible for ensuring tests pass before pushing

Key benefits of this approach:
- **Automated Analysis**: No manual staging required - MCP handles commit analysis
- **Faster iteration**: No CI testing bottleneck with automated test generation
- **Version flexibility**: Each version is its own deployable branch
- **Local testing control**: Debug and fix issues immediately in local environment
- **Cross-repository visibility**: MCP analyzes dependencies between repos
- **Reproducible results**: Same commits always produce same test recommendations
- **Automated documentation**: JSDoc generation and S3 upload handled by GitHub Actions
- **Developer responsibility**: Tests must pass locally before push
- **Simplified CI**: GitHub Actions only handles documentation, not testing
- **Zero-maintenance docs**: Documentation stays current automatically
- **Version deployments**: Each version branch creates its own deployment environment
