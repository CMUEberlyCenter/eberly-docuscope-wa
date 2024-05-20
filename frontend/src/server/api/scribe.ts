import { Request, Response, Router } from 'express';
import { readFile } from 'fs/promises';
import OpenAI from 'openai';
import format from 'string-format';
import { PromptData } from '../model/prompt';
import { OPENAI_API_KEY, SCRIBE_TEMPLATES } from '../settings';
import { ProblemDetails } from '../../lib/ProblemDetails';

let prompts: PromptData;

export const scribe = Router();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Read the prompts from a file with content caching.
 * @returns The contents of the prompts json file.
 */
async function readTemplates(): Promise<PromptData> {
  if (!prompts) {
    const file = await readFile(SCRIBE_TEMPLATES, 'utf8');
    prompts = JSON.parse(file);
  }
  return prompts;
}

scribe.post('/convert_notes', async (request: Request, response: Response) => {
  // TODO get assignment id from LTI token
  // Not necessary as assignment data is no longer needed.
  const { notes } = request.body;
  try {
    const { prompt, role, temperature } = (await readTemplates()).templates
      .notes_to_prose;
    if (!prompt || !role) {
      // runtime safety - should never happen
      console.warn('Malformed notes prompt data.');
      return response.status(404).send({
        type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404',
        title: 'Not Found',
        detail: 'Convert Notes template not found.',
        status: 404,
      } as ProblemDetails);
    }
    const content = format(prompt, {
      notes,
      target_lang: 'english',
      user_lang: 'english',
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
      model: 'gpt-4',
    });
    // TODO check for empty prose
    response.json(prose);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    if (err instanceof Error) {
      return response.status(500).send({
        type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500',
        title: 'Internal Srver Error',
        status: 500,
        detail: err.message,
        error: err,
      } as ProblemDetails);
    }
    return response.sendStatus(500);
  }
});

type TextPrompt = 'copyedit' | 'grammar' | 'logical_flow' | 'topics';
const scribeText =
  (key: TextPrompt) => async (request: Request, response: Response) => {
    const { text } = request.body;
    try {
      const { prompt, role, temperature } = (await readTemplates()).templates[
        key
      ];
      // const { prompt, role, temperature } = await findPromptByAssignmentAndTool(assignment, key);
      if (!prompt) {
        console.error(`No valid prompt for ${key}`);
        return response.status(404).send({
          type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404',
          title: 'Not Found',
          detail: `${key} template not found.`,
          status: 404,
        } as ProblemDetails);
      }
      const content = format(prompt, { text, user_lang: 'english', target_lang: 'english' });
      const chat = await openai.chat.completions.create({
        temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
        messages: [
          { role: 'system', content: role ?? 'You are a chatbot' },
          {
            role: 'user',
            content,
          },
        ],
        model: 'gpt-4',
      });
      return response.json(chat);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      if (err instanceof Error) {
        return response.status(500).send({
          type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500',
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
scribe.post('/logical_flow', scribeText('logical_flow'));
scribe.post('/topics', scribeText('topics'));

scribe.post(
  '/assess_expectation',
  async (request: Request, response: Response) => {
    const { text, expectation, description } = request.body;
    const user_lang = 'English';
    try {
      const { prompt, role, temperature } = (await readTemplates()).templates
        .expectation;
      if (!prompt) {
        console.error('Missing expectation analysis prompt.');
        return response.status(404).send({
          type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404',
          title: 'Not Found',
          detail: `expectation template not found.`,
          status: 404,
        } as ProblemDetails);
      }
      const content = format(prompt, {
        text,
        user_lang,
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
        model: 'gpt-4',
      });
      response.json(assessment);
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        return response.sendStatus(404);
      } else if (err instanceof Error) {
        return response.status(500).send({
          type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500',
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
