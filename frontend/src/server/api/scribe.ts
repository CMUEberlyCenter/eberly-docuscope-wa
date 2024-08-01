import { Request, Response, Router } from 'express';
import { readFile } from 'fs/promises';
import OpenAI from 'openai';
import format from 'string-format';
import { ProblemDetails } from '../../lib/ProblemDetails';
import {
  NotesPrompt,
  PromptData,
  ReviewPrompt,
  TextPrompt,
} from '../model/prompt';
import {
  DEFAULT_LANGUAGE,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  SCRIBE_TEMPLATES,
} from '../settings';

let prompts: PromptData;

export const scribe = Router();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Read the prompts from a file with content caching.
 * @returns The contents of the prompts json file.
 */
export async function readTemplates(): Promise<PromptData> {
  if (!prompts) {
    const file = await readFile(SCRIBE_TEMPLATES, 'utf8');
    prompts = JSON.parse(file);
  }
  return prompts;
}

const scribeNotes =
  (key: NotesPrompt) => async (request: Request, response: Response) => {
    const { notes } = request.body;
    try {
      const templates = (await readTemplates()).templates;
      if (!(key in templates)) {
        console.warn(`${key} is not a valid template.`);
        return response.status(404).send({
          type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/404',
          title: 'Not Found',
          detail: `${key} template not found.`,
          status: 404,
        } as ProblemDetails);
      }
      const { prompt, role, temperature } = templates[key];
      if (!prompt || !role) {
        // runtime safety - should never happen
        console.warn('Malformed notes prompt data.');
        return response.status(404).send({
          type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/404',
          title: 'Not Found',
          detail: `${key} template not found.`,
          status: 404,
        } as ProblemDetails);
      }
      const content = format(prompt, {
        notes,
        target_lang: request.body.target_lang ?? DEFAULT_LANGUAGE,
        user_lang: request.body.user_lang ?? DEFAULT_LANGUAGE,
      });
      const prose = await openai.chat.completions.create({
        temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
        messages: [
          { role: 'system', content: role },
          {
            role: 'user',
            content,
          },
        ],
        model: OPENAI_MODEL,
      });
      // TODO check for empty prose
      response.json(prose);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      if (err instanceof Error) {
        return response.status(500).send({
          type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/500',
          title: 'Internal Srver Error',
          status: 500,
          detail: err.message,
          error: err,
        } as ProblemDetails);
      }
      return response.sendStatus(500);
    }
  };
scribe.post('/convert_to_prose', scribeNotes('notes_to_prose'));
scribe.post('/convert_to_bullets', scribeNotes('notes_to_bullets'));

export const scribeText =
  (key: TextPrompt | ReviewPrompt) =>
  async (request: Request, response: Response) => {
    const { text } = request.body;
    try {
      const { prompt, role, temperature } = (await readTemplates()).templates[
        key
      ];
      // const { prompt, role, temperature } = await findPromptByAssignmentAndTool(assignment, key);
      if (!prompt) {
        console.error(`No valid prompt for ${key}`);
        return response.status(404).send({
          type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/404',
          title: 'Not Found',
          detail: `${key} template not found.`,
          status: 404,
        } as ProblemDetails);
      }
      const content = format(prompt, {
        text,
        user_lang: request.body.user_lang ?? DEFAULT_LANGUAGE,
        target_lang: request.body.target_lang ?? DEFAULT_LANGUAGE,
      });
      const chat = await openai.chat.completions.create({
        temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
        messages: [
          { role: 'system', content: role ?? 'You are a chatbot' },
          {
            role: 'user',
            content,
          },
        ],
        model: OPENAI_MODEL,
      });
      return response.json(chat);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      if (err instanceof Error) {
        return response.status(500).send({
          type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/500',
          title: 'Internal Srver Error',
          status: 500,
          detail: err.message,
          error: err,
        } as ProblemDetails);
      }
      return response.sendStatus(500);
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
      const { prompt, role, temperature } = (await readTemplates()).templates
        .expectation;
      if (!prompt) {
        console.error('Missing expectation analysis prompt.');
        return response.status(404).send({
          type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/404',
          title: 'Not Found',
          detail: `expectation template not found.`,
          status: 404,
        } as ProblemDetails);
      }
      const content = format(prompt, {
        text,
        user_lang,
        target_lang,
        expectation,
        description,
      });
      const assessment = await openai.chat.completions.create({
        temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
        messages: [
          {
            role: 'system',
            content: role ?? 'You are a writing analyst.',
          },
          { role: 'user', content },
        ],
        model: OPENAI_MODEL,
      });
      response.json(assessment);
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        return response.sendStatus(404);
      } else if (err instanceof Error) {
        return response.status(500).send({
          type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/500',
          title: 'Internal Srver Error',
          status: 500,
          detail: err.message,
          error: err,
        } as ProblemDetails);
      }
      return response.sendStatus(500);
    }
  }
);

// scribe.post('/assess_expectations',
//   async (request:Request, response: Response) => {
//     const { text, task } = request.body;
//     const user_lang = task.info.user_lang ?? DefaultLanguage;
//     const target_lang = task.info.target_lang ?? DefaultLanguage;

//   }
// )
