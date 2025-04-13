import fs from 'fs/promises';
import { z } from 'zod';
import { BaseErrorCode, McpError } from '../../../types-global/errors.js';
import { RequestContext } from '../../../utils/requestContext.js';
import { serverState } from '../../state.js';
import { logger } from '../../../utils/logger.js';

// Define the input schema using Zod for validation
export const UpdateFileInputSchema = z.object({
  path: z.string().min(1, 'Path cannot be empty')
    .describe('The path to the file to update. Can be relative or absolute (resolved like readFile). The file must exist.'),
  diff: z.string().min(1, 'Diff content cannot be empty')
    .describe('The search/replace blocks in the format: <<<<<<< SEARCH\n[content to find]\n=======\n[content to replace with]\n>>>>>>> REPLACE\nMultiple blocks are allowed.'),
  // TODO: Add options for fuzzy matching, recovery strategies later if needed
});

// Define the TypeScript type for the input
export type UpdateFileInput = z.infer<typeof UpdateFileInputSchema>;

// Define the TypeScript type for the output
export interface UpdateFileOutput {
  message: string;
  updatedPath: string;
  blocksApplied: number;
  blocksFailed: number; // Track blocks that didn't find a match
}

interface DiffBlock {
  search: string;
  replace: string;
  applied: boolean;
}

/**
 * Parses the diff string into structured blocks.
 * Basic parsing, assumes correct formatting.
 */
function parseDiff(diffContent: string, context: RequestContext): DiffBlock[] {
  logger.debug('Parsing diff content', context);
  const blocks: DiffBlock[] = [];
  const blockRegex = /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g;
  let match;

  while ((match = blockRegex.exec(diffContent)) !== null) {
    blocks.push({
      search: match[1],
      replace: match[2],
      applied: false, // Initialize as not applied
    });
  }

  if (blocks.length === 0 && diffContent.trim() !== '') {
     logger.warn('Diff content provided but no valid SEARCH/REPLACE blocks found.', { ...context, diffPreview: diffContent.substring(0, 100) });
     // Optionally throw an error if strict parsing is required
     // throw new McpError(BaseErrorCode.VALIDATION_ERROR, 'Invalid diff format: No valid SEARCH/REPLACE blocks found.', context);
  }

  logger.debug(`Parsed ${blocks.length} diff blocks`, context);
  return blocks;
}

/**
 * Applies search/replace blocks sequentially to the file content.
 *
 * @param {UpdateFileInput} input - The input object containing path and diff.
 * @param {RequestContext} context - The request context.
 * @returns {Promise<UpdateFileOutput>} A promise resolving with update status.
 * @throws {McpError} For path errors, file not found, I/O errors, or diff parsing issues.
 */
export const updateFileLogic = async (input: UpdateFileInput, context: RequestContext): Promise<UpdateFileOutput> => {
  const { path: requestedPath, diff } = input;
  logger.debug(`updateFileLogic: Received request for path "${requestedPath}"`, context);

  // Resolve the path
  const absolutePath = serverState.resolvePath(requestedPath, context);
  logger.debug(`updateFileLogic: Resolved path to "${absolutePath}"`, { ...context, requestedPath });

  try {
    // 1. Read the existing file content
    let currentContent: string;
    try {
      currentContent = await fs.readFile(absolutePath, 'utf8');
      logger.debug(`updateFileLogic: Successfully read existing file "${absolutePath}"`, { ...context, requestedPath });
    } catch (readError: any) {
      if (readError.code === 'ENOENT') {
        logger.warn(`updateFileLogic: File not found at "${absolutePath}"`, { ...context, requestedPath });
        throw new McpError(BaseErrorCode.NOT_FOUND, `File not found at path: ${absolutePath}. Cannot update a non-existent file.`, { ...context, requestedPath, resolvedPath: absolutePath, originalError: readError });
      }
      throw readError; // Re-throw other read errors
    }

    // 2. Parse the diff blocks
    const diffBlocks = parseDiff(diff, context);
    if (diffBlocks.length === 0) {
       // If parseDiff didn't throw but returned no blocks, maybe return a specific message
       logger.info('updateFileLogic: No valid diff blocks found, no changes applied.', { ...context, requestedPath, resolvedPath: absolutePath });
       return {
         message: `No valid SEARCH/REPLACE blocks found in the provided diff. File ${absolutePath} remains unchanged.`,
         updatedPath: absolutePath,
         blocksApplied: 0,
         blocksFailed: 0,
       };
    }


    // 3. Apply blocks sequentially
    let updatedContent = currentContent;
    let blocksApplied = 0;
    let blocksFailed = 0;

    for (const block of diffBlocks) {
      const index = updatedContent.indexOf(block.search);
      if (index !== -1) {
        // Found a match - apply the replacement *once*
        updatedContent = updatedContent.substring(0, index) + block.replace + updatedContent.substring(index + block.search.length);
        block.applied = true; // Mark as applied
        blocksApplied++;
        logger.debug(`Applied diff block (search found)`, { ...context, searchPreview: block.search.substring(0, 50) });
      } else {
        // Search content not found
        blocksFailed++;
        logger.warn(`Diff block search content not found`, { ...context, searchPreview: block.search.substring(0, 50) });
        // TODO: Implement recovery/fuzzy logic here if needed in the future
      }
    }

    // 4. Write the updated content back to the file if changes were made
    if (blocksApplied > 0) {
      logger.debug(`updateFileLogic: Writing updated content back to "${absolutePath}"`, { ...context, requestedPath });
      await fs.writeFile(absolutePath, updatedContent, 'utf8');
      logger.info(`updateFileLogic: Successfully updated file "${absolutePath}"`, { ...context, requestedPath, blocksApplied, blocksFailed });
      return {
        message: `Successfully updated file ${absolutePath}. Applied ${blocksApplied} block(s), ${blocksFailed} block(s) failed (search content not found).`,
        updatedPath: absolutePath,
        blocksApplied,
        blocksFailed,
      };
    } else {
      logger.info(`updateFileLogic: No diff blocks were applied to "${absolutePath}"`, { ...context, requestedPath, blocksFailed });
      return {
        message: `No changes applied to file ${absolutePath}. ${blocksFailed} block(s) failed (search content not found).`,
        updatedPath: absolutePath,
        blocksApplied: 0,
        blocksFailed,
      };
    }

  } catch (error: any) {
    logger.error(`updateFileLogic: Error updating file "${absolutePath}"`, { ...context, requestedPath, error: error.message, code: error.code });
    if (error instanceof McpError) {
      throw error; // Re-throw known McpErrors
    }
    // Handle potential I/O errors during read or write
    throw new McpError(BaseErrorCode.INTERNAL_ERROR, `Failed to update file: ${error.message || 'Unknown I/O error'}`, { ...context, requestedPath, resolvedPath: absolutePath, originalError: error });
  }
};
