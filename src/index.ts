// ABOUTME: Entry point for the Things3 MCP server
// ABOUTME: Initializes and starts the MCP server for Things3 integration

import { Things3Server } from './server.js';

async function main(): Promise<void> {
  try {
    const server = new Things3Server();
    await server.start();
    
    console.log('Things3 MCP Server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down Things3 MCP Server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nShutting down Things3 MCP Server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start Things3 MCP Server:', error);
    process.exit(1);
  }
}

main().catch(console.error);