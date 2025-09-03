# Release Workflow Scripts

This directory contains utility scripts for managing the release workflow.

## Scripts

### `setup-copilot-visual.sh`
Sets up the GitHub Copilot visual testing environment for your project.

**Usage:**
```bash
bash release-workflow/scripts/setup-copilot-visual.sh
```

**What it does:**
- Creates necessary directories for test results
- Sets up VS Code configuration for Copilot integration
- Creates initial suggestion files for visual analysis
- Provides setup instructions and tips

### `make-generic.js`
Utility script that was used to convert AHU3D-specific references to generic ones. This script is included for reference and can be adapted for similar conversions in other projects.

**Usage:**
```bash
node release-workflow/scripts/make-generic.js
```

**What it does:**
- Replaces project-specific terminology with generic equivalents
- Updates file paths and references
- Converts API method names to generic patterns
- Maintains functionality while making content reusable

## Customization

When adapting these scripts for your project:

1. **Update project references**: Replace generic placeholders with your actual project names
2. **Modify file paths**: Adjust paths to match your project structure
3. **Customize workspace settings**: Update VS Code workspace configuration for your needs
4. **Adapt environment variables**: Change environment variable names to match your setup

## Integration

These scripts integrate with:
- GitHub Copilot for AI-powered testing
- Playwright for end-to-end testing
- VS Code for development environment
- GitHub Actions for CI/CD workflows
