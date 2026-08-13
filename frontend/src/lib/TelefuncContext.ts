import { GradeService, IdToken } from 'ltijs';
import { Settings } from './ToolSettings';
import { Prompt } from '#server/model/prompt.js';

export type TelefuncContext = {
  acceptLanguage?: string;
  gradeService?: GradeService;
  isAdmin: boolean;
  sessionId?: string;
  settings: Settings;
  token?: IdToken;
  user?: string | null;
  prompts: Map<string, Prompt>;
};
