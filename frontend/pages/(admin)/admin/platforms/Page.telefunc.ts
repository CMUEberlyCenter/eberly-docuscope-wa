import { TelefuncContext } from '#lib/TelefuncContext.js';
import { logger } from '#server/logger';
import { getContext } from 'telefunc';
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
  const { provider } = getContext<TelefuncContext>();
  if (!provider) {
    logger.error('Provider is not available in the context.');
    return {
      success: false,
      message: 'Provider is not available in the context.',
    };
  }
  try {
    // const { Provider } = await import('ltijs');
    const platform = await provider.platformManager.getPlatformById(platformId);
    if (!platform) {
      return {
        success: false,
        message: `Platform with id ${platformId} not found`,
      };
    }
    const updatedPlatform = await provider.platformManager.updatePlatform(
      platform,
      { active }
    );
    return { success: true, value: updatedPlatform.active };
  } catch (error) {
    logger.error(`Error setting platform ${platformId} active status:`, error);
    return {
      success: false,
      message: `Error setting platform active status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
