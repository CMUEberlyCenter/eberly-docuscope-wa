import type { PageContextServer } from 'vike/types';

export async function data(pageContext: PageContextServer) {
  const platforms =
    (await pageContext.provider?.platformManager.getPlatforms())?.map(
      ({ id, name, url, active }, i) => {
        return {
          platformId: typeof id === 'string' ? id : `unknown-${i}`,
          platformName: typeof name === 'string' ? name : `unknown-${i}`,
          platformActive: active,
          platformUrl: typeof url === 'string' ? url : `unknown-${i}`,
        };
      }
    ) ?? [];

  return {
    platforms,
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
