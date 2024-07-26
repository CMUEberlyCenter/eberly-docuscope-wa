import { Request, Response, Router } from 'express';
import OpenAI from 'openai';
import format from 'string-format';
import { Analysis } from '../../lib/ReviewResponse';
import { isWritingTask, WritingTask } from '../../lib/WritingTask';
import {
  findReviewById,
  insertReview,
  updateReviewByIdAddAnalysis,
} from '../data/mongo';
import { IdToken } from '../model/lti';
import { ReviewPrompt } from '../model/prompt';
import { Review } from '../model/review';
import { DEFAULT_LANGUAGE, OPENAI_API_KEY } from '../settings';
import { readTemplates } from './scribe';

export const reviews = Router();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const ANALYSES: ReviewPrompt[] = [
  'global_coherence',
  'key_points',
  'arguments',
];

const doReview = async (
  tool: ReviewPrompt,
  review: Review
): Promise<Analysis | undefined> => {
  try {
    const { prompt, role, temperature } = (await readTemplates()).templates[
      tool
    ];
    const user_lang =
      (isWritingTask(review.writing_task)
        ? review.writing_task.info.user_lang
        : undefined) ?? DEFAULT_LANGUAGE;
    const target_lang =
      (isWritingTask(review.writing_task)
        ? review.writing_task.info.target_lang
        : undefined) ?? DEFAULT_LANGUAGE;
    const content = format(prompt, {
      text: review.text,
      user_lang,
      target_lang,
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
      model: 'gpt-4',
    });
    const resp = chat.choices.at(0)?.message.content;
    if (!resp) {
      throw new Error('No content in OpenAI response.');
    }
    return {
      tool,
      datetime: new Date(),
      response: JSON.parse(resp),
    };
  } catch (err) {
    console.error(err);
  }
};

reviews.get('/:id', async (request: Request, response: Response) => {
  const { id } = request.params;
  try {
    response.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
    });
    response.flushHeaders();
    response.on('close', () => response.end());
    const review = await findReviewById(id);
    response.write(`data: ${JSON.stringify(review)}\n\n`);
    const analyses = await Promise.all(
      ANALYSES.filter(
        (tool) => !review.analysis.some((a) => a.tool === tool)
      ).map(async (tool) => {
        const analysis = await doReview(tool, review);
        if (analysis) {
          const upd = await updateReviewByIdAddAnalysis(id, analysis);
          if (!response.closed) {
            response.write(`data: ${JSON.stringify(upd)}\n\n`);
          }
        }
        return analysis;
      })
    );
    const final = await findReviewById(id);
    if (!response.closed) {
      response.write(`data: ${JSON.stringify(final)}\n\n`);
      return response.end();
    }
  } catch (err) {
    return response.sendStatus(404);
  }
});
reviews.delete('/:id', async (request: Request, response: Response) => {
  const { id } = request.params;
  console.log(`delete ${id}`);
  return response.sendStatus(200);
});

type ReviewBody = {
  text: string;
  document: string;
  writing_task: WritingTask | null;
};
reviews.post('/', async (request: Request, response: Response) => {
  const { text, document, writing_task } = request.body as ReviewBody;
  const token: IdToken | undefined = response.locals.token;
  try {
    const id = await insertReview(
      text,
      document,
      writing_task,
      token?.user,
      token?.platformContext.resource.id
    );
    return response.send(id);
  } catch (err) {
    return response.sendStatus(500);
  }
});
