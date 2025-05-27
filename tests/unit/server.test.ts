// ABOUTME: Unit tests for the Things3 MCP server
// ABOUTME: Tests server initialization and basic functionality

import { Things3Server } from '../../src/server';

describe('Things3Server', () => {
  let server: Things3Server;

  beforeEach(() => {
    server = new Things3Server();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should create a server instance', () => {
    expect(server).toBeInstanceOf(Things3Server);
  });

  it('should start without errors', async () => {
    await expect(server.start()).resolves.not.toThrow();
  });

  it('should stop without errors', async () => {
    await server.start();
    await expect(server.stop()).resolves.not.toThrow();
  });
});