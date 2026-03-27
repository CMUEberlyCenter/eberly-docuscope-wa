import { logger } from '#server/logger';

export const onError = (error: Error) => {
  logger.error(error);
};
