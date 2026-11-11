import { authHandler } from '#/utils/auth';
import { headersMiddleware } from '#server/headersMiddleware.ts';
import { ltiConfigurationHandler } from '#server/lti.ts';
import {
  httpRequestDurationMiddleware,
  metricsHandler,
} from '#server/prometheus.ts';
import { sessionMiddleware } from '#server/sessionMiddleware.ts';

export default [
  httpRequestDurationMiddleware(),
  headersMiddleware(),
  sessionMiddleware(),
  authHandler(),
  metricsHandler(),
  ltiConfigurationHandler(),
];
