# Contributing to Claude-Gemini Bridge

Thank you for your interest in contributing to Claude-Gemini Bridge! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/claude-gemini-bridge.git`
3. Add upstream remote: `git remote add upstream https://github.com/original/claude-gemini-bridge.git`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Redis (for distributed mode)
- API Keys for Claude and Gemini

### Installation
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your API keys to .env
# CLAUDE_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here

# Build the project
npm run build
```

## Project Structure

```
claude-gemini-bridge/
├── src/
│   ├── adapters/         # AI service adapters
│   ├── orchestration/    # Task orchestration logic
│   ├── learning/         # Machine learning module
│   ├── websocket/        # WebSocket implementation
│   ├── distributed/      # Distributed mode components
│   ├── utils/           # Utility functions
│   ├── server/          # HTTP/WebSocket server
│   └── types/           # TypeScript types
├── web/                 # Next.js web interface
├── examples/            # Usage examples
├── docs/               # Documentation
└── tests/              # Test files
```

## Making Changes

### Workflow
1. Update your fork: `git pull upstream main`
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Create a Pull Request

### Commit Message Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Maintenance tasks

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/__tests__/adapters/claude-adapter.test.ts
```

### Writing Tests
- Place test files in `__tests__` directories
- Name test files with `.test.ts` extension
- Aim for >80% code coverage
- Test both success and error cases

Example test:
```typescript
describe('FeatureName', () => {
  it('should do something specific', async () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = await myFunction(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

## Documentation

### JSDoc Comments
All public functions and classes should have JSDoc comments:

```typescript
/**
 * Execute a task using the specified adapter
 * @param {Task} task - The task to execute
 * @param {AdapterOptions} options - Execution options
 * @returns {Promise<TaskResult>} Execution result
 * @throws {ExecutionError} If execution fails
 */
async function executeTask(task: Task, options?: AdapterOptions): Promise<TaskResult> {
  // Implementation
}
```

### README Updates
Update README.md when:
- Adding new features
- Changing API interfaces
- Modifying installation steps
- Adding new dependencies

## Pull Request Process

1. **Before Creating PR:**
   - Ensure all tests pass
   - Update documentation
   - Run linter: `npm run lint`
   - Run type check: `npm run typecheck`

2. **PR Description Should Include:**
   - What changes were made
   - Why the changes are necessary
   - How to test the changes
   - Related issues (use "Fixes #123")

3. **Review Process:**
   - At least one maintainer review required
   - All CI checks must pass
   - Address review feedback promptly

## Style Guide

### TypeScript/JavaScript
- Use TypeScript for all new code
- Enable strict mode
- Prefer functional programming patterns
- Use async/await over callbacks
- Destructure objects when possible

### Code Organization
- One class/interface per file
- Group related functionality
- Keep functions small and focused
- Use meaningful variable names

### Error Handling
```typescript
// Good
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  return { success: false, error: error.message };
}

// Avoid
try {
  return await riskyOperation();
} catch (e) {
  console.log(e);
  throw e;
}
```

### Async Operations
```typescript
// Good - Parallel execution when possible
const [result1, result2] = await Promise.all([
  operation1(),
  operation2()
]);

// Avoid unnecessary sequential execution
const result1 = await operation1();
const result2 = await operation2();
```

## Advanced Topics

### Adding New AI Adapters
1. Create adapter in `src/adapters/`
2. Implement `CLIAdapter` interface
3. Add capability definitions
4. Update orchestrator routing logic
5. Add tests

### Extending Learning Module
1. Define new pattern types
2. Update feedback recording
3. Implement pattern analysis
4. Add persistence support
5. Create visualization methods

### WebSocket Events
When adding new WebSocket events:
1. Define event types in types/
2. Implement handler in websocket-bridge
3. Add client-side handling
4. Document in API guide
5. Add integration tests

## Getting Help

- 📚 Check existing documentation
- 💬 Ask in GitHub Discussions
- 🐛 Report bugs via GitHub Issues
- 📧 Contact maintainers for sensitive issues

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (when available)

Thank you for contributing to Claude-Gemini Bridge! 🚀