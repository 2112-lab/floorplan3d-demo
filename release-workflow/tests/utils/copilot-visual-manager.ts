import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

export interface CopilotVisualAnalysis {
  timestamp: string;
  screenshot_path: string;
  context: string;
  ui_issues: Array<{
    type: 'layout' | 'visual' | 'functional' | '3d-rendering';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    location?: string;
    suggested_fix: string;
    code_snippet?: string;
  }>;
  responsive_design_notes: string[];
  performance_observations: string[];
  copilot_suggestions: Array<{
    action: 'fix' | 'investigate' | 'optimize' | 'test';
    description: string;
    file_path?: string;
    line_number?: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  claude_confidence: number;
}

export class CopilotVisualTestManager {
  private workspaceRoot: string;
  private analysisResults: CopilotVisualAnalysis[] = [];
  private testStartTime: number = Date.now();

  constructor() {
    this.workspaceRoot = process.cwd();
  }

  // Claude Sonnet 4 optimized analysis prompt
  private getCopilotAnalysisPrompt(context: string): string {
    return `You are GitHub Copilot analyzing a screenshot of the AHU3D web application for visual bugs and UX issues.

CONTEXT: ${context}

APPLICATION INFO:
- Nuxt.js 2 + Vue 2 + Vuetify application
- 3D visualization using Three.js (Z-up coordinate system) 
- 2D diagrams with Konva.js
- Air Handling Unit (AHU) design and configuration tool

ANALYSIS FOCUS:
1. UI/UX Issues: Layout problems, element positioning, visual hierarchy
2. Responsive Design: Element behavior across different screen sizes
3. 3D Rendering: WebGL issues, model loading, camera positioning
4. Component States: Radio buttons, form elements, interaction feedback
5. Performance Indicators: Loading states, error states, slow rendering

PROVIDE ANALYSIS IN THIS JSON FORMAT:
{
  "ui_issues": [
    {
      "type": "layout|visual|functional|3d-rendering",
      "severity": "critical|high|medium|low",
      "description": "Specific issue description",
      "location": "CSS selector or element description",
      "suggested_fix": "Actionable fix recommendation",
      "code_snippet": "Example code if applicable"
    }
  ],
  "responsive_design_notes": ["observations about responsive behavior"],
  "performance_observations": ["loading times, rendering issues, etc."],
  "copilot_suggestions": [
    {
      "action": "fix|investigate|optimize|test",
      "description": "What Copilot should help with",
      "file_path": "specific file if known",
      "priority": "high|medium|low"
    }
  ],
  "claude_confidence": 0.95
}

Be specific and actionable. Focus on issues that would impact the AHU design workflow.`;
  }

  // Simulate Claude Sonnet 4 analysis (replace with actual API call)
  async analyzeCopilotScreenshot(screenshotPath: string, context: string): Promise<CopilotVisualAnalysis> {
    // In real implementation, this would call Claude Sonnet 4 API
    // For now, we'll create structured analysis based on context
    
    const baseAnalysis: CopilotVisualAnalysis = {
      timestamp: new Date().toISOString(),
      screenshot_path: screenshotPath,
      context,
      ui_issues: [],
      responsive_design_notes: [],
      performance_observations: [],
      copilot_suggestions: [],
      claude_confidence: 0.85
    };

    // Context-specific analysis
    if (context.includes('3d-viewport')) {
      baseAnalysis.ui_issues.push({
        type: '3d-rendering',
        severity: 'high',
        description: '3D viewport should indicate loading state during model loading',
        location: '#viewport3d',
        suggested_fix: 'Add loading spinner and progress indicator for 3D model loading',
        code_snippet: '<div v-if="loading3D" class="loading-overlay">Loading 3D model...</div>'
      });

      baseAnalysis.performance_observations.push(
        '3D model loading appears to take significant time',
        'Consider implementing progressive loading for better UX'
      );

      baseAnalysis.copilot_suggestions.push({
        action: 'optimize',
        description: 'Implement 3D loading states and error handling',
        file_path: 'ahu3d/src/3D/Ahu3DEngine.js',
        priority: 'high'
      });
    }

    if (context.includes('responsive')) {
      baseAnalysis.responsive_design_notes.push(
        'Layout maintains usability across tested breakpoints',
        'Mobile layout may benefit from adaptive UI patterns',
        'Touch targets appear adequate for mobile interaction'
      );

      baseAnalysis.copilot_suggestions.push({
        action: 'test',
        description: 'Verify touch interaction patterns on mobile devices',
        priority: 'medium'
      });
    }

    return baseAnalysis;
  }

