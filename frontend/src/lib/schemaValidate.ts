import Ajv from 'ajv';
import writing_task_schema from './WritingTask.schema.json';
// import { generateSchema, getProgramFromFiles } from 'typescript-json-schema';
// import { WritingTask } from './WritingTask';

// const writing_task = getProgramFromFiles([resolve("src/lib/WritingTask.ts")], process.cwd());
// const writing_task_schema = generateSchema(writing_task, "WritingTask")
const ajv = new Ajv({ allErrors: true });

export const validateWritingTask = ajv.compile(writing_task_schema);
