import type { PageContextServer } from 'vike/types';
import { Provider } from 'ltijs';

export async function data(_pageContext: PageContextServer) {
  const platforms = await Promise.all(
    (await Provider.getAllPlatforms()).map(async (ltiplatform, i) => {
      const platformId = await ltiplatform.platformId();
      const platformName = await ltiplatform.platformName();
      const platformUrl = await ltiplatform.platformUrl();
      return {
        platformId:
          typeof platformId === 'string' ? platformId : `unknown-${i}`,
        platformName:
          typeof platformName === 'string' ? platformName : `unknown-${i}`,
        platformActive: await ltiplatform.platformActive(),
        platformUrl:
          typeof platformUrl === 'string' ? platformUrl : `unknown-${i}`,
      };
    })
  );

  return {
    platforms,
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
