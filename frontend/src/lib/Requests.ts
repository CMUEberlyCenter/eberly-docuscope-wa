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

/** Request that posts a block of text. */
// @deprecated not used anymore, tools that used it have beed removed.
// export interface TextRequest extends LanguageSettingsRequest {
//   text: string;
// }
