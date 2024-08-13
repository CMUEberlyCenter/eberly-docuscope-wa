export interface LanguageSettingsRequest {
  user_lang?: string;
  target_lang?: string;
};

export interface AssessExpectationRequest extends LanguageSettingsRequest {
  text: string;
  expectation: string;
  description: string;
};

export interface NotesRequest extends LanguageSettingsRequest {
  notes: string;
}

export interface TextRequest extends LanguageSettingsRequest {
  text: string;
}
