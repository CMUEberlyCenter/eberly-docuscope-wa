import { MongoClient, ObjectId } from "mongodb";
import { EXPECTATIONS, MONGO_CLIENT } from "../settings";
import { Assignment } from "../model/assignment";
import { PathLike } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { WritingTask } from "../../lib/WritingTask";
import { join } from "path";

const client = new MongoClient(MONGO_CLIENT);

const ASSIGNMENTS = 'assignments';
const WRITING_TASKS = 'writing_tasks';

/**
 * Retrieve settings for a given assignment.
 * TODO move to deep linking parameters.
 * @param id identifier from lms.
 * @returns Stored information about the given assignment.
 * @throws ReferenceError if no such assignment exists.
 */
export async function findAssignmentById(id: string): Promise<Assignment> {
  const collection = client.db('docuscope').collection<Assignment>(ASSIGNMENTS);
  // TODO dereference writing_task in query using $lookup
  const assignment: Assignment | null = await collection.findOne<Assignment>({
    assignment: id,
  });
  if (!assignment) {
    throw new ReferenceError(`Assignment ${id} no found.`);
  }
  return assignment;
}

export async function findWritingTaskIdByAssignment(id: string): Promise<ObjectId> {
  return (await findAssignmentById(id)).writing_task.oid;
}

export async function findWritingTaskById(id: string): Promise<WritingTask> {
  const _id = new ObjectId(id);
  const collection = client.db('docuscope').collection(WRITING_TASKS);
  const rules = await collection.findOne<WritingTask>({ _id });
  if (!rules) {
    throw new ReferenceError(`Expectation file ${id} not found.`);
  }
  return rules;
}

export async function findAllPublicWritingTasks(): Promise<WritingTask[]> {
  const collection = client.db('docuscope').collection<WritingTask>(WRITING_TASKS);
  const cursor = collection.find<WritingTask>({ public: true });
  const ret: WritingTask[] = [];
  for await (const doc of cursor) {
    ret.push(doc);
  }
  return ret;
}

export async function updateAssignment(assignment: string, task: string) {
  const collection = client.db('docuscope').collection<Assignment>(ASSIGNMENTS);
  const writing_task = new ObjectId(task);
  collection.updateOne({
    assignment: assignment,
  }, { $set: {"writing_task.$ref": writing_task }}, { upsert: true })
}

export async function updatePublicWritingTasks() {
  const collection = client.db('docuscope').collection<WritingTask>(WRITING_TASKS);
  const expectations = (await readPublicExpectations(EXPECTATIONS)).map(
    (e) => ({ ...e, public: true })
  );
  expectations.forEach((data) =>
    collection.replaceOne({ public: true, 'info.name': data.info.name }, data, {
      upsert: true,
    })
  );
}

export async function initDatabase(): Promise<void> {
  await client.connect();
  await updatePublicWritingTasks(); // Maybe not best to regenerate public records on startup for production.
  // const db = client.db('docuscope');
  // const configs = db.collection(WRITING_TASKS);
  // const config = await configs.updateOne({"info.name": "Change Proposal"}, {$set: changeProposal}, {upsert: true});
  // console.log(config);
  // const rules = config.upsertedId;
  // const assignments = db.collection('assignments');
  // const assignment = await assignments.updateOne({assignment: '5'}, {$set: {
  //   assignment: '5',
  //   rules,
  //   docuscope: false,
  //   scribe: true,
  //   notes_to_prose: true,
  //   logical_flow: true,
  //   grammar: true,
  //   copyedit: true,
  //   expectation: true,
  //   topics: true,
  //   text2speech: true,
  // } as Assignment}, {upsert: true});
  // console.log(assignment);
}

async function readPublicExpectations(
  dir: PathLike
): Promise<WritingTask[]> {
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
        const subdir = await readPublicExpectations(path);
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
