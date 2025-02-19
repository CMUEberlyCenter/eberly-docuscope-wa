import { Request, Response, Router } from 'express';
import { body } from 'express-validator';
import { FileNotFound, InternalServerError } from '../../lib/ProblemDetails';
import {
  AssessExpectationRequest,
  NotesRequest,
  TextRequest,
} from '../../lib/Requests';
import { doChat } from '../data/chat';
import { NotesPrompt, TextPrompt } from '../model/prompt';
import { validate } from '../model/validate';
import { DEFAULT_LANGUAGE_SETTINGS } from '../settings';
import { ReviewPrompt } from '../../lib/ReviewResponse';

export const scribe = Router();

const handleChatError = (err: unknown, response: Response) => {
  console.error(err);
  if (err instanceof ReferenceError) {
    response.status(404).send(FileNotFound(err));
  } else if (err instanceof Error) {
    response.status(500).send(InternalServerError(err));
  } else {
    response.sendStatus(500);
  }
};

const scribeNotes =
  (key: NotesPrompt) => async (request: Request, response: Response) => {
    const data = request.body as NotesRequest;
    try {
      const chat = await doChat(key, {
        ...DEFAULT_LANGUAGE_SETTINGS,
        ...data,
        role: 'You are a copy editor and expert in grammatical mechanics, usage, and readability.',
      });
      // TODO check for empty prose
      response.json(chat.response);
    } catch (err) {
      handleChatError(err, response);
    }
  };

const validate_notes = validate(body('notes').isString());
scribe.post('/convert_to_prose', validate_notes, scribeNotes('notes_to_prose'));
scribe.post(
  '/convert_to_bullets',
  validate_notes,
  scribeNotes('notes_to_bullets')
);

export const scribeText =
  (key: TextPrompt | ReviewPrompt) =>
  async (request: Request, response: Response) => {
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const data = request.body as TextRequest;
    try {
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
    } catch (err) {
      handleChatError(err, response);
    }
  };
const validate_text = validate(body('text').isString());
// scribe.post('/proofread', validate_text, scribeText('grammar')); // no prompt for this anymore
scribe.post('/copyedit', validate_text, scribeText('copyedit'));
scribe.post('/local_coherence', validate_text, scribeText('local_coherence'));

// @depricated - unused and to be removed
scribe.post(
  '/assess_expectation',
  validate(
    body('text').isString(),
    body('expectation').isString(),
    body('description').isString()
  ),
  async (request: Request, response: Response) => {
    const data = request.body as AssessExpectationRequest;
    try {
      const assessment = await doChat('expectation', {
        ...DEFAULT_LANGUAGE_SETTINGS,
        ...data,
      });
      response.json(assessment.response);
    } catch (err) {
      handleChatError(err, response);
    }
  }
);
