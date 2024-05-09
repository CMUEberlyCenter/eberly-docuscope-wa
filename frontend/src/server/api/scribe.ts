import { Request, Response, Router } from "express";
import OpenAI from "openai";
import format from 'string-format';
// import templates from '../../../static/templates.json';
import { PromptData } from "../../lib/Configuration";
// import { findPromptByAssignmentAndTool, findPromptByAssignmentExpectation } from "../data/data";
import { OPENAI_API_KEY, SCRIBE_TEMPLATES } from "../settings";
import { readFile } from "fs/promises";

let prompts: PromptData;

export const scribe = Router();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function readTemplates(): Promise<PromptData> {
  if (!prompts) {
    const file = await readFile(SCRIBE_TEMPLATES, 'utf8');
    prompts = JSON.parse(file);
  }
  return prompts;
}

scribe.post(
  '/convert_notes',
  async (request: Request, response: Response) => {
    // TODO get assignment id from LTI token
    const { notes } = request.body;
    try {
      const { prompt, role, temperature } = (await readTemplates()).templates.notes_to_prose;
      // const { genre, overview, prompt, role, temperature } = await findPromptByAssignmentAndTool(
      //   assignment,
      //   'notes_to_prose'
      // );
      if (!prompt || !role) {
        // runtime safety - should never happen
        console.warn('Malformed notes prompt data.');
        return response.sendStatus(404);
      }
      const content = format(prompt, { notes, target_lang: 'english', user_lang: 'english' });
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
      response.sendStatus(500);
    }
  }
);

type TextPrompt = 'copyedit' | 'grammar' | 'logical_flow' | 'topics';
const scribeText =
  (key: TextPrompt) => async (request: Request, response: Response) => {
    const { text } = request.body;
    try {
      const { prompt, role, temperature } = (await readTemplates()).templates[key];
      // const { prompt, role, temperature } = await findPromptByAssignmentAndTool(assignment, key);
      if (!prompt) {
        console.error(`No valid prompt for ${key}`);
        return response.sendStatus(404);
      }
      const content = format(prompt, { text, user_lang: 'english' });
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
    // if (!("expectation" in prompts.templates)) {
    //   console.error('expectation prompt not available.');
    //   return response.sendStatus(404);
    // }
    // const { prompt, role, temperature } = prompts.templates.expectation;
    const { text, expectation, description } = request.body;
    const user_lang = 'English';
    // const { assignment, text, expectation } = request.body;
    // if (!assignment) {
    //   console.error('No assignment for rule data fetch.');
    //   return response.sendStatus(400);
    // }
    try {
      const { prompt, role, temperature } = (await readTemplates()).templates.expectation
      // const { service, prompt } = await findPromptByAssignmentExpectation(assignment, expectation);
      if (!prompt) {
        console.warn('Malformed expectation prompt.', prompt);
        console.error(
          'Configuration file does not support expectation analysis.'
        );
        return response.sendStatus(502);
      }
      const content = format(prompt, { text, user_lang, expectation, description });
      const assessment = await openai.chat.completions.create({
        temperature: isNaN(Number(temperature))
          ? 0.0
          : Number(temperature),
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
      if (err instanceof ReferenceError) {
        console.error(err.message);
        return response.sendStatus(404);
      } else if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return response.sendStatus(500);
    }
  }
);
