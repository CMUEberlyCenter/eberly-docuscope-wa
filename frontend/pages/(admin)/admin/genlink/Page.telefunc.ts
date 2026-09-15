import { userLanguage } from '#lib/languageCode.js';
import {
  BadRequestError,
  errorToProblemDetails,
  UnprocessableContentError,
} from '#lib/ProblemDetails.js';
import { ReviewTool } from '#lib/ReviewResponse';
import { validateWritingTask } from '#lib/schemaValidate.js';
import {
  DbWritingTask,
  isWritingTask,
  type WritingTask,
} from '#lib/WritingTask.js';
import {
  clearSnapshotAnalysesById,
  clearSnapshotAnalysisById,
  deleteSnapshotById,
  insertSnapshot,
  insertWritingTask,
} from '#server/data/mongo';
import { segmentText } from '#server/data/segmentText.js';
import { logger } from '#server/logger';
import { Abort } from 'telefunc';
import { getAuthorizedUser } from '../getAuthorizedUser';

/**
 * Insert a new writing task into the database.
 * @param task The Writing Task JSON.
 * @throws telefunc.Abort with status 403 if the user is not authorized.
 */
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
 * @throws telefunc.Abort with status 403 if the user is not authorized.
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

/**
 * Deletes a snapshot from the database.
 * @param id database id of the snapshot to delete.
 * @throws telefunc.Abort with status 403 if the user is not authorized.
 */
export async function onDeleteSnapshot(id: string) {
  getAuthorizedUser();
  try {
    const value = await deleteSnapshotById(id);
    return { success: true, value };
  } catch (error) {
    return { success: false, value: errorToProblemDetails(error) };
  }
}

/**
 * Inserts a new snapshot into the database.
 * @param task Writing type from genlink page (includes _id)
 * @param file Document contents as HTML string.
 * @param filename Name of the uploaded file.
 * @param tools List of enabled review tools.
 * @returns A promise resolving to the inserted snapshot or an error.
 * @throws telefunc.Abort with status 403 if the user is not authorized.
 */
export async function onInsertSnapshot(
  task: DbWritingTask,
  file: string,
  filename: string,
  tools: string[]
) {
  getAuthorizedUser();
  try {
    const { _id, ...taskWithoutId } = task; // Remove _id if present
    if (!validateWritingTask(taskWithoutId)) {
      throw new UnprocessableContentError(
        validateWritingTask.errors ?? ['Unknown validation error.'],
        'Invalid Writing Task JSON'
      );
    }
    if (!isWritingTask(task)) {
      throw new BadRequestError('Invalid Writing Task structure.');
    }
    if (!file) {
      throw new BadRequestError('No document uploaded.');
    }
    const segmented = await segmentText(file, userLanguage(task));
    const snapshot = await insertSnapshot(
      task,
      file,
      segmented,
      filename,
      tools
    );
    return { success: true, snapshot };
  } catch (error) {
    return { success: false, error: errorToProblemDetails(error) };
  }
}
