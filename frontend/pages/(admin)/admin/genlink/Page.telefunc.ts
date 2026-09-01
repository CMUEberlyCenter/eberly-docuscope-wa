import {
  errorToProblemDetails,
  UnprocessableContentError,
} from '#lib/ProblemDetails.js';
import { ReviewTool } from '#lib/ReviewResponse';
import { validateWritingTask } from '#lib/schemaValidate.js';
import { isWritingTask, WritingTask } from '#lib/WritingTask.js';
import {
  clearSnapshotAnalysesById,
  clearSnapshotAnalysisById,
  insertWritingTask,
} from '#server/data/mongo';
import { logger } from '#server/logger';
import { Abort } from 'telefunc';
import { getAuthorizedUser } from '../getAuthorizedUser';

type ClearSnapshotCacheResponse = {
  /** If the operation succeeded. */
  success: boolean;
  /** A message describing the result of the operation if success is false. */
  message?: string;
};

/**
 * Clears the cache for a specific snapshot and review tool.
 * @param id - snapshot id
 * @param tool - review tool identifier (or '*' for all tools)
 * @returns A promise resolving to the cache clearing response or an error.
 */
export async function onClearSnapshotCache(
  id: string,
  tool: ReviewTool | '*'
): Promise<ClearSnapshotCacheResponse> {
  getAuthorizedUser();
  try {
    if (tool == '*') {
      await clearSnapshotAnalysesById(id);
    } else {
      await clearSnapshotAnalysisById(id, tool);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof ReferenceError) {
      logger.error('Snapshot not found when clearing cache:', {
        snapshotId: id,
        error,
      });
      throw Abort({
        status: 404,
        message: `Snapshot with id ${id} not found.`,
      });
    }
    logger.error('Error clearing snapshot analyses cache:', error);
    return {
      success: false,
      message: `Error clearing snapshot analyses cache: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function onInsertWritingTask(task: WritingTask) {
  getAuthorizedUser();
  try {
    if (!validateWritingTask(task)) {
      throw new UnprocessableContentError(
        validateWritingTask.errors ?? ['Unknown validation error.'],
        'Invalid JSON'
      );
    }
    if (!isWritingTask(task)) {
      throw new UnprocessableContentError(
        ['Failed type check.'],
        'Invalid JSON'
      );
    }
    // Do not need to check id for validity as it is clobbered in frontend
    // with this id.
    const id = (await insertWritingTask(task)).toString();
    return { id };
  } catch (error) {
    return { error: errorToProblemDetails(error) };
  }
}
