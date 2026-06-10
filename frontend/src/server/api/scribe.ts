import { resolveLanguageCode } from '#lib/languageCode.js';
import { BadRequestError } from '#lib/ProblemDetails.js';
import { getSettings } from '#server/getSettings.js';
import { type Request, type Response, Router } from 'express';
import { body } from 'express-validator';
import type { NotesRequest } from '../../lib/Requests';
import { doChat } from '../data/chat';
import { insertLog } from '../data/mongo';
import type { NotesPrompt } from '../model/prompt';
import { validate } from '../model/validate';
import { DEFAULT_LANGUAGE_SETTINGS } from '../settings';

export const scribe = Router();

const scribeNotes =
  (key: NotesPrompt) => async (request: Request, response: Response) => {
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const data = request.body as NotesRequest;
    // TODO check if user_lang is a language code and one that is supported.
    const language = data.user_lang
      ? resolveLanguageCode(data.user_lang)
      : (request.headers['accept-language']?.split(',')[0] ?? 'en');
    // Uses regex in case segmentor does not properly flag certain words as word-like.
    const wordCount = [
      ...new Intl.Segmenter(language, { granularity: 'word' }).segment(
        data.notes
      ),
    ].filter(
      (segment) => segment.isWordLike || segment.segment.match(/\w+/)
    ).length;
    const limit = getSettings().select_word_limit;
    if (wordCount > limit) {
      throw new BadRequestError(
        `Notes exceed the maximum word count of ${limit}`
      );
    }
    const chat = await doChat(
      key,
      {
        ...DEFAULT_LANGUAGE_SETTINGS,
        ...data,
        role: 'You are a copy editor and expert in grammatical mechanics, usage, and readability.',
      },
      controller.signal
    );
    // TODO check for empty prose
    insertLog(request.sessionID ?? 'index.html', chat);
    response.json(chat.response);
  };

const validate_notes = validate(body('notes').isString().trim().notEmpty());
scribe.post('/convert_to_prose', validate_notes, scribeNotes('notes_to_prose'));
scribe.post(
  '/convert_to_bullets',
  validate_notes,
  scribeNotes('notes_to_bullets')
);

// @deprecated, not currently used by frontend, may be useful for future text-based tools.
// const scribeText =
//   (key: TextPrompt | ReviewPrompt) =>
//     async (request: Request, response: Response) => {
//       const controller = new AbortController();
//       request.on('close', () => {
//         controller.abort();
//       });
//       const data = request.body as TextRequest;
//       // TODO check user_lang and selection word count limits.
//       const chat = await doChat(
//         key,
//         {
//           ...DEFAULT_LANGUAGE_SETTINGS,
//           ...data,
//         },
//         controller.signal,
//         true
//       );
//       response.json(chat.response);
//     };
// const validate_text = validate(body('text').isString().not().isEmpty());
// scribe.post('/copyedit', validate_text, scribeText('copyedit'));
// scribe.post('/local_coherence', validate_text, scribeText('local_coherence'));
