import type { PageContextServer } from 'vike/types';
import { Provider } from 'ltijs';

export async function data(_pageContext: PageContextServer) {
  const platforms = await Promise.all(
    (await Provider.getAllPlatforms()).map(async (ltiplatform) => {
      return {
        platformId: await ltiplatform.platformId(),
        platformName: await ltiplatform.platformName(),
        platformActive: await ltiplatform.platformActive(),
        platformUrl: await ltiplatform.platformUrl(),
      };
    })
  );

  return {
    platforms,
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
