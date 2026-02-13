import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { convertToHtml } from 'mammoth';
import multer from 'multer';
import {
  BadRequestError,
  ForbiddenError,
  GatewayError,
} from '../../lib/ProblemDetails';
import {
  Analysis,
  BasicReviewPrompts,
  ExpectationsData,
  ExpectationsOutput,
  isExpectationsData,
  isExpectationsOutput,
  ReviewPrompt,
  ReviewResponse,
} from '../../lib/ReviewResponse';
import {
  getExpectationByIndex,
  isEnabled,
  isWritingTask,
} from '../../lib/WritingTask';
import { basicAuthMiddleware } from '../../utils/basicAuth';
import { doChat, reviewData } from '../data/chat';
import {
  clearSnapshotAnalysesById,
  deleteSnapshotById,
  findSnapshotById,
  insertSnapshot,
  updateSnapshotReviewsById,
} from '../data/mongo';
import { doOnTopic } from '../data/ontopic';
import { segmentText } from '../data/segmentText';
import { getSettings } from '../getSettings';
import { validate } from '../model/validate';

export const snapshot = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

snapshot.post(
  '/',
  basicAuthMiddleware,
  upload.single('document'),
  validate(body('tool_config').isArray()),
  validate(body('tool_config.*').isString()),
  validate(
    body('task')
      .isString()
      .custom((value) => isWritingTask(JSON.parse(value)))
      .withMessage('Invalid writing task JSON.')
  ),
  async (request, response) => {
    const { task, tool_config } = request.body;
    const writingTask = JSON.parse(task);
    const tools = tool_config as string[];
    if (!request.file) {
      throw new BadRequestError('No document uploaded.');
    }
    if (
      request.file.mimetype !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      throw new BadRequestError('Uploaded document is not a valid .docx file.');
    }
    // TODO: check file size limits
    // TODO: handle image resizing server-side
    const { value, messages } = await convertToHtml(
      { buffer: request.file.buffer },
      {
        styleMap: 'u => u', // Preserve underline styles (str | str[] | regexp)
      }
    );
    if (messages.length) {
      throw new BadRequestError(
        `Error converting document to HTML: ${messages.map((m) => m.message).join('; ')}`
      );
    }
    const segmented = await segmentText(value);
    const dbId = await insertSnapshot(
      writingTask,
      value,
      segmented,
      request.file.originalname,
      tools
    );
    response.redirect(`/snapshot/${dbId.toString()}`);
  }
);

snapshot.get(
  '/:id',
  validate(param('id').isMongoId()),
  async (request, response) => {
    const id = request.params.id;
    response.send(await findSnapshotById(id));
  }
);
snapshot.delete(
  '/:id',
  basicAuthMiddleware,
  validate(param('id').isMongoId()),
  validate(query('cache_only').optional().isBoolean()),
  async (request, response) => {
    const id = request.params.id;
    const cache = request.query.cache_only === 'true';
    if (cache) {
      await clearSnapshotAnalysesById(id);
    } else {
      await deleteSnapshotById(id);
    }
    response.status(200).send();
  }
);

snapshot.get(
  '/:id/ontopic',
  validate(param('id').isMongoId()),
  async (request, response) => {
    const id = request.params.id;
    const settings = getSettings();
    if (!settings.term_matrix && !settings.sentence_density) {
      throw new ForbiddenError('Ontopic tool is not available!');
    }
    const snapshot = await findSnapshotById(id);
    const analysisData = snapshot.analyses.find(
      ({ tool }) => tool === 'ontopic'
    );
    if (analysisData) {
      return response.send(analysisData);
    }
    // generate analysis on the fly
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const data = await doOnTopic(snapshot.segmented, controller.signal);
    if (controller.signal.aborted) {
      return;
    }
    if (!data) {
      throw new GatewayError('No response from onTopic');
    }
    await updateSnapshotReviewsById(id, data);
    response.send(data);
  }
);

