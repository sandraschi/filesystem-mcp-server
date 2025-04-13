import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BaseErrorCode, McpError } from '../../../types-global/errors.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { logger } from '../../../utils/logger.js';
import { requestContextService } from '../../../utils/requestContext.js';
import {
  UpdateFileInput,
  UpdateFileInputSchema,
  updateFileLogic,
} from './updateFileLogic.js';

/**
 * Registers the 'update_file' tool with the MCP server.
 *
 * @param {McpServer} server - The McpServer instance to register the tool with.
 * @returns {Promise<void>} A promise that resolves when the tool is registered.
 * @throws {McpError} Throws an error if registration fails.
 */
export const registerUpdateFileTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({ operation: 'RegisterUpdateFileTool' });
  logger.info("Attempting to register 'update_file' tool", registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        'update_file', // Tool name
        'Performs targeted search-and-replace operations within an existing file using `<<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE` blocks. Accepts relative or absolute paths (resolved like readFile). File must exist.', // Description
        UpdateFileInputSchema.shape, // Pass the schema shape
        async (params, extra) => {
          const typedParams = params as UpdateFileInput;
          const callContext = requestContextService.createRequestContext({ operation: 'UpdateFileToolExecution', parentId: registrationContext.requestId });
          logger.info(`Executing 'update_file' tool for path: ${typedParams.path}`, callContext);

          // ErrorHandler will catch McpErrors thrown by the logic
          const result = await ErrorHandler.tryCatch(
            () => updateFileLogic(typedParams, callContext),
            {
              operation: 'updateFileLogic',
              context: callContext,
              input: { path: typedParams.path, diff: '[DIFF REDACTED]' }, // Redact diff content
              errorCode: BaseErrorCode.INTERNAL_ERROR,
              rethrow: true
            }
          );

          logger.info(`Successfully executed 'update_file' for path: ${result.updatedPath}. Blocks Applied: ${result.blocksApplied}, Failed: ${result.blocksFailed}`, callContext);

          // Format the successful response
          return {
            content: [{ type: 'text', text: result.message }],
          };
        }
      );
      logger.info("'update_file' tool registered successfully", registrationContext);
    },
    {
      operation: 'registerUpdateFileTool',
      context: registrationContext,
      errorCode: BaseErrorCode.CONFIGURATION_ERROR,
      critical: true,
      rethrow: true
    }
  );
};
