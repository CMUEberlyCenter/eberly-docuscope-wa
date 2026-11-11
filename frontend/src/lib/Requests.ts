/** Optional language settings used in service requests. */
export interface LanguageSettingsRequest {
  user_lang?: string;
  target_lang?: string;
}

interface LtikRequest {
  ltik?: string;
}

/** Assess a single expectation request. */
// export interface AssessExpectationRequest extends LanguageSettingsRequest {
//   text: string;
//   expectation: string;
//   description: string;
// }

/** Notes to prose request. */
export interface NotesRequest extends LanguageSettingsRequest, LtikRequest {
  notes: string;
}

export type ExpectationRequest = {
  /** Index of the expectation in the writing task. */
  index: number;
  /** The user's document. */
  document?: string;
  /** The id of the writing task. */
  writing_task?: string;
};
