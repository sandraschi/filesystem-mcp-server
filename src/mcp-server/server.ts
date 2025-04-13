import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'; // Import McpServer
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config, environment } from '../config/index.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { requestContextService } from "../utils/requestContext.js"; // Import the service
import { registerCopyPathTool } from './tools/copyPath/index.js';
import { registerCreateDirectoryTool } from './tools/createDirectory/index.js';
import { registerDeleteDirectoryTool } from './tools/deleteDirectory/index.js';
import { registerDeleteFileTool } from './tools/deleteFile/index.js';
import { registerListFilesTool } from './tools/listFiles/index.js'; // Added import
import { registerMovePathTool } from './tools/movePath/index.js';
import { registerReadFileTool } from './tools/readFile/index.js';
import { registerSetFilesystemDefaultTool } from './tools/setFilesystemDefault/index.js';
import { registerUpdateFileTool } from './tools/updateFile/index.js';
import { registerWriteFileTool } from './tools/writeFile/index.js';

/**
 * Creates, configures, and connects the main MCP server instance.
 * This function initializes the server with configuration values, registers
 * available resources and tools, and establishes communication via stdio.
 *
 * @async
 * @function createMcpServer
 * @returns {Promise<McpServer>} A promise that resolves with the configured and connected McpServer instance.
 * @throws {Error} Throws an error if critical failures occur during registration or connection.
 */
export const createMcpServer = async (): Promise<McpServer> => {
  const operationContext = { operation: 'ServerInitialization' };
  logger.info("Initializing MCP server...", operationContext);

  // Configure request context settings using the service
  requestContextService.configure({
    appName: config.mcpServerName,
    appVersion: config.mcpServerVersion,
    environment: environment
  });
  logger.debug("Request context service configured.", operationContext);

  // Create the server instance using McpServer
  const server = new McpServer(
    {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
    },
    {
      capabilities: {
        // Capabilities are defined dynamically via registration functions below
        resources: {},
        tools: {},
      },
    }
  );
  logger.debug("McpServer instance created.", { ...operationContext, serverName: config.mcpServerName });

  // Register resources and tools using their dedicated functions in parallel
  try {
    logger.info("Registering resources and tools in parallel...", operationContext);
    const registrationPromises = [
      registerReadFileTool(server),
      registerSetFilesystemDefaultTool(server),
      registerWriteFileTool(server),
      registerUpdateFileTool(server),
      registerListFilesTool(server),
      registerDeleteFileTool(server),
      registerDeleteDirectoryTool(server),
      registerCreateDirectoryTool(server),
      registerMovePathTool(server),
      registerCopyPathTool(server)
    ];

    await Promise.all(registrationPromises);

    logger.info("All resources and tools registered successfully.", operationContext);
  } catch (registrationError) {
     // ErrorHandler within individual registration functions should handle specific logging/throwing
     // This catch block handles errors from Promise.all (e.g., if one registration fails critically)
     logger.error("Critical error during resource/tool registration process", {
        ...operationContext,
        error: registrationError instanceof Error ? registrationError.message : String(registrationError),
        stack: registrationError instanceof Error ? registrationError.stack : undefined,
     });
     // Rethrow to halt server startup if registration fails critically
     throw registrationError;
  }

  // Connect the server using Stdio transport
  try {
    logger.info("Connecting server via Stdio transport...", operationContext);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info(`${config.mcpServerName} connected successfully via stdio`, {
      ...operationContext,
      serverName: config.mcpServerName,
      version: config.mcpServerVersion
    });
  } catch (connectionError) {
    // Handle connection errors specifically
    ErrorHandler.handleError(connectionError, {
      operation: 'Server Connection',
      context: operationContext,
      critical: true,
      rethrow: true // Rethrow to allow the main startup process (in index.ts) to handle exit
    });
    // The line below won't be reached if rethrow is true, but needed for type safety if rethrow were false
    throw connectionError;
  }

  logger.info("MCP server initialization complete.", operationContext);
  return server;
};
