import Anthropic from '@anthropic-ai/sdk';
import format from 'string-format';
import { PromptType } from '../model/prompt';
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_MODEL,
} from '../settings';
import { findPromptById } from './prompts';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// let prompts: PromptData;
/**
 * Read the prompts from a file with content caching.
 * Note: server will need to be restarted to update prompts.
 * @returns The contents of the prompts json file.
 */
// export async function readTemplates(): Promise<PromptData> {
//   // TODO use fs.watch to detect file changes?
//   if (!prompts) {
//     const file = await readFile(PROMPT_TEMPLATES_PATH, 'utf8');
//     prompts = JSON.parse(file);
//   }
//   return prompts;
// }

// function isOpenAIResponse(data: ChatCompletion | unknown): data is ChatCompletion {
//   return !!data && typeof data === 'object' && 'object' in data && data.object === 'chat.completion';
// }
// function isAnthropicResponse(data: Message | unknown): data is Message {
//   return !!data && typeof data === 'object' && 'type' in data && data.type === 'message';
// }

/** Anthropic error message schema. */
type ErrorMessage = {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
};

/**
 * Given a template key and instantiating data, perform the chat operation with a LLM.
 * @param key Which prompt to use, key value of an entry in the templates object.
 * @param data Data used to instantiate the prompt.
 * @param json if true, returns a JSON object.
 * @returns a string unless json pramameter is truthy.
 */
export async function doChat(
  key: PromptType,
  data: Record<string, string>,
  json?: boolean
) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('No LLM configured.');
  }
  const started = new Date();
  const template = await findPromptById(key);
  if (!template) {
    console.error(`${key} is not a valid template.`);
    throw new ReferenceError(`${key} template not found.`);
  }
  // const { templates } = await readTemplates();
  // if (!(key in templates)) {
  //   console.error(`${key} is not a valid template.`);
  //   throw new ReferenceError(`${key} template not found.`);
  // }
  const { prompt, role, temperature } = template;
  if (!prompt) {
    console.error(`Missing prompt for ${key} template.`);
    throw new Error(`Malformed prompt for ${key}.`);
  }
  const content = format(prompt, data);
  let response: string | object = '';
  const chat = await anthropic.messages.create({
    max_tokens: ANTHROPIC_MAX_TOKENS,
    temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
    messages: [
      {
        role: 'assistant',
        content:
          role ??
          data.roll ??
          'You are a writing assistant for students engaged in a writing assignment.',
      },
      {
        role: 'user',
        content,
      },
    ],
    model: ANTHROPIC_MODEL,
    // stream: true, // https://github.com/anthropics/anthropic-sdk-typescript/blob/main/examples/cancellation.ts
  });
  const model = chat.model;
  // Handle anthropic error https://docs.anthropic.com/en/api/errors
  if (chat.type !== 'message') {
    // This likely should be in catch
    const err = chat as unknown as ErrorMessage; // typescript hack
    console.error(
      `Error response from ${chat.model} for request ${chat._request_id}`
    );
    console.error(chat);
    throw new Error(err.error.message, { cause: chat });
  }
  switch (chat.stop_reason) {
    case 'max_tokens':
      throw new Error('Token limit exceeded.', { cause: chat });
    case 'tool_use':
      throw new Error('No tool_use handler.', { cause: chat }); // TODO when implementing tools (eg) json formatting.
    case 'stop_sequence':
      throw new Error('No stop_sequence handler.', { cause: chat }); // Currently unused
    case 'end_turn':
      break;
  }
  // TODO handle server errors, 400-529, 413 in particular (request_too_large)
  /* try {
  await anthropic..create({...});
  } catch (err) {
    if (err.response) {
      // The request was made and the server responded with a status code 
      // that falls out of the range of 2xx
      console.error("API Error:", error.response.status, error.response.data);
    } else if (err.request) {
      // The request was made but no response was received
      console.error("Network Error:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error:", error.message);  }*/
  const resp = chat.content.at(0);
  if (resp?.type === 'text') {
    response = resp.text;
  } else {
    console.warn(resp);
  }
  // TODO catch json parsing errors, either here or in calling code
  try {
    response = json ? JSON.parse(response) : response;
  } catch (err) {
    // Output the json that failed to parse.
    console.error(err); // Most likely a SyntaxError
    console.error(response);
    throw err;
  }
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
