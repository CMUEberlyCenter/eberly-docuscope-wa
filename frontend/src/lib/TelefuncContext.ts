import { type AuthSession } from '#/utils/auth';
import { type SessionData } from 'express-session';
import { type Provider } from 'ltijs';
import { type Settings } from './ToolSettings';

export type TelefuncContext = {
  auth?: AuthSession;
  acceptLanguage?: string;
  sessionId?: string;
  settings: Settings;
  session?: SessionData | null;
  provider?: Provider;
  ltik?: string;
};
