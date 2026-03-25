import { render } from 'vike/abort';
import type { PageContextServer } from 'vike/types';
import { findSnapshotById } from '../../../src/server/data/mongo';

export const data = async (pageContext: PageContextServer) => {
  const id = pageContext.routeParams.id;
  try {
    const snapshot = await findSnapshotById(id);

    return {
      ...snapshot,
      id,
    };
  } catch (err) {
    if (err instanceof ReferenceError) throw render(404, `Error finding snapshot ${id}`);
    throw err;
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
