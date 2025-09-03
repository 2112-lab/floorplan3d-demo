import { test, expect } from '@playwright/test';
import { CopilotVisualTestManager } from './utils/copilot-visual-manager';

test.describe('GitHub Copilot Visual Testing with Claude Sonnet', () => {
  let copilotManager: CopilotVisualTestManager;

  test.beforeAll(async () => {
    copilotManager = new CopilotVisualTestManager();
    console.log('🤖 Initializing GitHub Copilot visual testing with Claude Sonnet...');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 20000 });
    await page.waitForTimeout(1000);
  });

  test('Copilot: Application Viewport Analysis', async ({ page }) => {
    console.log('🎮 Copilot analyzing application viewport...');
    
    // Navigate and load main features
    const mainNav = page.getByTestId('nav-button-main');
    if (await mainNav.isVisible()) {
      await mainNav.click();
      await page.waitForTimeout(500);
    }

    const loadBtn = page.getByTestId('load-content-btn');
    if (await loadBtn.isVisible()) {
      await loadBtn.click();
      await page.waitForTimeout(3000); // Allow content loading
    }

    // Check for main viewport
    const mainViewport = page.locator('#main-viewport').first();
    
    if (await mainViewport.isVisible()) {
      // Capture viewport for analysis
      await copilotManager.captureForCopilotAnalysis(
        page,
        'main-viewport-rendered',
        'main-viewport: Application content rendering showing main interface, checking for rendering quality, loading state, and user interaction elements',
        { element: mainViewport }
      );

      // Test viewport responsiveness
      const viewportBox = await mainViewport.boundingBox();
      if (viewportBox) {
        expect(viewportBox.width).toBeGreaterThan(300);
        expect(viewportBox.height).toBeGreaterThan(300);
      }
    } else {
      // Capture failed state for debugging
      await copilotManager.captureForCopilotAnalysis(
        page,
        '3d-viewport-failed',
        '3d-viewport: 3D viewport failed to load or render, analyzing for WebGL errors, loading state issues, or missing components'
      );
    }

    console.log('✅ 3D viewport rendering analysis completed');
  });

  test('Copilot: Desktop Design Assessment', async ({ page }) => {
    console.log('�️ Copilot analyzing desktop design...');
    
    // Test desktop resolution for application workflow
    const desktopBreakpoint = { width: 1920, height: 1080, name: 'desktop-dev', context: 'Primary development resolution for desktop AHU design workflow' };

    await page.setViewportSize({ width: desktopBreakpoint.width, height: desktopBreakpoint.height });
    await page.waitForTimeout(500);

    // Capture for desktop design analysis
    await copilotManager.captureForCopilotAnalysis(
      page,
      `desktop-${desktopBreakpoint.name}`,
      `desktop-design: ${desktopBreakpoint.context} (${desktopBreakpoint.width}x${desktopBreakpoint.height}) - analyzing general layout, UI consistency, and responsive behavior`
    );

    console.log('✅ Desktop design assessment completed');
  });



  test('Copilot: Cross-Mode UX Consistency', async ({ page }) => {
    console.log('🔄 Copilot analyzing cross-mode UX consistency...');
    
    // Test navigation between different app modes
    const modes = [
      { testId: 'nav-button-component', name: 'component', description: 'Component selection and library management mode' },
      { testId: 'nav-button-wiring', name: 'wiring', description: 'Electrical wiring diagram and cable management mode' },
      { testId: 'nav-button-scene', name: 'scene', description: '3D scene configuration and visualization settings mode' }
    ];

    for (const mode of modes) {
      const modeButton = page.getByTestId(mode.testId);
      if (await modeButton.isVisible()) {
        await modeButton.click();
        await page.waitForTimeout(1000);

        // Capture each mode for consistency analysis
        await copilotManager.captureForCopilotAnalysis(
          page,
          `mode-${mode.name}`,
          `ux-consistency: ${mode.description} - analyzing navigation patterns, UI consistency, and mode-specific functionality for seamless AHU design workflow`
        );
      }
    }

    console.log('✅ Cross-mode UX consistency analysis completed');
  });

  test.afterAll(async () => {
    console.log('📊 Generating Copilot visual analysis report...');
    
    // Generate comprehensive report
    await copilotManager.generateCopilotReport();
    
    // Get analysis summary
    const analysisResults = copilotManager.getAnalysisResults();
    const totalIssues = analysisResults.reduce((sum, analysis) => sum + analysis.ui_issues.length, 0);
    const criticalIssues = copilotManager.hasCriticalIssues();
    const suggestions = copilotManager.getCopilotSuggestions();

    console.log('\n🤖 GitHub Copilot Visual Analysis Summary:');
    console.log(`   📸 Screenshots analyzed: ${analysisResults.length}`);
    console.log(`   🐛 Issues found: ${totalIssues}`);
    console.log(`   🚨 Critical issues: ${criticalIssues ? 'YES' : 'NO'}`);
    console.log(`   💡 Copilot suggestions: ${suggestions.length}`);
    
    // Priority suggestions for immediate action
    const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
    if (highPrioritySuggestions.length > 0) {
      console.log('\n🔥 High Priority Actions for Copilot:');
      highPrioritySuggestions.forEach(suggestion => {
        console.log(`   • ${suggestion.action.toUpperCase()}: ${suggestion.description}`);
        if (suggestion.file_path) {
          console.log(`     File: ${suggestion.file_path}`);
        }
      });
    }

    console.log('\n📄 Reports generated:');
    console.log('   • release-workflow/test-results/copilot-visual/copilot-analysis-report.md');
    console.log('   • release-workflow/.copilot-visual-suggestions.md (VS Code integration)');
    console.log('   • .vscode/tasks.json (updated with Copilot tasks)');
    
    if (criticalIssues) {
      console.log('\n🚨 CRITICAL ISSUES FOUND - Review immediately!');
      throw new Error('Critical visual issues detected by Copilot analysis');
    }
  });
});
