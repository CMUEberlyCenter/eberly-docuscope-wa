import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/index.mjs';
import format from 'string-format';
import { ChatStopError } from '../../lib/ProblemDetails';
import type { PromptType } from '../model/prompt';
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_MODEL,
} from '../settings';
import { findPromptById } from './prompts';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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
 * @param signal AbortSignal to cancel the request.
 * @param json if true, returns a JSON object.
 * @param cache if true, adds system caching of the input text and description.
 * @returns a string unless json pramameter is truthy.
 */
export async function doChat<T>(
  key: PromptType,
  data: Record<string, string>,
  signal?: AbortSignal,
  json?: boolean,
  cache?: boolean
) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('No LLM configured.'); // should this be 502?
  }
  const started = new Date();
  const template = await findPromptById(key);
  if (!template) {
    console.error(`${key} is not a valid template.`);
    throw new ReferenceError(`${key} template not found.`);
  }
  const { prompt, role, temperature } = template;
  if (!prompt) {
    console.error(`Missing prompt for ${key} template.`);
    throw new Error(`Malformed prompt for ${key}.`);
  }
  const content = format(prompt, data);
  let response: string | T = '';
  const json_assistant: MessageParam = {
    role: 'assistant',
    content:
      content.match(/Your JSON response must begin with `([^`]*)`/)?.at(1) ??
      '',
  };
  const caching: TextBlockParam[] = [];
  if (cache) {
    const inputTemplate = await findPromptById('input_text');
    if (!inputTemplate) {
      console.error('Unable to locate input_text template.');
      throw new ReferenceError('Unable to locate input_text template.');
    }
    const text_cache: TextBlockParam = {
      type: 'text',
      text: format(inputTemplate.prompt, data),
      cache_control: { type: 'ephemeral' },
    };
    caching.push(text_cache);
  }
  const chat = await anthropic.messages.create(
    {
      max_tokens: ANTHROPIC_MAX_TOKENS,
      temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
      system: [
        {
          type: 'text',
          text:
            role ?? // if loaded from templates.json (old style), deprecated
            data.roll ?? // set by calling function (used by notes_to_* tools)
            'You are a writing assistant for students engaged in a writing assignment.',
        },
        ...caching,
      ],
      messages: [
        {
          role: 'user',
          content,
        },
        // JSON response assistant needs to come last!
        ...(json ? [json_assistant] : []),
      ],
      model: ANTHROPIC_MODEL,
      // metadata: {
      //   user_id: '' // TODO set user id based on hash of product+hostname
      // }
      // stream: true, // https://github.com/anthropics/anthropic-sdk-typescript/blob/main/examples/cancellation.ts
    },
    {
      signal,
    }
  );
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
  if (chat.stop_reason) {
    switch (chat.stop_reason) {
      case 'max_tokens':
        throw new ChatStopError('Token limit exceeded.', { cause: chat });
      case 'tool_use':
        throw new ChatStopError('No tool_use handler.', { cause: chat }); // TODO when implementing tools (eg) json formatting.
      case 'stop_sequence':
        throw new ChatStopError('No stop_sequence handler.', { cause: chat }); // Currently unused
      case 'end_turn':
        break;
      case 'refusal':
        throw new ChatStopError('The model refused to answer.', {
          cause: chat,
        });
      case 'pause_turn':
        break;
      default:
        console.warn(`Unhandled stop reason: ${chat.stop_reason}`);
    }
  }
  const resp = chat.content.at(0);
  if (resp?.type === 'text') {
    response = resp.text;
  } else {
    console.warn(resp);
  }
  try {
    if (json) {
      // Expecting JSON response, sometimes the model will fence the JSON in ```json ... ```
      // Using json_assistant and looking for "begin with" seems to help with this
      // but leaving this in case the model still fences it or fails to find the magic string.
      const unfenced = response
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
      response = JSON.parse(`${json_assistant.content}${unfenced}`) as T;
    }
  } catch (err) {
    // Output the json that failed to parse.
    console.error(err); // Most likely a SyntaxError
    console.error('---- Prompt used ----');
    console.error(content);
    console.error('---- end of prompt ----');
    console.error('---- Failed to parse JSON response ----');
    console.error(response);
    console.error('---- end of response ----');
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
    usage: chat.usage,
  };
}

export type ChatResponse<T = string> = Awaited<ReturnType<typeof doChat<T>>>;
