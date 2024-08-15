import { Request, Response, Router } from 'express';
import { FileNotFound, InternalServerError } from '../../lib/ProblemDetails';
import {
  AssessExpectationRequest,
  NotesRequest,
  TextRequest,
} from '../../lib/Requests';
import { doChat } from '../data/chat';
import { NotesPrompt, ReviewPrompt, TextPrompt } from '../model/prompt';
import { DEFAULT_LANGUAGE_SETTINGS } from '../settings';

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
    const data = request.body as NotesRequest;
    try {
      const chat = await doChat(key, {
        ...DEFAULT_LANGUAGE_SETTINGS,
        ...data,
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
    const data = request.body as TextRequest;
    try {
      const chat = await doChat(
        key,
        {
          ...DEFAULT_LANGUAGE_SETTINGS,
          ...data,
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
    const data = request.body as AssessExpectationRequest;
    try {
      const assessment = await doChat('expectation', {
        ...DEFAULT_LANGUAGE_SETTINGS,
        ...data,
      });
      response.json(assessment.response);
    } catch (err) {
      return handleChatError(err, response);
    }
  }
);
