/** Optional language settings used in service requests. */
export interface LanguageSettingsRequest {
  user_lang?: string;
  target_lang?: string;
}

/** Assess a single expectation request. */
// export interface AssessExpectationRequest extends LanguageSettingsRequest {
//   text: string;
//   expectation: string;
//   description: string;
// }

/** Notes to prose request. */
export interface NotesRequest extends LanguageSettingsRequest {
  notes: string;
}

/** Request that posts a block of text. */
export interface TextRequest extends LanguageSettingsRequest {
  text: string;
}
