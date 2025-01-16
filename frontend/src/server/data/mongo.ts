import { MongoClient, ObjectId } from 'mongodb';
import { Analysis } from '../../lib/ReviewResponse';
import { WritingTask } from '../../lib/WritingTask';
import { Review } from '../model/review';
import { EXPIRE_REVIEW_SECONDS, MONGO_CLIENT, MONGO_DB } from '../settings';
import { initWritingTasks } from './writing_task_description';

const client = new MongoClient(MONGO_CLIENT);

/** Database collection for storing writing tasks. */
const WRITING_TASKS = 'writing_tasks';
/** Database collection for storing reviews.  */
const REVIEW = 'review';

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
    const _id = new ObjectId(id);
    const collection = client.db(MONGO_DB).collection(WRITING_TASKS);
    const rules = await collection.findOne<WritingTask>(
      { _id },
      { projection: { _id: 0, path: 0, modified: 0 } }
    );
    if (!rules) {
      throw new ReferenceError(`Expectation file ${id} not found.`);
    }
    return rules;
  } catch (err) {
    console.error(err);
    throw err;
  }
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
      { public: true },
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

export async function upsertPublicWritingTask(path: string, data: WritingTask) {
  const collection = client
    .db(MONGO_DB)
    .collection<WritingTaskDb>(WRITING_TASKS);
  const ins = await collection.replaceOne(
    {
      'info.name': data.info.name,
      'info.version': data.info.version,
      path: path,
    },
    { ...data, public: true, path, modified: new Date() },
    {
      upsert: true,
    }
  );
  return ins.upsertedId;
}

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

/**
 * Reread the public writing tasks from the file system in order to syncronize
 * the two sources.  File system is considered the authoritative source.
 */
// export async function updatePublicWritingTasks() {
//   try {
//     // filesystem tasks are considered public.
//     const expectations = (await readPublicWritingTasks(WRITING_TASKS_PATH)).map(
//       (e) => ({ ...e, public: true })
//     );
//     const collection = client
//       .db(MONGO_DB)
//       .collection<WritingTask>(WRITING_TASKS);
//     await collection.updateMany(
//       { public: true },
//       {
//         $set: {
//           public: false,
//         },
//       }
//     ); // make all public private to delist old but without breaking links.
//     // update record if name and version match (assuming that if it matches it is an edit, probably not a safe assumption) else insert.
//     await collection.bulkWrite(
//       expectations.map((data) => ({
//         replaceOne: {
//           filter: {
//             'info.name': data.info.name,
//             'info.version': data.info.version,
//           },
//           replacement: { ...data, public: true },
//           upsert: true,
//         },
//       }))
//     );
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// }

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
        `Failed to connect to database: ${message}, retrying in ${sleep}ms (${retry} attempts left)...`
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
  // await updatePublicWritingTasks(); // Maybe not best to regenerate public records on startup for production.
  const wtdShutdown = await initWritingTasks(upsertPublicWritingTask, deleteWritingTaskByPath);
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
