# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Things3 MCP (Model Context Protocol) Server that provides comprehensive integration with the Things3 task management application on macOS using AppleScript. The server implements 27 tools for complete Things3 automation including TODO management, projects, areas, tags, checklists, and bulk operations.

## Key Architecture Components

1. **MCP Server Core**: Implements the Model Context Protocol server specification
2. **AppleScript Bridge**: Executes AppleScript commands via `osascript` to communicate with Things3
3. **Cache Manager**: TTL-based caching (5 minutes) for projects, areas, and tags to improve performance
4. **Error Correction Framework**: Self-correcting behavior for common issues (date conflicts, missing titles, invalid references)
5. **Tool Implementations**: 27 tools organized by category (TODOs, Projects, Areas, Tags, Checklists, Bulk operations, System)

## Development Commands

Since this is a new project without an existing codebase, here are the commands that will be used once implemented:

```bash
# Project setup (once implemented)
npm install              # Install dependencies
npm run build           # Compile TypeScript to JavaScript
npm run dev             # Run in development mode with watch
npm run start           # Run the compiled server

# Testing (once implemented)
npm test                # Run all tests
npm run test:unit       # Run unit tests
npm run test:integration # Run integration tests

# Code quality (once implemented)
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript type checking
npm run format          # Format code with Prettier
```

## Git Conventions

- Use conventional commit format for all commits (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Do NOT include Claude as a co-author in commits
- Pre-commit hook runs tests automatically - ensure all tests pass before committing

## Implementation Approach

The project follows a phased implementation plan with 12 iterative development chunks:

1. **Foundation**: TypeScript setup, MCP server core, data models
2. **Basic TODO Operations**: List, get, create, complete/uncomplete
3. **TODO Management**: Update, delete, date handling, error correction
4. **Project/Area Management**: With caching support
5. **Tag System**: With hierarchy support
6. **Advanced Features**: Checklists, bulk operations, logbook, system tools
7. **Performance & Polish**: Cache optimization, connection pooling

## Technical Considerations

### AppleScript Integration
- All Things3 communication happens through AppleScript via the `osascript` command
- Proper string escaping is critical for AppleScript parameters
- Default timeout is 30 seconds for AppleScript execution
- Things3 must be running for operations to work

### Error Correction
The server automatically corrects common issues:
- **Date conflicts**: Swaps when/deadline if deadline < whenDate
- **Missing titles**: Generates from notes or uses "Untitled"
- **Invalid references**: Moves items to Inbox if project/area not found
- **Invalid tag names**: Cleans special characters Things3 doesn't support

### Performance Optimizations
- Batch AppleScript commands where possible
- Cache projects, areas, and tags with 5-minute TTL
- Use lightweight list operations by default
- Pre-compile frequently used AppleScript templates

### Date/Time Handling
- All dates use ISO 8601 format in the API
- Convert to Things3's AppleScript date format internally
- Support full datetime with timezone handling

## Things3-Specific Notes

- Things3 uses internal IDs for todos and projects
- Tags are referenced by name, not ID
- The app must be running for operations to work
- Some operations may require Things3 to be the active application
- AppleScript access must be enabled in macOS Security & Privacy settings