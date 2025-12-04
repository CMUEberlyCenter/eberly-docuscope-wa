import { Router } from 'express';
import { convertToHtml } from 'mammoth';
import multer from 'multer';
import { convertOptions } from '../../app/components/FileUpload/convertOptions';
import { BadRequestError } from '../../lib/ProblemDetails';
import { isWritingTask } from '../../lib/WritingTask';
import { insertPreview } from '../data/mongo';
import { segmentText } from '../data/segmentText';

export const preview = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });
preview.post('/', upload.single('document'), async (request, response) => {
  const { task, tool_config } = request.body;
  const writingTask = JSON.parse(task);
  if (!Array.isArray(tool_config)) {
    throw new BadRequestError('Tool config must be an array.');
  }
  if (tool_config.some((tool: unknown) => typeof tool !== 'string')) {
    throw new BadRequestError('Tool config must be an array of strings.');
  }
  const tools = tool_config as string[];
  if (!isWritingTask(writingTask)) {
    throw new BadRequestError('Invalid writing task JSON.');
  }
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
  console.log(typeof request.file.buffer.buffer);
  const { value, messages } = await convertToHtml(
    { buffer: request.file.buffer },
    convertOptions
  );
  if (messages.length) {
    throw new BadRequestError(
      `Error converting document to HTML: ${messages.map((m) => m.message).join('; ')}`
    );
  }
  const segmented = await segmentText(value);
  const dbId = await insertPreview(writingTask, value, segmented, tools);
  response.redirect(`/preview/${dbId.toString()}`);
});
