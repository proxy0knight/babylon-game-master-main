# Contributing to Babylon.js Game Engine

Thank you for your interest in contributing to the Babylon.js Game Engine project! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - Browser version and OS
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots or videos if applicable
   - Console errors or logs

### Suggesting Features

1. **Open a feature request** issue
2. **Describe the use case** and why it's needed
3. **Provide mockups or examples** if possible
4. **Discuss implementation** before starting work

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** from `main`
3. **Make your changes** following our coding standards
4. **Test thoroughly** on multiple browsers
5. **Submit a pull request** with a clear description

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- Python 3.8+
- Git
- Modern browser with WebGPU support

### Quick Start

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/babylon-game-engine.git
cd babylon-game-engine

# Setup development environment
./scripts/deploy.sh setup

# Start development servers
./scripts/deploy.sh dev
```

### Project Structure

```
babylon-game-engine/
├── src/                    # Frontend source code
│   ├── components/         # Main components
│   ├── utils/             # Utility functions
│   └── assets/            # Asset templates
├── babylon-server/        # Backend API
│   ├── src/               # Python source code
│   └── data/              # Saved assets
├── scripts/               # Deployment scripts
└── docs/                  # Documentation
```

## 📝 Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** configuration
- Use **Prettier** for formatting
- Write **JSDoc comments** for public APIs
- Prefer **async/await** over Promises
- Use **meaningful variable names**

```typescript
// Good
async function loadGameAsset(assetName: string): Promise<GameAsset> {
    try {
        const response = await apiClient.loadAsset('map', assetName);
        return response.data;
    } catch (error) {
        console.error(`Failed to load asset: ${assetName}`, error);
        throw error;
    }
}

// Bad
function loadAsset(name) {
    return fetch('/api/load/' + name).then(r => r.json());
}
```

### Python

- Follow **PEP 8** style guide
- Use **type hints** for function parameters and return values
- Write **docstrings** for all functions and classes
- Use **meaningful variable names**
- Handle **exceptions appropriately**

```python
# Good
def save_asset(asset_type: str, name: str, code: str) -> Dict[str, Any]:
    """
    Save an asset to the filesystem.
    
    Args:
        asset_type: Type of asset (map, character, object)
        name: Name of the asset
        code: JavaScript/TypeScript code
        
    Returns:
        Dictionary containing success status and metadata
        
    Raises:
        ValueError: If asset_type is invalid
        IOError: If file cannot be written
    """
    if asset_type not in ['map', 'character', 'object']:
        raise ValueError(f"Invalid asset type: {asset_type}")
    
    # Implementation...
```

### CSS/Styling

- Use **CSS custom properties** for theming
- Follow **BEM methodology** for class naming
- Write **mobile-first** responsive styles
- Use **semantic HTML** elements
- Ensure **accessibility** compliance

```css
/* Good */
.playground-editor {
    --editor-bg: #1e1e1e;
    --editor-text: #d4d4d4;
    
    background-color: var(--editor-bg);
    color: var(--editor-text);
}

.playground-editor__toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
}

.playground-editor__button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
}

/* Bad */
.editor {
    background: #1e1e1e;
    color: #d4d4d4;
}

.toolbar {
    display: flex;
}

.btn {
    padding: 8px 16px;
}
```

## 🧪 Testing

### Frontend Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Check test coverage
npm run test:coverage
```

### Backend Testing

```bash
cd babylon-server
source venv/bin/activate

# Run unit tests
python -m pytest tests/

# Run with coverage
python -m pytest --cov=src tests/

# Run specific test file
python -m pytest tests/test_assets.py
```

### Manual Testing

1. **Test on multiple browsers**:
   - Chrome/Edge 113+
   - Firefox 113+ (with WebGPU enabled)
   - Safari 16+ (if available)

2. **Test responsive design**:
   - Desktop (1920x1080, 1366x768)
   - Tablet (768x1024, 1024x768)
   - Mobile (375x667, 414x896)

3. **Test core functionality**:
   - Main menu navigation
   - 3D scene rendering
   - Code editor functionality
   - Save/load operations
   - Error handling

## 📋 Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Check code formatting**
5. **Update CHANGELOG.md**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing done

## Screenshots
(If applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated checks** must pass
2. **At least one reviewer** approval required
3. **All conversations** must be resolved
4. **Squash and merge** preferred for feature branches

## 🐛 Bug Reports

### Issue Template

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 10, macOS 12, Ubuntu 20.04]
- Browser: [e.g., Chrome 113, Firefox 113]
- Version: [e.g., 1.0.0]

**Additional Context**
Console errors, screenshots, etc.
```

## 🚀 Feature Requests

### Feature Template

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other approaches you've considered

**Additional Context**
Mockups, examples, etc.
```

## 📚 Documentation

### Writing Guidelines

- Use **clear, concise language**
- Include **code examples**
- Add **screenshots** for UI features
- Keep **up-to-date** with code changes
- Follow **Markdown best practices**

### Documentation Types

1. **API Documentation**: JSDoc/Sphinx generated
2. **User Guides**: Step-by-step tutorials
3. **Developer Guides**: Technical implementation details
4. **Deployment Guides**: Setup and configuration

## 🏷️ Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Process

1. **Update version** in package.json
2. **Update CHANGELOG.md**
3. **Create release tag**
4. **Build and test** release candidate
5. **Publish release**

## 📞 Getting Help

- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Discord/Slack**: Real-time chat (if available)
- **Email**: maintainer@example.com

## 🙏 Recognition

Contributors will be:

- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes**
- **Credited in documentation**
- **Invited to maintainer team** (for significant contributions)

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to the Babylon.js Game Engine! 🎮✨

