import fs from 'fs/promises';
import { z } from 'zod';
import { config } from '../../../config/index.js'; // To potentially get base directory
import { BaseErrorCode, McpError } from '../../../types-global/errors.js';
import { RequestContext } from '../../../utils/requestContext.js';
import { sanitization } from '../../../utils/sanitization.js';

// Define the input schema using Zod for validation
export const ReadFileInputSchema = z.object({
  path: z.string().min(1, 'Path cannot be empty')
    .describe('The path to the file to read. Can be relative or absolute (if you have previously set the global base directory during your current session; otherwise always use an absolute path).'),
});

// Define the TypeScript type for the input
export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

// Define the TypeScript type for the output
export interface ReadFileOutput {
  content: string;
}

/**
 * Reads the content of a specified file.
 *
 * @param {ReadFileInput} input - The input object containing the file path.
 * @param {RequestContext} context - The request context for logging and error handling.
 * @returns {Promise<ReadFileOutput>} A promise that resolves with the file content.
 * @throws {McpError} Throws McpError for validation errors, file not found, or I/O errors.
 */
export const readFileLogic = async (input: ReadFileInput, context: RequestContext): Promise<ReadFileOutput> => {
  const { path: requestedPath } = input;
  const baseDir = config.fsBaseDirectory; // Get base directory from config (might be undefined)

  // Sanitize the path
  const sanitizedPath = sanitization.sanitizePath(requestedPath, {
    rootDir: baseDir, // Restrict to base directory if configured
    // Note: ensureExists option removed as it's not supported. Existence checked by fs.readFile.
    // context: context, // Context is not a direct option for sanitizePath, it's used within McpError
  });

  try {
    // Read the file content
    const content = await fs.readFile(sanitizedPath, 'utf8');
    return { content };
  } catch (error: any) {
    // Handle specific file system errors
    if (error.code === 'ENOENT') {
      // Use NOT_FOUND error code and correct constructor signature
      throw new McpError(BaseErrorCode.NOT_FOUND, `File not found at path: ${requestedPath}`, { ...context, originalError: error });
    }
    if (error.code === 'EISDIR') {
       // Use VALIDATION_ERROR and correct constructor signature
       throw new McpError(BaseErrorCode.VALIDATION_ERROR, `Path is a directory, not a file: ${requestedPath}`, { ...context, originalError: error });
    }
    // Handle other potential I/O errors using INTERNAL_ERROR
    throw new McpError(BaseErrorCode.INTERNAL_ERROR, `Failed to read file: ${error.message || 'Unknown I/O error'}`, { ...context, originalError: error });
  }
};
