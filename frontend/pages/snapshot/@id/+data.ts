import type { PageContextServer } from 'vike/types';
import { findSnapshotById } from '../../../src/server/data/mongo';

export const data = async (pageContext: PageContextServer) => {
  const id = pageContext.routeParams.id;
  // TODO handle not found
  const snapshot = await findSnapshotById(id);

  return {
    ...snapshot,
    id,
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
