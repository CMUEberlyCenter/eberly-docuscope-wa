import { ReviewPrompt } from '../../lib/ReviewResponse';

/** Prompt data for formulating OpenAI requests. */
export type Prompt = {
  prompt: string;
  role?: string;
  temperature?: number | string;
};

export type NotesPrompt = 'notes_to_prose' | 'notes_to_bullets';
type ExpectationPrompt = 'expectation';
export type TextPrompt = 'copyedit' | 'grammar' | 'local_coherence';
export type PromptType =
  | NotesPrompt
  | ExpectationPrompt
  | TextPrompt
  | ReviewPrompt;

/** Prompt templates file json data. */
export type PromptData = {
  templates: Record<PromptType, Prompt>;
  info: {
    saved_at: string; // DateTime
  };
};
