/** Prompt data for formulating OpenAI requests. */
export type Prompt = {
  prompt: string;
  role?: string;
  temperature?: number | string;
};

type PromptType =
  | 'notes_to_prose'
  | 'logical_flow'
  | 'grammar'
  | 'copyedit'
  | 'expectation'
  | 'topics';

/** Prompt templates file json data. */
export type PromptData = {
  templates: Record<PromptType, Prompt>;
  info: {
    saved_at: string; // DateTime
  };
};
