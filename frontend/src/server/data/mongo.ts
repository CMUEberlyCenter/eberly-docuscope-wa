import type { Messages } from '@anthropic-ai/sdk/resources/index.mjs';
import { MongoClient, ObjectId } from 'mongodb';
import { Analysis } from '../../lib/ReviewResponse';
import type { DbWritingTask, WritingTask } from '../../lib/WritingTask';
import { logger } from '../logger';
import { ACCESS_LEVEL, MONGO_CLIENT, MONGO_DB } from '../settings';
import { type ChatResponse } from './chat';
import { initWritingTasks } from './writing_task_description';

const client = new MongoClient(MONGO_CLIENT);

/** Database collection for storing writing tasks. */
const WRITING_TASKS = 'writing_tasks';
/** Database collection for logging. */
const LOGGING = 'logging';
/** Database collection for static snapshots. */
const SNAPSHOTS = 'snapshots';

/** Extra information stored in database about the writing task */
type WritingTaskDb = WritingTask & {
  _id?: ObjectId;
  path?: string;
  modified?: Date;
};

type Snapshot = {
  _id?: ObjectId;
  timestamp: Date;
  task: WritingTask;
  file: string; // html encoded
  filename?: string;
  segmented: string;
  tool_config: string[];
  analyses: Analysis[];
};

// Unused
// export async function findAllSnapshots(): Promise<Snapshot[]> {
//   const collection = client.db(MONGO_DB).collection<Snapshot>(SNAPSHOTS);
//   const snapshots = await collection.find<Snapshot>({}).toArray();
//   return snapshots;
// }

/**
 * Find all snapshots with minimal information.
 * Used for listing snapshots without loading full data.
 * @returns Array of snapshots with only _id, filename, timestamp, task.info.name, and tool_config.
 */
export async function findAllSnapshotsBasic(): Promise<Snapshot[]> {
  const collection = client.db(MONGO_DB).collection<Snapshot>(SNAPSHOTS);
  const snapshots = await collection
    .find<Snapshot>(
      {},
      {
        projection: {
          filename: 1,
          timestamp: 1,
          'task.info.name': 1,
          tool_config: 1,
        },
      }
    )
    .toArray();
  return snapshots;
}

export async function findSnapshotById(id: string): Promise<Snapshot> {
  const collection = client.db(MONGO_DB).collection<Snapshot>(SNAPSHOTS);
  if (!ObjectId.isValid(id) || id.length !== 24) {
    throw new ReferenceError(`Snapshot ${id} not found.`);
  }
  const _id = new ObjectId(id);
  const snapshot = await collection.findOne<Snapshot>(
    { _id },
    { projection: { _id: 0 } }
  );
  if (!snapshot) {
    throw new ReferenceError(`Snapshot ${id} not found.`);
  }
  return snapshot;
}
export async function insertSnapshot(
  task: WritingTask,
  file: string,
  segmented: string,
  filename?: string,
  tool_config?: string[],
  analyses?: Analysis[]
): Promise<ObjectId> {
  tool_config = tool_config ?? [];
  analyses = analyses ?? [];
  const collection = client.db(MONGO_DB).collection<Snapshot>(SNAPSHOTS);
  const ins = await collection.insertOne({
    task,
    file,
    filename,
    segmented,
    tool_config,
    analyses,
    timestamp: new Date(),
  });
  return ins.insertedId;
}
/**
 * Delete a snapshot by its ID.
 * @param id the identifier for the snapshot to delete.
 * @returns true if deletion is acknowledged.
 */
export async function deleteSnapshotById(id: string) {
  if (!ObjectId.isValid(id) || id.length !== 24) {
    throw new ReferenceError(`Snapshot ${id} not found.`);
  }
  const _id = new ObjectId(id);
  const del = await client
    .db(MONGO_DB)
    .collection(SNAPSHOTS)
    .deleteOne({ _id });
  if (!del.acknowledged || del.deletedCount !== 1) {
    throw new ReferenceError(`Delete operation for Snapshot ${id} failed`);
  }
  logger.info(`Deleted snapshot with id '${id}'`, {
    snapshotId: id,
    action: 'delete_snapshot',
  });
  return del.acknowledged;
}

/**
 * Add new analyses to a snapshot.
 * @param id the identifier for the snapshot to update.
 * @param analyses the analyses to add to the snapshot.
 * @returns the id of the updated snapshot.
 */
