import { readFile } from 'fs/promises';
import OpenAI from 'openai';
import format from 'string-format';
import { PromptData, PromptType } from '../model/prompt';
import { OPENAI_API_KEY, OPENAI_MODEL, SCRIBE_TEMPLATES } from '../settings';

export const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

let prompts: PromptData;
/**
 * Read the prompts from a file with content caching.
 * Note: server will need to be restarted to update prompts.
 * @returns The contents of the prompts json file.
 */
export async function readTemplates(): Promise<PromptData> {
  // TODO use fs.watch to detect file changes?
  if (!prompts) {
    const file = await readFile(SCRIBE_TEMPLATES, 'utf8');
    prompts = JSON.parse(file);
  }
  return prompts;
}

export async function doChat(
  key: PromptType,
  data: Record<string, string>,
  json?: boolean
) {
  const started = new Date();
  const { templates } = await readTemplates();
  if (!(key in templates)) {
    console.error(`${key} is not a valid template.`);
    throw new ReferenceError(`${key} template not found.`);
  }
  const { prompt, role, temperature } = templates[key];
  if (!prompt) {
    console.error(`Missing prompt for ${key} template.`);
    throw new Error(`Malformed prompt for ${key}.`);
  }
  const content = format(prompt, data);
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
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  const resp = chat.choices.at(0)?.message.content;
  if (!resp) {
    throw new Error('No content in OpenAI response.');
  }
  const finished = new Date();
  return {
    key,
    started,
    finished,
    delta_ms: finished.getTime() - started.getTime(),
    response: chat,
  };
}
