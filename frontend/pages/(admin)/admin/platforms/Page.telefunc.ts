import { logger } from '#server/logger';
import { Provider } from 'ltijs';
import { getAuthorizedUser } from '../getAuthorizedUser';

type ActivatePlatformResponse = {
  /** If the operation was successful. */
  success: boolean;
  /** A message describing the result of the operation if success is false. */
  message?: string;
  /** The resulting active status of the platform if success is true. */
  value?: boolean;
};

/**
 * Sets the acive status of a LTI platform.
 * @param platformId - id of the platform
 * @param active - desired active status (true for active, false for inactive)
 * @returns A promise resolving to the activation response or an error.
 */
export async function onActivatePlatform(
  platformId: string,
  active: boolean
): Promise<ActivatePlatformResponse> {
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