export async function updateSnapshotReviewsById(
  id: string | ObjectId,
  ...analyses: Analysis[]
) {
  if (typeof id === 'string' && (!ObjectId.isValid(id) || id.length !== 24)) {
    throw new ReferenceError(`Snapshot ${id} not found.`);
  }
  const _id = new ObjectId(id);
  const upd = await client
    .db(MONGO_DB)
    .collection<Snapshot>(SNAPSHOTS)
    .findOneAndUpdate(
      { _id },
      {
        $push: { analyses: { $each: analyses } },
        $set: { timestamp: new Date() },
      }
    );
  if (!upd) {
    throw new ReferenceError(`Update operation for Snapshot ${id} failed`);
  }
  logger.info(`Updated reviews for snapshot with id '${id}'`, {
    snapshotId: id,
    action: 'update_snapshot',
  });
  return upd._id;
}

export async function clearSnapshotAnalysesById(id: string | ObjectId) {
  if (typeof id === 'string' && (!ObjectId.isValid(id) || id.length !== 24)) {
    throw new ReferenceError(`Snapshot ${id} not found.`);
  }
  const _id = new ObjectId(id);
  const upd = await client
    .db(MONGO_DB)
    .collection<Snapshot>(SNAPSHOTS)
    .findOneAndUpdate(
      { _id },
      {
        $set: { analyses: [], timestamp: new Date() },
      }
    );
  if (!upd) {
    throw new ReferenceError(`Update operation for Snapshot ${id} failed`);
  }
  logger.info(`Cleared analyses for snapshot with id '${id}'`, {
    snapshotId: id,
    action: 'clear_snapshot_analyses',
  });
  return upd._id;
}

/**
 * Retrieves a given writing task specification from the database.
 * @param id the identifier for the desired writing task specification.
 * @returns
 */
export async function findWritingTaskById(id: string): Promise<WritingTask> {
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
    { 'info.id': id, public: true, 'info.access': ACCESS_LEVEL }, // Find if the id exists in the public tasks.
    // Only use public tasks so that instructor submittend tasks are not returned.
    // Unsure if ACCESS_LEVEL is necessary here.  ACCESS_LEVEL's meaning is not well defined.
    { projection: { _id: 0, path: 0, modified: 0 }, sort: { modified: -1 } }
  );
  if (!rules) {
    throw new ReferenceError(`Writing Task ${id} not found.`);
  }
  return rules;
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
 * Generator for retrieving the private writing task specifications.
 * @returns writing tasks where the public attribute is false. These are typically custom or in development tasks.
 */
async function* generateAllPrivateWritingTasks(): AsyncGenerator<DbWritingTask> {
  const collection = client
    .db(MONGO_DB)
    .collection<DbWritingTask>(WRITING_TASKS);
  const cursor = collection.find<DbWritingTask>(
    { public: false },
    { projection: { path: 0 } }
  );
  for await (const doc of cursor) {
    yield doc;
  }
}

/**
 * Retrieve the list of private writing task specifications. These are typically outdated, custom, or in development tasks.
 * @returns Array of writing tasks where the public attribute is false.
 */
export async function findAllPrivateWritingTasks(): Promise<DbWritingTask[]> {
  return Array.fromAsync(generateAllPrivateWritingTasks());
}

/**
 * Generator for retrieving the public writing task specifications.
 * This is used for populating writing task selections for publicly
 * facing versions.
 * @returns writing tasks where the public attribute is true.
 */
async function* generateAllPublicWritingTasks(): AsyncGenerator<DbWritingTask> {
  const collection = client
    .db(MONGO_DB)
    .collection<DbWritingTask>(WRITING_TASKS);
  const cursor = collection.find<DbWritingTask>(
    { public: true, 'info.access': ACCESS_LEVEL },
    { projection: { path: 0, modified: 0 } }
  );
  for await (const doc of cursor) {
    yield doc;
  }
}

/**
 * Retrieve the list of public writing task specifications.
 * This is used for populating writing task selection actions for publicly
 * facing versions.
 * @returns Array of writing tasks where the public attribute is true.
 */
export async function findAllPublicWritingTasks(): Promise<DbWritingTask[]> {
  return Array.fromAsync(generateAllPublicWritingTasks());
}

