import { MongoClient, ObjectId } from 'mongodb';
import { WRITING_TASKS_PATH, MONGO_CLIENT } from '../settings';
import { Assignment } from '../model/assignment';
import { PathLike } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { WritingTask, isWritingTask } from '../../lib/WritingTask';
import { join } from 'path';
import { Review } from '../model/review';
import { Analysis } from '../../lib/ReviewResponse';

const client = new MongoClient(MONGO_CLIENT);

const ASSIGNMENTS = 'assignments';
const WRITING_TASKS = 'writing_tasks';
const REVIEW = 'review';

/**
 * Retrieve settings for a given assignment.
 * TODO move to deep linking parameters.
 * @param id identifier from lms.
 * @returns Stored information about the given assignment.
 * @throws ReferenceError if no such assignment exists.
 */
export async function findAssignmentById(id: string): Promise<Assignment> {
  try {
    const _id = new ObjectId(id);
    const collection = client
      .db('docuscope')
      .collection<Assignment>(ASSIGNMENTS);
    const assignment: Assignment | null = await collection.findOne<Assignment>({
      _id,
    });
    if (!assignment) {
      console.error(`Assignment ${id} not found!`);
      throw new ReferenceError(`Assignment ${id} no found.`);
    }
    const { writing_task } = assignment;
    if (!isWritingTask(writing_task)) {
      // replace with $lookup
      const task = await findWritingTaskById(writing_task.oid.toString());
      assignment.writing_task = task;
    }
    return assignment;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Retrieves a given writing task specification from the database.
 * @param id the identifier for the desired writing task specification.
 * @returns
 */
export async function findWritingTaskById(id: string): Promise<WritingTask> {
  try {
    const _id = new ObjectId(id);
    const collection = client.db('docuscope').collection(WRITING_TASKS);
    const rules = await collection.findOne<WritingTask>({ _id });
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
 * Retrieve the list of public writing task specifications.
 * This is used for populating writing task selection actions for publicly
 * facing versions.
 * @returns Array of writing tasks that are tagged as public.
 */
export async function findAllPublicWritingTasks(): Promise<WritingTask[]> {
  try {
    const collection = client
      .db('docuscope')
      .collection<WritingTask>(WRITING_TASKS);
    const cursor = collection.find<WritingTask>({ public: true });
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
 * Set the writing task for a given assignment.  This version stores the full
 * writing task in order to handle custom tasks.
 * Meant for LMS instructors to set writing tasks.
 * @param assignment Identifier for the given assignment from LMS.
 * @param writing_task The writing task to associate with the given assignment.
 */
export async function updateAssignmentWritingTask(
  assignment: string,
  writing_task: WritingTask
) {
  const collection = client.db('docuscope').collection<Assignment>(ASSIGNMENTS);
  const update = await collection.findOneAndUpdate(
    { assignment },
    { $set: { writing_task } },
    { upsert: true }
  );
  return update?._id;
}

/**
 * Updates the writing task for an assignment to reference a writing task.
 * @param assignment Identifier for the given assignment from LMS.
 * @param task Identifier for an existing writing task (eg) a public task.
 */
export async function updateAssignment(assignment: string, task: string) {
  const collection = client.db('docuscope').collection<Assignment>(ASSIGNMENTS);
  const writing_task = new ObjectId(task);
  const update = await collection.findOneAndUpdate(
    {
      assignment: assignment,
    },
    { $set: { 'writing_task.$ref': writing_task } },
    { upsert: true }
  );
  return update?._id;
}

/**
 * Reread the public writing tasks from the file system in order to syncronize
 * the two sources.  File system is considered the authoritative source.
 */
export async function updatePublicWritingTasks() {
  try {
    // filesystem tasks are considered public.
    const expectations = (await readPublicWritingTasks(WRITING_TASKS_PATH)).map(
      (e) => ({ ...e, public: true })
    );
    const collection = client
      .db('docuscope')
      .collection<WritingTask>(WRITING_TASKS);
    await collection.bulkWrite(
      expectations.map((data) => ({
        replaceOne: {
          filter: { public: true, 'info.name': data.info.name },
          replacement: data,
          upsert: true,
        },
      }))
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// Simple setTimeout promise wrapper.
function timeout(ms: number | undefined): Promise<undefined> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make sure connection is possible and populate database with filesystem writing tasks.
 */
export async function initDatabase(): Promise<void> {
  let retry = 30;
  const sleep = 5000;
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
  await updatePublicWritingTasks(); // Maybe not best to regenerate public records on startup for production.
}

async function readPublicWritingTasks(dir: PathLike): Promise<WritingTask[]> {
  const ret: WritingTask[] = [];
  try {
    const files = await readdir(dir);
    for (const file of files) {
      const path = join(dir.toString(), file);
      const stats = await stat(path);
      if (stats.isFile() && file.endsWith('.json')) {
        const content = await readFile(path, { encoding: 'utf8' });
        const json = JSON.parse(content) as WritingTask;
        ret.push(json);
      } else if (stats.isDirectory()) {
        const subdir = await readPublicWritingTasks(path);
        ret.push(...subdir);
      }
      // if not a directory or a json file, skip.
      // this recursion is unneccessary once fs.glob(join(dir, '**/*.json)) is finalized.
    }
    return ret;
  } catch (err) {
    console.error(err);
    return ret; // Should this return [] or current progress?
  }
}

/**
 * Retrieves the stored review data.
 * @param id Identifier for the cached review data.
 * @returns The current state of the review.
 */
export async function findReviewById(id: string) {
  try {
    const _id = new ObjectId(id);
    const collection = client.db('docuscope').collection<Review>(REVIEW);
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
 * @param text Plain text version of input to analyze.
 * @param document HTML version of input.
 * @param writing_task Writing task to use for analysis.
 * @param user User identifier from LMS.
 * @param assignment Assignment identifier from LMS.
 * @returns Identifier of the inserted review.
 */
export async function insertReview(
  text: string,
  document: string,
  writing_task: WritingTask | null,
  user?: string,
  assignment?: string
) {
  try {
    const collection = client.db('docuscope').collection<Review>(REVIEW);
    const ins = await collection.insertOne({
      writing_task,
      assignment,
      user,
      document,
      text,
      analysis: [],
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
    const collection = client.db('docuscope').collection<Review>(REVIEW);
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
  const collection = client.db('docuscope').collection<Review>(REVIEW);
  const result = await collection.deleteOne({ _id });
  if (!result.acknowledged || result.deletedCount !== 1) {
    throw new ReferenceError(`Deletion operation for Review ${id} failed.`);
  }
}

// export async function avgAnalysisTime() {
//   const collection = client.db('docuscope').collection<Review>(REVIEW);
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
