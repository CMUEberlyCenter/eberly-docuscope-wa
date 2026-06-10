import { getLogData, getSessionData } from '#server/data/mongo';

export async function data() {
  const performance = await getLogData();
  const session = await getSessionData();
  return { performance, session };
}
export type Data = Awaited<ReturnType<typeof data>>;
