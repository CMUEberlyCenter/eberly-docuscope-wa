import { clearSnapshotAnalysesById } from '#server/data/mongo';
import { logger } from '#server/logger.js';
import { Abort } from 'telefunc';
import { getAuthorizedUser } from '../getAuthorizedUser';

export async function onClearSnapshotCache(id: string) {
  getAuthorizedUser();
  try {
    await clearSnapshotAnalysesById(id);
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
