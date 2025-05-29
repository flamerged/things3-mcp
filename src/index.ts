#!/usr/bin/env node

// ABOUTME: Entry point for the Things3 MCP server
// ABOUTME: Initializes and starts the MCP server for Things3 integration

import { Things3Server } from './server.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('things3');

async function main(): Promise<void> {
  try {
    logger.info('Initializing server...');
    const server = new Things3Server();
    await server.start();
    
    logger.info('Server started and connected successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start Things3 MCP Server:', error as Error);
    process.exit(1);
  }
}

main().catch(err => logger.error('Unhandled error:', err));