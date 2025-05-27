# Things3 MCP Server

An MCP (Model Context Protocol) server that provides comprehensive integration with Things3 on macOS using AppleScript for optimal performance.

## Features

- Complete Things3 integration with 27 tools
- TODO management (create, update, complete, delete)
- Project and Area management
- Tag system with hierarchy support
- Checklist management
- Bulk operations
- Smart caching for improved performance
- Self-correcting error handling

## Requirements

- macOS (Things3 is macOS only)
- Node.js >= 16.0.0
- Things3 app installed
- AppleScript access enabled in System Preferences

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm start
```

## Development

```bash
npm run dev    # Run with TypeScript watch mode
npm test       # Run tests
npm run lint   # Run ESLint
```

## License

MIT