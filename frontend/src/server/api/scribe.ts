import { Request, Response, Router } from 'express';
import { FileNotFound, InternalServerError } from '../../lib/ProblemDetails';
import { doChat } from '../data/chat';
import { NotesPrompt, ReviewPrompt, TextPrompt } from '../model/prompt';
import { DEFAULT_LANGUAGE } from '../settings';

export const scribe = Router();

const handleChatError = (err: unknown, response: Response) => {
  console.error(err);
  if (err instanceof ReferenceError) {
    return response.status(404).send(FileNotFound(err));
  }
  if (err instanceof Error) {
    return response.status(500).send(InternalServerError(err));
  }
  return response.sendStatus(500);
};

const scribeNotes =
  (key: NotesPrompt) => async (request: Request, response: Response) => {
    const { notes } = request.body;
    try {
      const chat = await doChat(key, {
        notes,
        target_lang: request.body.target_lang ?? DEFAULT_LANGUAGE,
        user_lang: request.body.user_lang ?? DEFAULT_LANGUAGE,
      });
      // TODO check for empty prose
      response.json(chat.response);
    } catch (err) {
      return handleChatError(err, response);
    }
  };
scribe.post('/convert_to_prose', scribeNotes('notes_to_prose'));
scribe.post('/convert_to_bullets', scribeNotes('notes_to_bullets'));

export const scribeText =
  (key: TextPrompt | ReviewPrompt) =>
  async (request: Request, response: Response) => {
    const { text } = request.body;
    try {
      const chat = await doChat(
        key,
        {
          text,
          user_lang: request.body.user_lang ?? DEFAULT_LANGUAGE,
          target_lang: request.body.target_lang ?? DEFAULT_LANGUAGE,
        },
        true
      );
      return response.json(chat.response);
    } catch (err) {
      return handleChatError(err, response);
    }
  };
scribe.post('/proofread', scribeText('grammar'));
scribe.post('/copyedit', scribeText('copyedit'));
scribe.post('/local_coherence', scribeText('local_coherence'));
scribe.post('/global_coherence', scribeText('global_coherence'));
scribe.post('/arguments', scribeText('arguments'));
scribe.post('/key_points', scribeText('key_points'));

scribe.post(
  '/assess_expectation',
  async (request: Request, response: Response) => {
    const { text, expectation, description } = request.body;
    const user_lang = request.body.user_lang ?? DEFAULT_LANGUAGE;
    const target_lang = request.body.target_lang ?? DEFAULT_LANGUAGE;
    try {
      const assessment = await doChat('expectation', {
        text,
        user_lang,
        target_lang,
        expectation,
        description,
      });
      response.json(assessment.response);
    } catch (err) {
      return handleChatError(err, response);
    }
  }
);
