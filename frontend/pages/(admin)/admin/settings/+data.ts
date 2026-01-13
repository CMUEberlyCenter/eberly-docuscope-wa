import {
  ACCESS_LEVEL,
  ANTHROPIC_MODEL,
  DEFAULT_LANGUAGE,
} from '../../../../src/server/settings';

export async function data() {
  return {
    ACCESS_LEVEL,
    ANTHROPIC_MODEL,
    DEFAULT_LANGUAGE,
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
