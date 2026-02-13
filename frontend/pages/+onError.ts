import { logger } from '../src/server/logger';

export const onError = (error: Error) => {
  logger.error(error);
};
