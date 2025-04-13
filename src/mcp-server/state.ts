import path from 'path';
import { logger } from '../utils/logger.js';
import { sanitization } from '../utils/sanitization.js';
import { BaseErrorCode, McpError } from '../types-global/errors.js';
import { RequestContext } from '../utils/requestContext.js';

/**
 * Simple in-memory state management for the MCP server session.
 * This state is cleared when the server restarts.
 */
class ServerState {
  private defaultFilesystemPath: string | null = null;

  /**
   * Sets the default filesystem path for the current session.
   * The path is sanitized and validated.
   *
   * @param newPath - The absolute path to set as default.
   * @param context - The request context for logging.
   * @throws {McpError} If the path is invalid or not absolute.
   */
  setDefaultFilesystemPath(newPath: string, context: RequestContext): void {
    logger.debug(`Attempting to set default filesystem path: ${newPath}`, context);
    try {
      // Ensure the path is absolute before storing
      if (!path.isAbsolute(newPath)) {
         throw new McpError(BaseErrorCode.VALIDATION_ERROR, 'Default path must be absolute.', { ...context, path: newPath });
      }
      // Sanitize the absolute path (mainly for normalization and basic checks)
      // We don't restrict to a rootDir here as it's a user-provided default.
      const sanitizedPath = sanitization.sanitizePath(newPath, { allowAbsolute: true, toPosix: true });

      this.defaultFilesystemPath = sanitizedPath;
      logger.info(`Default filesystem path set to: ${this.defaultFilesystemPath}`, context);
    } catch (error) {
      logger.error(`Failed to set default filesystem path: ${newPath}`, { ...context, error: error instanceof Error ? error.message : String(error) });
      // Rethrow McpError or wrap other errors
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(BaseErrorCode.VALIDATION_ERROR, `Invalid default path provided: ${error instanceof Error ? error.message : String(error)}`, { ...context, path: newPath, originalError: error });
    }
  }

  /**
   * Gets the currently set default filesystem path.
   *
   * @returns The absolute default path or null if not set.
   */
  getDefaultFilesystemPath(): string | null {
    return this.defaultFilesystemPath;
  }

  /**
   * Clears the default filesystem path.
   * @param context - The request context for logging.
   */
  clearDefaultFilesystemPath(context: RequestContext): void {
    logger.info('Clearing default filesystem path.', context);
    this.defaultFilesystemPath = null;
  }

  /**
   * Resolves a given path against the default path if the given path is relative.
   * If the given path is absolute, it's returned directly after sanitization.
   * If the given path is relative and no default path is set, an error is thrown.
   *
   * @param requestedPath - The path provided by the user (can be relative or absolute).
   * @param context - The request context for logging and error handling.
   * @returns The resolved, sanitized, absolute path.
   * @throws {McpError} If a relative path is given without a default path set, or if sanitization fails.
   */
  resolvePath(requestedPath: string, context: RequestContext): string {
    logger.debug(`Resolving path: ${requestedPath}`, { ...context, defaultPath: this.defaultFilesystemPath });

    let absolutePath: string;

    if (path.isAbsolute(requestedPath)) {
      absolutePath = requestedPath;
      logger.debug('Provided path is absolute.', { ...context, path: absolutePath });
    } else {
      if (!this.defaultFilesystemPath) {
        logger.warn('Relative path provided but no default path is set.', { ...context, path: requestedPath });
        throw new McpError(
          BaseErrorCode.VALIDATION_ERROR,
          'Relative path provided, but no default filesystem path has been set for this session. Please provide an absolute path or set a default path first.',
          { ...context, path: requestedPath }
        );
      }
      absolutePath = path.join(this.defaultFilesystemPath, requestedPath);
      logger.debug(`Resolved relative path against default: ${absolutePath}`, { ...context, relativePath: requestedPath, defaultPath: this.defaultFilesystemPath });
    }

    // Sanitize the final absolute path (normalize, check for traversal relative to root if applicable, etc.)
    // Since we've ensured it's absolute, allowAbsolute is true.
    try {
      // We don't enforce a rootDir here as the path could be anywhere the user sets the default to.
      // The underlying OS permissions will handle access control.
      const sanitizedAbsolutePath = sanitization.sanitizePath(absolutePath, { allowAbsolute: true, toPosix: true });
      logger.debug(`Sanitized resolved path: ${sanitizedAbsolutePath}`, { ...context, originalPath: absolutePath });
      return sanitizedAbsolutePath;
    } catch (error) {
       logger.error(`Failed to sanitize resolved path: ${absolutePath}`, { ...context, error: error instanceof Error ? error.message : String(error) });
       if (error instanceof McpError) {
         throw error; // Rethrow validation errors from sanitizePath
       }
       throw new McpError(BaseErrorCode.INTERNAL_ERROR, `Failed to process path: ${error instanceof Error ? error.message : String(error)}`, { ...context, path: absolutePath, originalError: error });
    }
  }
}

// Export a singleton instance
export const serverState = new ServerState();
