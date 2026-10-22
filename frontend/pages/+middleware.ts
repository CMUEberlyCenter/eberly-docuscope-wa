import { authHandler } from '#/utils/auth';
import { snapshotExpectationHandler } from '#server/api/snapshot.ts';
import { headersMiddleware } from '#server/headersMiddleware.ts';
// import { i18nHandler } from '#server/i18nMiddleware.ts';
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
  /*i18nHandler(),*/ snapshotExpectationHandler(),
  metricsHandler(),
  ltiConfigurationHandler(),
];