/**
 * Insert or update a public writing task description.
 * @param path path on the host filesystem (secondary identifier).
 * @param data JSON read from filesystem.
 * @returns id of the writing task in the database.
 */
async function upsertPublicWritingTask(path: string, data: WritingTask) {
  const collection = client
    .db(MONGO_DB)
    .collection<WritingTaskDb>(WRITING_TASKS);
  // There should only be one public writing task with a given id.
  // _id is the unique identifier for the document in MongoDB and is used for private tasks.
  const ins = await collection.replaceOne(
    { 'info.id': data.info.id, public: true },
    { ...data, public: true, path, modified: new Date() },
    { upsert: true }
  );
  logger.info(`Inserted writing task ${data.info.name} v${data.info.version}`, {
    writingTaskId: data.info.id,
    action: 'upsert_public_writing_task',
  });
  return ins.upsertedId;
}

/**
 * Delete a writing task based on the path in the host filesystem.
 * @param path path on the host filesystem (secondary identifier).
 * @returns true if deletion is acknowledged.
 */
async function deleteWritingTaskByPath(path: string) {
  const del = await client
    .db(MONGO_DB)
    .collection(WRITING_TASKS)
    .deleteOne({ path });
  if (!del.acknowledged || del.deletedCount !== 1) {
    throw new ReferenceError(
      `Delete operation for Writing Task at '${path}' failed`
    );
  }
  logger.info(`Deleted writing task at path '${path}'`, {
    path,
    action: 'delete_writing_task',
  });
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
      logger.warn(
        `Failed to connect to database: ${message}  Retrying in ${sleep}ms (${retry} attempts left)...`
      );
      retry -= 1;
      await timeout(sleep);
    }
  }

  // Make sure collection exists and has index on id
  const collection = client.db(MONGO_DB).collection<WritingTask>(WRITING_TASKS);
  await collection.createIndex({ 'info.id': 1, public: 1 });
  // Delete all public writing tasks to maintain consistency with filesystem.
  await collection.deleteMany({ public: true });

  await client.db(MONGO_DB).createCollection<LogData>(LOGGING, {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'meta',
    },
    expireAfterSeconds: 3.154e7, // 1 year // 7.884e+6, // 3 months //
  });

  const wtdShutdown = await initWritingTasks(
    upsertPublicWritingTask,
    deleteWritingTaskByPath
  );
  return async () => {
    await wtdShutdown();
    return client.close();
  };
}

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
  minTime: number;
  maxTime: number;
  avgInputTokens: number; // input_tokens
  avgOutputTokens: number; // output_tokens
  avgCacheCreate: number; // cache_creation_input_tokens
  maxCacheCreate: number; // cache_creation_input_tokens
  avgCacheRead: number; // cache_read_input_tokens
  maxCacheRead: number; // cache_read_input_tokens
  startTime: Date;
  endTime: Date;
};

async function* generateLogData(): AsyncGenerator<AggregateLogData> {
  const collection = client.db(MONGO_DB).collection<LogData>(LOGGING);
  const cursor = collection.aggregate<AggregateLogData>([
    {
      $group: {
        _id: '$meta.prompt',
        count: { $count: {} },
        startTime: { $min: '$timestamp' },
        endTime: { $max: '$timestamp' },
        avgTime: { $avg: '$performance_data.delta_ms' },
        minTime: { $min: '$performance_data.delta_ms' },
        maxTime: { $max: '$performance_data.delta_ms' },
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
  for await (const doc of cursor) {
    yield doc;
  }
}
export function getLogData(): Promise<AggregateLogData[]> {
  return Array.fromAsync(generateLogData());
}

// async function* generateLatestLogData(prompt: string): AsyncGenerator<LogData> {
//   const collection = client.db(MONGO_DB).collection<LogData>(LOGGING);
//   const cursor = collection.aggregate<LogData>(
//     [
//       {
//         $match: {
//           'meta.prompt': prompt,
//         },
//       },
//       { $sort: { timestamp: -1 } },
//       { $limit: 1 },
//     ],
//     { maxTimeMS: 60000, allowDiskUse: true }
//   );
//   for await (const doc of cursor) {
//     yield doc;
//   }
// }
// export function getLatestLogData(prompt: string): Promise<LogData[]> {
//   return Array.fromAsync(generateLatestLogData(prompt));
// }