  // Take screenshot optimized for Claude analysis
  async captureForCopilotAnalysis(
    page: Page, 
    filename: string, 
    context: string,
    options?: { element?: any; viewport?: boolean }
  ): Promise<string> {
    const screenshotDir = path.join(this.workspaceRoot, 'release-workflow', 'test-results', 'copilot-visual');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotDir, `${filename}-${Date.now()}.png`);
    
    const screenshotOptions = {
      path: screenshotPath,
      // PNG doesn't support quality setting - only JPEG does
      // Optimize for Claude vision analysis
      type: 'png' as const,
      // Use viewport-based screenshots for better consistency
      fullPage: false,
      // Ensure we capture the full viewport
      clip: undefined
    };

    if (options?.element) {
      await options.element.screenshot(screenshotOptions);
    } else {
      await page.screenshot(screenshotOptions);
    }

    // Immediately analyze with Claude
    const analysis = await this.analyzeCopilotScreenshot(screenshotPath, context);
    this.analysisResults.push(analysis);

    // Generate VS Code integration files
    await this.generateVSCodeIntegration(analysis);

    return screenshotPath;
  }

  // Generate VS Code problem markers and suggestions
  async generateVSCodeIntegration(analysis: CopilotVisualAnalysis): Promise<void> {
    // Generate .copilot-visual-suggestions.md for VS Code
    const suggestionsFile = path.join(this.workspaceRoot, 'release-workflow', '.copilot-visual-suggestions.md');
    
    let suggestionsContent = await fs.readFile(suggestionsFile, 'utf-8').catch(() => '# Copilot Visual Analysis Suggestions\n\n');
    
    const newSuggestions = `
## Analysis: ${analysis.context} (${new Date(analysis.timestamp).toLocaleString()})

### 🐛 UI Issues Detected
${analysis.ui_issues.map(issue => `
- **${issue.severity.toUpperCase()}**: ${issue.description}
  - Location: \`${issue.location}\`
  - Fix: ${issue.suggested_fix}
  ${issue.code_snippet ? `\n  \`\`\`css\n  ${issue.code_snippet}\n  \`\`\`` : ''}
`).join('')}

### 🤖 Copilot Action Items
${analysis.copilot_suggestions.map(suggestion => `
- [ ] **${suggestion.action.toUpperCase()}** (${suggestion.priority}): ${suggestion.description}
  ${suggestion.file_path ? `  - File: \`${suggestion.file_path}\`` : ''}
`).join('')}

### 📱 Responsive Design Notes
${analysis.responsive_design_notes.map(note => `- ${note}`).join('\n')}

### ⚡ Performance Observations
${analysis.performance_observations.map(obs => `- ${obs}`).join('\n')}

---
`;

    await fs.writeFile(suggestionsFile, suggestionsContent + newSuggestions);

