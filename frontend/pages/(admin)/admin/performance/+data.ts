import { getLogData } from '../../../../src/server/data/mongo';

export async function data() {
  const performance = await getLogData();
  return { performance };
}
export type Data = Awaited<ReturnType<typeof data>>;
