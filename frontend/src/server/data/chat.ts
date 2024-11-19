import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import OpenAI from 'openai';
import format from 'string-format';
import { PromptData, PromptType } from '../model/prompt';
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_MODEL,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  SCRIBE_TEMPLATES,
} from '../settings';

const CLIENT: 'anthropic' | 'openai' = 'anthropic';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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

// function isOpenAIResponse(data: ChatCompletion | unknown): data is ChatCompletion {
//   return !!data && typeof data === 'object' && 'object' in data && data.object === 'chat.completion';
// }
// function isAnthropicResponse(data: Message | unknown): data is Message {
//   return !!data && typeof data === 'object' && 'type' in data && data.type === 'message';
// }

/**
 * Given a template key and instantiating data, perform the chat operation with a LLM.
 * @param key Which prompt to use.
 * @param data Data used to instantiate prompt.
 * @param json if true, returns a JSON object.
 * @returns a string unless json pramameter is truthy.
 */
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
  // TODO improve this logic
  let model: string;
  let response: string | object = '';
  if (CLIENT === 'openai' && OPENAI_API_KEY) {
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
    // TODO handle openai error
    const resp = chat.choices.at(0)?.message.content;
    if (!resp) {
      throw new Error('No content in OpenAI response.');
    }
    response = resp;
    model = chat.model;
  } else if (CLIENT === 'anthropic' && ANTHROPIC_API_KEY) {
    const chat = await anthropic.messages.create({
      max_tokens: ANTHROPIC_MAX_TOKENS,
      temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
      messages: [
        { role: 'assistant', content: role ?? 'You are a chatbot' },
        {
          role: 'user',
          content,
        },
      ],
      model: ANTHROPIC_MODEL,
    });
    model = chat.model;
    // TODO handle anthropic error
    const resp = chat.content.at(0);
    if (resp?.type === 'text') {
      response = resp.text;
    } else {
      console.warn(resp);
    }
  } else {
    throw new Error('No LLM configured.');
  }
  response = json ? JSON.parse(response) : response;
  const finished = new Date();
  return {
    key,
    started,
    finished,
    delta_ms: finished.getTime() - started.getTime(),
    model,
    response,
  };
}
