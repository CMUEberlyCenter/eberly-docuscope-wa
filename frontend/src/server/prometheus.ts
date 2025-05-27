import { type Request, type Response, Router } from 'express';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  register,
} from 'prom-client';
import { InternalServerError } from '../lib/ProblemDetails';
import { type ChatResponse } from './data/chat';

collectDefaultMetrics();

////////// Metrics Endpoint /////////////
export const metrics = Router();
metrics.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).send(InternalServerError(err));
  }
});

export const myproseSessionErrorsTotal = new Counter({
  name: 'myprose_session_errors_total',
  help: 'Number of errors in the session store',
});

const myprosePromptDuration = new Histogram({
  name: 'myprose_prompt_duration_seconds',
  help: 'Duration of the prompt generation',
  labelNames: ['key'],
});
const myprosePromptTokenCacheCreationTotal = new Counter({
  name: 'myprose_prompt_token_cache_creation_total',
  help: 'Number of prompt tokens created',
  labelNames: ['key'],
});
const myprosePromptCacheReadTotal = new Counter({
  name: 'myprose_prompt_cache_read_total',
  help: 'Number of prompt cache reads',
  labelNames: ['key'],
});
const myproseInputTokensTotal = new Counter({
  name: 'myprose_input_tokens_total',
  help: 'Number of input tokens',
  labelNames: ['key'],
});
const myproseOutputTokensTotal = new Counter({
  name: 'myprose_output_tokens_total',
  help: 'Number of output tokens',
  labelNames: ['key'],
});

export const countPrompt = ({ key, delta_ms, usage }: ChatResponse<any>) => {
  myprosePromptDuration.observe({ key }, delta_ms / 1000);
  myprosePromptTokenCacheCreationTotal.inc(
    { key },
    usage.cache_creation_input_tokens ?? 0
  );
  myprosePromptCacheReadTotal.inc({ key }, usage.cache_read_input_tokens ?? 0);
  myproseInputTokensTotal.inc({ key }, usage.input_tokens ?? 0);
  myproseOutputTokensTotal.inc({ key }, usage.output_tokens ?? 0);
};
