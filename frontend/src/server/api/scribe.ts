import { type Request, type Response, Router } from 'express';
import { body } from 'express-validator';
import type { NotesRequest, TextRequest } from '../../lib/Requests';
import type { ReviewPrompt } from '../../lib/ReviewResponse';
import { doChat } from '../data/chat';
import { insertLog } from '../data/mongo';
import type { NotesPrompt, TextPrompt } from '../model/prompt';
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
    insertLog(request.sessionID ?? 'index.html', chat); // TODO: use session id
    response.json(chat.response);
  };

const validate_notes = validate(body('notes').isString().not().isEmpty());
scribe.post('/convert_to_prose', validate_notes, scribeNotes('notes_to_prose'));
scribe.post(
  '/convert_to_bullets',
  validate_notes,
  scribeNotes('notes_to_bullets')
);

const scribeText =
  (key: TextPrompt | ReviewPrompt) =>
  async (request: Request, response: Response) => {
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const data = request.body as TextRequest;
    const chat = await doChat(
      key,
      {
        ...DEFAULT_LANGUAGE_SETTINGS,
        ...data,
      },
      controller.signal,
      true
    );
    response.json(chat.response);
  };
const validate_text = validate(body('text').isString().not().isEmpty());
// scribe.post('/proofread', validate_text, scribeText('grammar')); // no prompt for this anymore
scribe.post('/copyedit', validate_text, scribeText('copyedit'));
scribe.post('/local_coherence', validate_text, scribeText('local_coherence'));
