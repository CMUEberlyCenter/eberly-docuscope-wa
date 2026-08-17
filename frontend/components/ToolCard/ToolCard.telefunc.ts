import { resolveLanguageCode } from '#lib/languageCode';
import {
  BadRequest,
  ChatStopError,
  errorToProblemDetails,
} from '#lib/ProblemDetails';
import { NotesRequest } from '#lib/Requests';
import { TelefuncContext } from '#lib/TelefuncContext';
import { anthropic, ErrorMessage } from '#server/data/chat';
import { insertLog } from '#server/data/mongo.js';
import { logger } from '#server/logger';
import { grade, isStudent, isTestUser } from '#server/model/lti.js';
import { NotesPrompt } from '#server/model/prompt';
import { ANTHROPIC_MAX_TOKENS, ANTHROPIC_MODEL } from '#server/settings';
import { IdToken } from 'ltijs';
import format from 'string-format';
import { getContext } from 'telefunc';

async function convertNotes(
  key: NotesPrompt,
  data: NotesRequest,
  token?: IdToken
) {
  const started = new Date();
  const { notes, user_lang } = data;
  let score = 0;
  if (!notes || notes.trim() === '') {
    return { error: BadRequest('No text provided.', 'empty_input') };
  }
  const {
    acceptLanguage,
    settings,
    onClose,
    sessionId,
    prompts,
    gradeService,
  } = getContext<TelefuncContext>();
  const language = user_lang
    ? resolveLanguageCode(user_lang)
    : (acceptLanguage?.split(',')[0] ?? 'en');
  const wordCount = [
    ...new Intl.Segmenter(language, { granularity: 'word' }).segment(notes),
  ].filter(
    (segment) => segment.isWordLike || segment.segment.match(/\w+/)
  ).length;
  const limit = settings.select_word_limit;
  if (wordCount > limit) {
    return {
      error: BadRequest(
        'Submitted input exceeds the maximum word count.',
        'word_count_exceeded',
        { count: wordCount, limit }
      ),
    };
  }
  try {
    const template = prompts.get(key);
    if (!template) {
      throw new ReferenceError(`Prompt template '${key}' not found.`);
    }
    const { prompt, role, temperature } = template;
    if (!prompt) {
      throw new Error(`Malformed prompt for '${key}'.`, { cause: template });
    }
    const content = format(prompt, data);
    const controller = new AbortController();
    onClose(() => controller.abort());
    const chat = await anthropic.messages.create(
      {
        max_tokens: ANTHROPIC_MAX_TOKENS,
        temperature: isNaN(Number(temperature)) ? 0.0 : Number(temperature),
        model: ANTHROPIC_MODEL,
        system: [
          {
            type: 'text',
            text:
              role ??
              'You are a writing assistant for students engaged in a writing assignment.',
          },
        ],
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      },
      { signal: controller.signal }
    );
    if (chat.type !== 'message') {
      throw new Error((chat as unknown as ErrorMessage).error.message, {
        cause: chat,
      });
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
          logger.warn(`Unhandled stop reason: ${chat.stop_reason}`, {
            cause: chat,
          });
      }
    }
    const result = chat.content.at(0);
    if (result?.type === 'text') {
      const finished = new Date();
      insertLog(token?.user ?? sessionId ?? 'index.html', {
        finished,
        key,
        delta_ms: finished.getTime() - started.getTime(),
        model: chat.model,
        usage: chat.usage,
      });
      score = 1.0; // Set the score to 1 if the conversion is successful.
      return { result: result.text };
    } else {
      throw new Error('Unexpected response format from the model.', {
        cause: chat,
      });
    }
  } catch (error) {
    logger.error('Error in convertNotes:', error);
    return { error: errorToProblemDetails(error) };
  } finally {
    if (gradeService && token && isStudent(token)) {
      if (isTestUser(token)) {
        logger.info(`Test user grading in draft mode with score: ${score}`);
      }
      // only attempt to grade if the user is a student and both gradeService and token are available.
      try {
        const gradeResult = await grade(gradeService, token, score); // Attempt to grade regardless of success or failure.
        logger.info('Grading result:', gradeResult);
      } catch (error) {
        logger.error('Error in grading:', error);
      }
    }
  }
}

export const onNotesToProse = (data: NotesRequest, token?: IdToken) =>
  convertNotes('notes_to_prose', data, token);
export const onNotesToBullets = (data: NotesRequest, token?: IdToken) =>
  convertNotes('notes_to_bullets', data, token);
