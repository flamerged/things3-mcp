// ABOUTME: Unit tests for the Things3 MCP server
// ABOUTME: Tests server initialization and basic functionality

import { Things3Server } from '../../src/server';

describe('Things3Server', () => {
  let server: Things3Server;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    server = new Things3Server();
  });

  afterEach(async () => {
    await server.stop();
    consoleLogSpy.mockRestore();
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
  
  it('should register TODO tools', () => {
    // The console.log should have been called with the registration message
    expect(consoleLogSpy).toHaveBeenCalledWith('Registering Things3 tools...');
    expect(consoleLogSpy).toHaveBeenCalledWith('Registered 7 TODO tools');
  });
});