snapshot.get(
  '/:id/expectation/:index',
  validate(param('id').isMongoId()),
  validate(param('index').isInt({ min: 0 })),
  async (request, response) => {
    const { id, index } = request.params;
    const indexNum = parseInt(index, 10);
    const settings = getSettings();
    if (!settings.expectations) {
      throw new ForbiddenError('Expectation Analysis tool is not available!');
    }
    const snapshot = await findSnapshotById(id);
    if (!isEnabled(snapshot.task, 'expectations')) {
      throw new ForbiddenError(
        `Expectation analysis is not enabled for this writing task.`
      );
    }
    if (!snapshot.tool_config.includes('expectations')) {
      throw new ForbiddenError(
        `Expectation analysis is not configured for this snapshot.`
      );
    }
    const target = getExpectationByIndex(snapshot.task, indexNum);
    if (!target) {
      throw new ReferenceError(`No expectation found at index ${index}.`);
    }
    const analysisData = snapshot.analyses
      .filter((data) => isExpectationsData(data))
      .find(({ expectation }) => expectation === target.name);
    if (analysisData) {
      return response.send(analysisData);
    }
    // generate analysis on the fly
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const chat = await doChat<ExpectationsOutput>(
      'expectations',
      {
        ...reviewData({
          segmented: snapshot.segmented,
          writing_task: snapshot.task ?? null,
        }),
        expectation: target.name,
        description: target.description ?? '',
      },
      controller.signal,
      true,
      true
    );
    if (controller.signal.aborted) {
      return;
    }
    const { response: chat_response, finished: datetime } = chat;
    if (!chat_response)
      throw new Error(
        `NULL chat response for expectation ${index}: ${target.name}`
      );
    if (!isExpectationsOutput(chat_response)) {
      throw new Error(`Malformed results for ${index}: ${target.name}`, {
        cause: chat_response,
      });
    }
    const data: ExpectationsData = {
      tool: 'expectations',
      datetime,
      expectation: target.name,
      response: chat_response,
    };
    await updateSnapshotReviewsById(id, data);
    response.json(data);
  }
);

snapshot.get(
  '/:id/:analysis',
  validate(param('id').isMongoId()),
  validate(param('analysis').isString().isIn(BasicReviewPrompts)),
  async (request, response) => {
    // should this be behind authentication?
    const { id, analysis } = request.params;
    const settings = getSettings();
    if (analysis in settings && !settings[analysis as keyof typeof settings]) {
      throw new ForbiddenError(`${analysis} tool is not available!`);
    }
    const snapshot = await findSnapshotById(id);
    if (!isEnabled(snapshot.task, analysis)) {
      throw new ForbiddenError(
        `Analysis ${analysis} is not enabled for this writing task.`
      );
    }
    if (!snapshot.tool_config.includes(analysis)) {
      throw new ForbiddenError(
        `Analysis ${analysis} is not configured for this snapshot.`
      );
    }
    const analysisData = snapshot.analyses.find((a) => a.tool === analysis);
    if (analysisData) {
      return response.send(analysisData);
    }
    // generate analysis on the fly
    const controller = new AbortController();
    request.on('close', () => {
      controller.abort();
    });
    const chat = await doChat<ReviewResponse>(
      analysis as ReviewPrompt,
      reviewData({
        segmented: snapshot.segmented,
        writing_task: snapshot.task ?? null,
      }),
      controller.signal,
      true,
      true
    );
    if (controller.signal.aborted) {
      return;
    }
    const { response: chat_response, finished: datetime } = chat;
    if (!chat_response) throw new Error(`NULL chat response for ${analysis}`);
    if (typeof chat_response === 'string') {
      throw new Error(chat_response); // if string, throw as error
    }
    const data: Analysis = {
      tool: analysis as ReviewPrompt,
      datetime,
      response: chat_response,
    } as Analysis; // FIXME typescript shenanigans
    await updateSnapshotReviewsById(id, data);
    response.json(data);
  }
);

// UNUSED API endpoint to get all previews
// preview.get('/', async (_request, response) => {
//   const previews = await findAllPreviews();
//   response.send(previews);
// });
