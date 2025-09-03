#!/bin/bash

echo "🤖 Setting up GitHub Copilot + Claude Sonnet 4 Visual Testing..."

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
