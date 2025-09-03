# Release Workflow Configuration

This folder contains release workflow-related configuration files and documentation for your project.

## Structure

### `/docs`
- **release-workflow.md**: Complete release workflow documentation
- **copilot-visual-testing.md**: Visual testing with GitHub Copilot guide
- **claude-playwright-integration.md**: Claude and Playwright integration documentation
- **test-generation-template.md**: Template for automated test generation
- **testing-guide.md**: Comprehensive testing guide
- **replication-guide.md**: Step-by-step guide for using this workflow in other projects

### `/scripts`
- **setup-copilot-visual.sh**: Setup script for Copilot visual testing environment
- **make-generic.js**: Utility for converting project-specific references to generic ones

### `/tests`
- **Generic tests**: `copilot-visual.test.ts`, `ui-testing-with-testids.test.ts`
- **`ahu3d/`**: AHU3D-specific tests (examples for complex applications)
- **`examples/`**: Additional test templates and examples
- **`utils/`**: Shared test utilities and helpers
- **`types.d.ts`**: TypeScript type definitions for tests

### Root Files
- **project-copilot-visual.code-workspace**: VS Code workspace configuration
- **playwright.config.ts**: Playwright testing configuration
- **.env.copilot-visual**: Environment variables for Copilot visual testing
- **.copilot-visual-suggestions.md**: Generated suggestions and action items from visual tests

## Purpose

This organization centralizes release workflow-related configuration and documentation to:
- Improve maintainability of development workflows
- Provide clear separation between project code and workflow configuration  
- Make it easier to manage testing, documentation, and development setup
- Facilitate workspace sharing and collaboration

## Important Notes

Some files must remain in their original locations for tools to function properly:
- **GitHub Actions workflows**: Must stay in `.github/workflows/` 
- **GitHub Copilot instructions**: Must stay in `.github/copilot-instructions.md`
- **VS Code tasks**: Must stay in `.vscode/tasks.json`

This release workflow folder contains copies/references and documentation for these workflows.

## Usage

The release workflow folder contains:
- **VS Code workspace configuration**: Open `project-copilot-visual.code-workspace` in VS Code
- **Playwright testing configuration**: Referenced by npm scripts with `--config=release-workflow/playwright.config.ts`
- **Development workflows documentation**: Comprehensive guides in the `docs/` folder
- **Setup scripts**: Automation scripts for development environment setup

Most files are automatically used by their respective tools. The Playwright config is referenced via npm scripts, and VS Code uses the workspace file for project configuration.
