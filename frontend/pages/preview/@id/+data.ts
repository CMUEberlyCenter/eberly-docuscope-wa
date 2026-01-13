import type { PageContextServer } from 'vike/types';
import { findPreviewById } from '../../../src/server/data/mongo';

export const data = async (pageContext: PageContextServer) => {
  const id = pageContext.routeParams.id;
  // TODO handle not found
  const preview = await findPreviewById(id);

  return {
    ...preview,
    id,
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
