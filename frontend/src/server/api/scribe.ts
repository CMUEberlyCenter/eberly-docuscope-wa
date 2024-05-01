import { Request, Response, Router } from "express";
import OpenAI from "openai";
import format from 'string-format';
// import templates from '../../../static/templates.json';
// import { PromptData } from "../../lib/Configuration";
import { findPromptByAssignmentAndTool, findPromptByAssignmentExpectation } from "../data/data";
import { OPENAI_API_KEY } from "../settings";

// const prompts: PromptData = templates;

export const scribe = Router();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

scribe.post(
  '/convert_notes',
  async (request: Request, response: Response) => {
    // TODO get assignment id from LTI token
    const { assignment, notes } = request.body;
    try {
      const { genre, overview, prompt, role, temperature } = await findPromptByAssignmentAndTool(
        assignment,
        'notes_to_prose'
      );
      if (!genre || !prompt || !role) {
        // runtime safety - should never happen
        console.warn('Malformed notes prompt data.');
        return response.json({});
      }
      const content = format(prompt, { genre, notes, overview });
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
    const { assignment, text } = request.body;
    // const { prompt, role, temperature } = prompts.templates[key];
    try {
      const { prompt, role, temperature } = await findPromptByAssignmentAndTool(assignment, key);
      if (!prompt) {
        console.error(`No valid prompt for ${key}`);
        return response.sendStatus(404);
      }
      const content = format(prompt, { text });
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
    // const { text, expectation, description } = request.body;
    // const user_lang = 'English';
    const { assignment, text, expectation } = request.body;
    if (!assignment) {
      console.error('No assignment for rule data fetch.');
      return response.sendStatus(400);
    }
    try {
      const { service, prompt } = await findPromptByAssignmentExpectation(assignment, expectation);
      if (!prompt) {
        console.warn('Malformed expectation prompt.', prompt);
        console.error(
          'Configuration file does not support expectation analysis.'
        );
        return response.sendStatus(502);
      }
      const content = format(prompt, { text });
      const assessment = await openai.chat.completions.create({
        temperature: isNaN(Number(service.temperature))
          ? 0.0
          : Number(service.temperature),
        messages: [
          {
            role: 'system',
            content: service.role ?? 'You are a writing analyst.',
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