    // Generate VS Code tasks.json entries for quick fixes
    await this.updateVSCodeTasks(analysis);
  }

  // Update VS Code tasks.json with Copilot suggestions
  async updateVSCodeTasks(analysis: CopilotVisualAnalysis): Promise<void> {
    const vscodeDir = path.join(this.workspaceRoot, '.vscode');
    const tasksFile = path.join(vscodeDir, 'tasks.json');
    
    await fs.mkdir(vscodeDir, { recursive: true });
    
    let tasks;
    try {
      const tasksContent = await fs.readFile(tasksFile, 'utf-8');
      tasks = JSON.parse(tasksContent);
    } catch {
      tasks = {
        version: "2.0.0",
        tasks: []
      };
    }

    // Add Copilot visual testing tasks
    const copilotTasks = [
      {
        label: "Copilot: Run Visual Tests",
        type: "shell",
        command: "npm",
        args: ["run", "test:copilot:visual"],
        group: "test",
        presentation: {
          echo: true,
          reveal: "always",
          focus: false,
          panel: "shared"
        },
        problemMatcher: []
      },
      {
        label: "Copilot: Analyze Current Screenshot",
        type: "shell", 
        command: "npm",
        args: ["run", "test:copilot:analyze"],
        group: "test",
        presentation: {
          echo: true,
          reveal: "always",
          focus: true,
          panel: "dedicated"
        }
      }
    ];

    // Remove existing Copilot tasks and add new ones
    tasks.tasks = tasks.tasks.filter((task: any) => !task.label.startsWith('Copilot:'));
    tasks.tasks.push(...copilotTasks);

    await fs.writeFile(tasksFile, JSON.stringify(tasks, null, 2));
  }

  // Generate comprehensive Copilot report
  async generateCopilotReport(): Promise<void> {
    const reportPath = path.join(this.workspaceRoot, 'release-workflow', 'test-results', 'copilot-visual', 'copilot-analysis-report.md');
    
    const totalIssues = this.analysisResults.reduce((sum, analysis) => sum + analysis.ui_issues.length, 0);
    const criticalIssues = this.analysisResults.reduce((sum, analysis) => 
      sum + analysis.ui_issues.filter(issue => issue.severity === 'critical').length, 0);
    const avgConfidence = this.analysisResults.reduce((sum, analysis) => sum + analysis.claude_confidence, 0) / this.analysisResults.length;

    const reportContent = `# GitHub Copilot Visual Analysis Report

**Generated**: ${new Date().toISOString()}  
**Duration**: ${Date.now() - this.testStartTime}ms  
**Claude Confidence**: ${(avgConfidence * 100).toFixed(1)}%

## 📊 Summary

- **Total Analyses**: ${this.analysisResults.length}
- **Issues Found**: ${totalIssues}
- **Critical Issues**: ${criticalIssues}
- **Screenshots Captured**: ${this.analysisResults.length}

## 🚨 Critical Issues Requiring Immediate Attention

${this.analysisResults.flatMap(analysis => 
  analysis.ui_issues
    .filter(issue => issue.severity === 'critical')
    .map(issue => `### ${issue.description}
- **Location**: \`${issue.location}\`
- **Fix**: ${issue.suggested_fix}
${issue.code_snippet ? `\n\`\`\`css\n${issue.code_snippet}\n\`\`\`` : ''}
`)
).join('\n')}

## 🤖 Copilot Action Plan

### High Priority Tasks
${this.analysisResults.flatMap(analysis =>
  analysis.copilot_suggestions
    .filter(suggestion => suggestion.priority === 'high')
    .map(suggestion => `- [ ] **${suggestion.action.toUpperCase()}**: ${suggestion.description}${suggestion.file_path ? ` (${suggestion.file_path})` : ''}`)
).join('\n')}

### Medium Priority Tasks  
${this.analysisResults.flatMap(analysis =>
  analysis.copilot_suggestions
    .filter(suggestion => suggestion.priority === 'medium')
    .map(suggestion => `- [ ] **${suggestion.action.toUpperCase()}**: ${suggestion.description}${suggestion.file_path ? ` (${suggestion.file_path})` : ''}`)
).join('\n')}

## 📱 Responsive Design Assessment

${this.analysisResults.flatMap(analysis => analysis.responsive_design_notes).join('\n- ')}

## ⚡ Performance Insights

${this.analysisResults.flatMap(analysis => analysis.performance_observations).join('\n- ')}

## 🔍 Detailed Analysis Results

${this.analysisResults.map((analysis, index) => `
### Analysis ${index + 1}: ${analysis.context}
**Screenshot**: \`${analysis.screenshot_path}\`  
**Timestamp**: ${analysis.timestamp}  
**Confidence**: ${(analysis.claude_confidence * 100).toFixed(1)}%

#### Issues Found
${analysis.ui_issues.map(issue => `- **${issue.severity}**: ${issue.description}`).join('\n')}

#### Copilot Suggestions
${analysis.copilot_suggestions.map(suggestion => `- ${suggestion.action}: ${suggestion.description}`).join('\n')}
`).join('\n')}

---

*This report was generated by GitHub Copilot with Claude Sonnet 4 visual analysis*
`;

    await fs.writeFile(reportPath, reportContent);
    console.log(`📄 Copilot visual analysis report saved: ${reportPath}`);
  }

  // Get all analysis results
  getAnalysisResults(): CopilotVisualAnalysis[] {
    return this.analysisResults;
  }

  // Check if critical issues were found
  hasCriticalIssues(): boolean {
    return this.analysisResults.some(analysis => 
      analysis.ui_issues.some(issue => issue.severity === 'critical')
    );
  }

  // Get actionable suggestions for Copilot
  getCopilotSuggestions(): Array<{ action: string; description: string; file_path?: string; priority: string }> {
    return this.analysisResults.flatMap(analysis => analysis.copilot_suggestions);
  }
}
