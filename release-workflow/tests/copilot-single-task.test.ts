import { test, expect } from '@playwright/test';
import { CopilotVisualTestManager } from './utils/copilot-visual-manager';

test.describe('GitHub Copilot Single Task Visual Testing', () => {
  let copilotManager: CopilotVisualTestManager;

  test.beforeAll(async () => {
    copilotManager = new CopilotVisualTestManager();
    console.log('🤖 Initializing GitHub Copilot single task visual testing...');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 20000 });
    await page.waitForTimeout(1000);
  });

  // Single customizable test case - modify this based on your specific testing needs
  test('Copilot: Custom Single Task Analysis', async ({ page }) => {
    console.log('🔍 Copilot analyzing custom single task...');
    
    // ===== CUSTOMIZE THIS SECTION FOR YOUR SPECIFIC TASK =====
    
    // Example 1: Test component panel loading (modify as needed)
    const compNav = page.getByTestId('nav-button-component');
    await expect(compNav).toBeVisible({ timeout: 8000 });
    await compNav.click();
    await page.waitForTimeout(500);

    // Example 2: Capture specific UI state for analysis
    await copilotManager.captureForCopilotAnalysis(
      page, 
      'custom-task-analysis',
      'custom-task: Replace this description with your specific testing scenario - what are you trying to validate?'
    );

    // Example 3: Test specific interaction (customize for your needs)
    const componentPanel = page.getByTestId('component-panel').first();
    await expect(componentPanel).toBeVisible();

    // Example 4: Custom interaction testing
    // Uncomment and modify based on your specific needs:
    
    // Test radio button interaction
    // const radio = page.getByTestId('size-medium-radio');
    // await radio.click();
    // await page.waitForTimeout(300);
    
    // Test button click
    // const loadBtn = page.getByTestId('load-component-btn');
    // await loadBtn.click();
    // await page.waitForTimeout(2000);
    
    // Test navigation to different mode
    // const wiringNav = page.getByTestId('nav-button-wiring');
    // await wiringNav.click();
    // await page.waitForTimeout(500);
    
    // Test 3D viewport specific functionality
    // const viewport3d = page.locator('#viewport3d').first();
    // if (await viewport3d.isVisible()) {
    //   await copilotManager.captureForCopilotAnalysis(
    //     page,
    //     'custom-3d-analysis',
    //     'custom-3d: Your specific 3D rendering test description',
    //     { element: viewport3d }
    //   );
    // }

    // ===== END CUSTOMIZATION SECTION =====

    console.log('✅ Custom single task analysis completed');
  });

  test.afterAll(async () => {
    console.log('📊 Generating single task Copilot analysis report...');
    
    // Generate focused report for single task
    await copilotManager.generateCopilotReport();
    
    // Get analysis summary
    const analysisResults = copilotManager.getAnalysisResults();
    const totalIssues = analysisResults.reduce((sum, analysis) => sum + analysis.ui_issues.length, 0);
    const criticalIssues = copilotManager.hasCriticalIssues();
    const suggestions = copilotManager.getCopilotSuggestions();

    console.log('\n🤖 GitHub Copilot Single Task Analysis Summary:');
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

    console.log('\n📄 Single Task Reports generated:');
    console.log('   • release-workflow/test-results/copilot-visual/copilot-analysis-report.md');
    console.log('   • release-workflow/.copilot-visual-suggestions.md (VS Code integration)');
    
    if (criticalIssues) {
      console.log('\n🚨 CRITICAL ISSUES FOUND - Review immediately!');
      throw new Error('Critical visual issues detected by Copilot single task analysis');
    }
  });
});
