# Contributing to Things3 MCP Server

Thank you for your interest in contributing to the Things3 MCP Server! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/things3-mcp.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `npm test`
6. Commit your changes using conventional commits
7. Push to your fork and submit a pull request

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
npm run test:unit
npm run test:integration
```

## Code Style

- We use TypeScript with strict mode enabled
- Follow the existing code style
- Run `npm run lint` before committing
- Use meaningful variable and function names

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Integration tests require Things3 to be running on macOS

## Pull Request Process

1. Update README.md with details of changes if needed
2. Ensure all tests pass
3. Update documentation as necessary
4. Reference any related issues in your PR description

## Reporting Issues

- Use GitHub Issues to report bugs
- Include Things3 version and macOS version
- Provide steps to reproduce the issue
- Include relevant error messages or logs

## Feature Requests

- Open an issue to discuss new features
- Explain the use case and benefits
- Consider Things3's AppleScript limitations

## Questions?

Feel free to open an issue for any questions about contributing!