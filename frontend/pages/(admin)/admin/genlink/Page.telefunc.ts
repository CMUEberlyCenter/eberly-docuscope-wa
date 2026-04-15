import { clearSnapshotAnalysesById } from '#server/data/mongo';
import { logger } from '#server/logger.js';

export async function onClearSnapshotCache(id: string) {
  try {
    await clearSnapshotAnalysesById(id);
    return { success: true };
  } catch (error) {
    logger.error('Error clearing snapshot analyses cache:', error);
    return {
      success: false,
      message: `Error clearing snapshot analyses cache: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
