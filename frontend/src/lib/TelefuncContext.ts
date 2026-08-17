import { type Prompt } from '#server/model/prompt.js';
import { type SessionData } from 'express-session';
import { type GradeService } from 'ltijs';
import { type Settings } from './ToolSettings';

export type TelefuncContext = {
  acceptLanguage?: string;
  gradeService?: GradeService;
  isAdmin: boolean;
  sessionId?: string;
  settings: Settings;
  user?: string | null;
  prompts: Map<string, Prompt>;
  session?: SessionData | null;
};
