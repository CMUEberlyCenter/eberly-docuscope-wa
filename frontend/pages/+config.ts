import vikeReact from 'vike-react/config';
import type { Config } from 'vike/types';

// Default config (can be overridden by pages)
// https://vike.dev/config

export default {
  // https://vike.dev/head-tags
  title: 'myProse',
  description:
    'myProse is an environment for structuring writing tasks with the help of generative artificial intelligence and other natural language analysis tools.',

  extends: vikeReact,
  ssr: false,
  passToClient: ['settings'],
} satisfies Config;
