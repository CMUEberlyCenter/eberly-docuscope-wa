import { type Prompt } from '#server/model/prompt';
import { type SessionData } from 'express-session';
import { type Provider } from 'ltijs';
import { type Settings } from './ToolSettings';

export type TelefuncContext = {
  acceptLanguage?: string;
  isAdmin: boolean;
  sessionId?: string;
  settings: Settings;
  user?: string | null;
  prompts: Map<string, Prompt>;
  session?: SessionData | null;
  provider?: Provider;
  ltik?: string;
};
