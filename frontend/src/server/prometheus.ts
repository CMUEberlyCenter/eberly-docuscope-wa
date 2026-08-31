import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from '@prometheus-io/client';
import type { RequestHandler, Express } from 'express';
import { type ChatResponse } from './data/chat';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [],
});
const myprosePromptDuration = new Histogram({
  name: 'myprose_prompt_duration_seconds',
  help: 'Duration of the prompt generation',
  labelNames: ['key'],
  registers: [],
});
const myprosePromptTokenCacheCreationTotal = new Counter({
  name: 'myprose_prompt_token_cache_creation_total',
  help: 'Number of prompt tokens created',
  labelNames: ['key'],
  registers: [],
});
const myprosePromptCacheReadTotal = new Counter({
  name: 'myprose_prompt_cache_read_total',
  help: 'Number of prompt cache reads',
  labelNames: ['key'],
  registers: [],
});
const myproseInputTokensTotal = new Counter({
  name: 'myprose_input_tokens_total',
  help: 'Number of input tokens',
  labelNames: ['key'],
  registers: [],
});
const myproseOutputTokensTotal = new Counter({
  name: 'myprose_output_tokens_total',
  help: 'Number of output tokens',
  labelNames: ['key'],
  registers: [],
});
const upGauge = new Gauge({
  name: 'up',
  help: 'Indicates if the application is up and running (1 for up, 0 for down)',
  registers: [],
});

const MyProseMetrics = [
  myprosePromptDuration,
  myprosePromptTokenCacheCreationTotal,
  myprosePromptCacheReadTotal,
  myproseInputTokensTotal,
  myproseOutputTokensTotal,
];

export const initializePrometheusMetrics = (app: Express) => {
  register.clear(); // Clear the default registry to avoid duplicate metrics in case of hot reloads.
  MyProseMetrics.forEach((metric) => register.registerMetric(metric)); // Register custom metrics to the default registry
  collectDefaultMetrics({ register }); // Register default metrics to the default registry
  register.registerMetric(httpRequestDuration); // Register the HTTP request duration histogram
  register.registerMetric(upGauge); // Register the up gauge metric
  upGauge.set(1); // Set the gauge to 1 to indicate that the application is up and running
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  // add duration middleware to measure request durations after metrics so that the /metrics endpoint is not included in the metrics.
  app.use(httpRequestDurationMiddleware);
};

const httpRequestDurationMiddleware: RequestHandler = (req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const durationSeconds = end();
    const path = req.route?.path ?? req.path; // Use req.route.path to get template path if available, otherwise fallback to req.path

    httpRequestDuration.observe(
      {
        method: req.method,
        path: typeof path === 'string' ? path : 'unknown',
        status_code: String(res.statusCode),
      },
      durationSeconds
    );
  });

  next();
};

/**
 * Update Prometheus LLM metrics based on the provided ChatResponse.
 * @param param0 The ChatResponse object containing the metrics to update.
 */
export const countPrompt = ({
  key,
  delta_ms,
  usage,
}: ChatResponse<unknown>) => {
  myprosePromptDuration.observe({ key }, delta_ms / 1000);
  myprosePromptTokenCacheCreationTotal.inc(
    { key },
    usage.cache_creation_input_tokens ?? 0
  );
  myprosePromptCacheReadTotal.inc({ key }, usage.cache_read_input_tokens ?? 0);
  myproseInputTokensTotal.inc({ key }, usage.input_tokens ?? 0);
  myproseOutputTokensTotal.inc({ key }, usage.output_tokens ?? 0);
};
