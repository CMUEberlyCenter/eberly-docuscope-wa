import { type AuthSession } from '#/utils/auth';
import { type Prompt } from '#server/model/prompt';
import { type SessionData } from 'express-session';
import { type Provider } from 'ltijs';
import { type Settings } from './ToolSettings';

export type TelefuncContext = {
  auth?: AuthSession;
  acceptLanguage?: string;
  sessionId?: string;
  settings: Settings;
  prompts: Map<string, Prompt>;
  session?: SessionData | null;
  provider?: Provider;
  ltik?: string;
};
