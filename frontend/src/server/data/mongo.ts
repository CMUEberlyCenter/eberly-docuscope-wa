import type { Messages } from '@anthropic-ai/sdk/resources/index.mjs';
import { MongoClient, ObjectId } from 'mongodb';
import type { Analysis } from '../../lib/ReviewResponse';
import type { WritingTask } from '../../lib/WritingTask';
import type { Review } from '../model/review';
import {
  ACCESS_LEVEL,
  EXPIRE_REVIEW_SECONDS,
  MONGO_CLIENT,
  MONGO_DB,
} from '../settings';
import { type ChatResponse } from './chat';
import { initWritingTasks } from './writing_task_description';

const client = new MongoClient(MONGO_CLIENT);

/** Database collection for storing writing tasks. */
const WRITING_TASKS = 'writing_tasks';
/** Database collection for storing reviews.  */
const REVIEW = 'review';
/** Database collection for logging. */
const LOGGING = 'logging';

/** Extra information stored in database about the writing task */
type WritingTaskDb = WritingTask & {
  _id?: ObjectId;
  path?: string;
  modified?: Date;
};

/**
 * Retrieves a given writing task specification from the database.
 * @param id the identifier for the desired writing task specification.
 * @returns
 */
export async function findWritingTaskById(id: string): Promise<WritingTask> {
  try {
    const collection = client.db(MONGO_DB).collection(WRITING_TASKS);
    if (ObjectId.isValid(id) && id.length === 24) {
      const _id = new ObjectId(id);
      const rules = await collection.findOne<WritingTask>(
        { _id },
        { projection: { _id: 0, path: 0, modified: 0 } }
      );
      if (!rules) {
        throw new ReferenceError(`Writing Task ${id} not found.`);
      }
      return rules;
    }
    const rules = await collection.findOne<WritingTask>(
      { 'info.id': id, public: true }, // Find if the id exists in the public tasks.
      // Only use public tasks so that instructor submittend tasks are not returned.
      { projection: { _id: 0, path: 0, modified: 0 }, sort: { modified: -1 } }
    );
    if (!rules) {
      throw new ReferenceError(`Writing Task ${id} not found.`);
    }
    return rules;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/** Make all public writing tasks private. */
async function privatizeWritingTasks() {
  return client
    .db(MONGO_DB)
    .collection<WritingTaskDb>(WRITING_TASKS)
    .updateMany(
      { public: true },
      {
        $set: {
          public: false,
        },
      }
    );
}

/**
 * Insert a non-public writing task into database.
 * @param writing_task
 * @returns The id of the record.
 */
export async function insertWritingTask(
  writing_task: WritingTask
): Promise<ObjectId> {
  const collection = client
    .db(MONGO_DB)
    .collection<WritingTaskDb>(WRITING_TASKS);
  const ins = await collection.insertOne({
    ...writing_task,
    public: false,
    modified: new Date(),
  });
  return ins.insertedId;
}

/**
 * Retrieve the list of public writing task specifications.
 * This is used for populating writing task selection actions for publicly
 * facing versions.
 * @returns Array of writing tasks where the public attribute is true.
 */
export async function findAllPublicWritingTasks(): Promise<WritingTask[]> {
  try {
    const collection = client
      .db(MONGO_DB)
      .collection<WritingTask>(WRITING_TASKS);
    const cursor = collection.find<WritingTask>(
      { public: true, 'info.access': ACCESS_LEVEL },
      { projection: { path: 0, modified: 0 } }
    );
    const ret: WritingTask[] = [];
    for await (const doc of cursor) {
      ret.push(doc);
    }
    return ret;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Insert or update a public writing task description.
 * @param path path on the host filesystem (secondary identifier).
 * @param data JSON read from filesystem.
 * @returns id of the writing task in the database.
 */
export async function upsertPublicWritingTask(path: string, data: WritingTask) {
  client
    .db(MONGO_DB)
    .collection<WritingTaskDb>(WRITING_TASKS)
    .updateMany(
      { public: true, 'info.id': data.info.id },
      {
        $set: {
          public: false,
          'info.id': undefined, // probably unnecessary, but just in case.
          // with future versions where the info.id is used preferentially,
          // old versions with the same id should be deleted instead of made private.
        },
      }
    );
  const collection = client
    .db(MONGO_DB)
    .collection<WritingTaskDb>(WRITING_TASKS);
  const ins = await collection.replaceOne(
    {
      'info.name': data.info.name,
      'info.version': data.info.version,
      path: path,
    },
    {
      ...data,
      public: data.info.access === ACCESS_LEVEL,
      path,
      modified: new Date(),
    },
    {
      upsert: true,
    }
  );
  return ins.upsertedId;
}

/**
 * Delete a writing task based on the path in the host filesystem.
 * @param path path on the host filesystem (secondary identifier).
 * @returns true if deletion is acknowledged.
 */
export async function deleteWritingTaskByPath(path: string) {
  const del = await client
    .db(MONGO_DB)
    .collection(WRITING_TASKS)
    .deleteOne({ path });
  if (!del.acknowledged || del.deletedCount !== 1) {
    throw new ReferenceError(
      `Delete operation for Writing Task at '${path}' failed`
    );
  }
  return del.acknowledged;
}

// Simple setTimeout promise wrapper.
function timeout(ms: number | undefined): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Make sure connection is possible and populate database with filesystem writing tasks.
 * @returns database shutdown function.
 */
export async function initDatabase() {
  let retry = 30;
  const sleep = 5000; // 5 seconds
  while (retry > 0) {
    try {
      await client.connect();
      retry = 0;
    } catch (err) {
      const { message } = err as Error;
      console.warn(
        `Failed to connect to database: ${message}  Retrying in ${sleep}ms (${retry} attempts left)...`
      );
      retry -= 1;
      await timeout(sleep);
    }
  }
  const collection = await client.db(MONGO_DB).createCollection<Review>(REVIEW);
  // Add expire index if necessary.
  const ExpireIndexName = 'expire';
  const indx = (await collection.indexes()).find((idx) => 'created' in idx.key);
  if (indx?.expireAfterSeconds !== EXPIRE_REVIEW_SECONDS) {
    if (indx?.name) await collection.dropIndex(indx.name);
    await collection.createIndex(
      { created: 1 },
      { name: ExpireIndexName, expireAfterSeconds: EXPIRE_REVIEW_SECONDS }
    );
  }

  await client.db(MONGO_DB).createCollection<LogData>(LOGGING, {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'meta',
    },
    expireAfterSeconds: 3.154e7, // 1 year // 7.884e+6, // 3 months //
  });

  await privatizeWritingTasks(); // "expire" old tasks from public listings without deleting them.
  // Want to keep old ones around so that already distributed links do not break.
  const wtdShutdown = await initWritingTasks(
    upsertPublicWritingTask,
    deleteWritingTaskByPath
  );
  return async () => {
    await wtdShutdown();
    return client.close();
  };
}

/**
 * Retrieve all of the writing tasks from the filesystem.
 * This is to be initiated in the public writing task root directory.
 * @param dir directory where to look for writing task files.
 * @returns List of valid writing tasks.
 */
// async function readPublicWritingTasks(dir: PathLike): Promise<WritingTask[]> {
//   const ret: WritingTask[] = [];
//   try {
//     const files = await readdir(dir);
//     for (const file of files) {
//       const path = join(dir.toString(), file);
//       const stats = await stat(path);
//       if (stats.isFile() && file.endsWith('.json')) {
//         const content = await readFile(path, { encoding: 'utf8' });
//         const json = JSON.parse(content);
//         if (isWritingTask(json)) {
//           // only add valid writing tasks.
//           ret.push(json);
//         }
//       } else if (stats.isDirectory()) {
//         const subdir = await readPublicWritingTasks(path);
//         ret.push(...subdir);
//       }
//       // if not a directory or a json file, skip.
//       // this recursion is unneccessary once fs.glob(join(dir, '**/*.json)) is finalized.
//     }
//     return ret;
//   } catch (err) {
//     console.error(err);
//     return ret; // Should this return [] or current progress?
//   }
// }

/**
 * Retrieves the stored review data.
 * @param id Identifier for the cached review data.
 * @returns The current state of the review.
 * @throws ReferenceError
 */
export async function findReviewById(id: string) {
  try {
    const _id = new ObjectId(id);
    const collection = client.db(MONGO_DB).collection<Review>(REVIEW);
    const review = await collection.findOne<Review>({ _id });
    if (!review) {
      throw new ReferenceError(`Document ${id} not found.`);
    }
    return review;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Inserts the initial version of the review data with an empty
 * analysis array.
 * @param document HTML version of input.
 * @param segmented Segmented version of document.  This is INVALID content for onTopic.
 * @param writing_task Writing task to use for analysis.
 * @param user User identifier from LMS.
 * @param assignment Assignment identifier from LMS.
 * @returns Identifier of the inserted review.
 */
export async function insertReview(
  document: string,
  segmented: string,
  writing_task: WritingTask | null,
  user?: string,
  assignment?: string
) {
  try {
    const collection = client.db(MONGO_DB).collection<Review>(REVIEW);
    const ins = await collection.insertOne({
      writing_task,
      assignment,
      user,
      document,
      segmented,
      analysis: [],
      created: new Date(),
    });
    return ins.insertedId;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Add the given analysis to a review.  Used for updating entry as analyses
 * are completed.
 * @param id Identifier for the review.
 * @param analyses An analysis result to add to the array of analyses.
 * @returns The updated review including the added analysis.
 */
export async function updateReviewByIdAddAnalysis(
  id: string,
  ...analyses: Analysis[]
) {
  try {
    const _id = new ObjectId(id);
    const collection = client.db(MONGO_DB).collection<Review>(REVIEW);
    const result = await collection.findOneAndUpdate(
      { _id },
      { $push: { analysis: { $each: analyses } } }
    );
    // TODO error handling.
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Attempt to delete Review from the database.
 * @param id The review identifier.
 * @throws ReferenceError
 */
export async function deleteReviewById(id: string) {
  const _id = new ObjectId(id);
  const collection = client.db(MONGO_DB).collection<Review>(REVIEW);
  const result = await collection.deleteOne({ _id });
  if (!result.acknowledged || result.deletedCount !== 1) {
    throw new ReferenceError(`Deletion operation for Review ${id} failed.`);
  }
}

// export async function avgAnalysisTime() {
//   const collection = client.db(MONGO_DB).collection<Review>(REVIEW);
//   const avg = await collection.aggregate([
//     {
//       '$unwind': {
//         'path': '$analysis',
//         'preserveNullAndEmptyArrays': false
//       }
//     },
//     {
//       "$group": {
//         _id: "$tool",
//         avg_ms: { $avg: "$analysis.delta_ms" }
//       }
//     }]);
//   return avg;
// }

type LogData = {
  _id?: string;
  timestamp: Date;
  meta: {
    prompt: string;
    model: Messages.Model;
  };
  performance_data: {
    delta_ms: number;
    session_id: string;
    usage: Messages.Usage;
  };
};
export function insertLog(
  session_id: string,
  { finished, key, delta_ms, model, usage }: ChatResponse<unknown>
) {
  const collection = client.db(MONGO_DB).collection<LogData>(LOGGING);
  collection.insertOne({
    timestamp: finished,
    meta: {
      prompt: key,
      model,
    },
    performance_data: {
      delta_ms,
      session_id,
      usage,
    },
  });
}

type AggregateLogData = {
  _id: string;
  count: number;
  avgTime: number;
  avgInputTokens: number; // input_tokens
  avgOutputTokens: number; // output_tokens
  avgCacheCreate: number; // cache_creation_input_tokens
  maxCacheCreate: number; // cache_creation_input_tokens
  avgCacheRead: number; // cache_read_input_tokens
  maxCacheRead: number; // cache_read_input_tokens
};

export async function getLogData(): Promise<AggregateLogData[]> {
  const collection = client.db(MONGO_DB).collection<LogData>(LOGGING);
  const cursor = collection.aggregate<AggregateLogData>([
    {
      $group: {
        _id: '$meta.prompt',
        count: { $count: {} },
        avgTime: { $avg: '$performance_data.delta_ms' },
        avgInputTokens: { $avg: '$performance_data.usage.input_tokens' },
        avgOutputTokens: { $avg: '$performance_data.usage.output_tokens' },
        avgCacheCreate: {
          $avg: '$performance_data.usage.cache_creation_input_tokens',
        },
        maxCacheCreate: {
          $max: '$performance_data.usage.cache_creation_input_tokens',
        },
        avgCacheRead: {
          $avg: '$performance_data.usage.cache_read_input_tokens',
        },
        maxCacheRead: {
          $max: '$performance_data.usage.cache_read_input_tokens',
        },
      },
    },
  ]);
  const ret: AggregateLogData[] = [];
  for await (const doc of cursor) {
    ret.push(doc);
  }
  return ret;
}

export async function getLatestLogData(prompt: string): Promise<LogData[]> {
  const collection = client.db(MONGO_DB).collection<LogData>(LOGGING);
  const cursor = collection.aggregate<LogData>(
    [
      {
        $match: {
          'meta.prompt': prompt,
        },
      },
      { $sort: { timestamp: -1 } },
      { $limit: 1 },
    ],
    { maxTimeMS: 60000, allowDiskUse: true }
  );
  const ret: LogData[] = [];
  for await (const doc of cursor) {
    ret.push(doc);
  }
  return ret;
}
