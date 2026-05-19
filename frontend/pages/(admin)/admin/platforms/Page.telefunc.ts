import { logger } from '#server/logger.js';
import { Provider } from 'ltijs';
import { getAuthorizedUser } from '../getAuthorizedUser';

export async function onActivatePlatform(platformId: string, active: boolean) {
  getAuthorizedUser();
  try {
    // const { Provider } = await import('ltijs');
    const platform = await Provider.getPlatformById(platformId);
    if (!platform) {
      return {
        success: false,
        message: `Platform with id ${platformId} not found`,
      };
    }
    return { success: true, value: await platform.platformActive(active) };
  } catch (error) {
    logger.error(`Error setting platform ${platformId} active status:`, error);
    return {
      success: false,
      message: `Error setting platform active status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
