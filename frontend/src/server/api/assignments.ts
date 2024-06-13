import { Request, Response, Router } from 'express';
//import change_proposal from '../../../private/writing_tasks/Change Proposal (2024.05.19).json'; // FIXME Temp load from file.
// import { WritingTask } from '../../lib/WritingTask';
import { updateAssignment } from '../data/mysql';

export const assignments = Router();

//const changeProposal = change_proposal as WritingTask;

assignments.post(
  '/:assignment/assign',
  async (request: Request, response: Response) => {
    // TODO add role check to see if LTI user is authorized to change
    // TODO get assignment from LTI parameters instead of reflected from interface
    const { assignment } = request.params;
    const { id } = request.body;
    console.log(`Assigning ${id} to assignment: ${assignment}`);
    try {
      await updateAssignment(assignment, id);
      response.sendStatus(201);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  }
);

// assignments.get(
//   '/:assignment/file_id',
//   async (request: Request, response: Response) => {
//     const { assignment } = request.params;
//     try {
//       const data = await findWritingTaskIdByAssignment(assignment);
//       if (data) {
//         response.json(data);
//       } else {
//         return response.status(404).send({
//           type: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404',
//           title: 'Not Found',
//           detail: '.',
//           status: 404,
//         } as ProblemDetails);
//         }
//     } catch (err) {
//       console.error(err);
//       response.sendStatus(500);
//     }
//   }
// );

assignments.get(
  '/:assignment/configuration',
  async (request: Request, response: Response) => {
    // not currently used, but will be useful for deep-linking.
    // const { assignment } = request.params;
    try {
      // const rules = await findFileByAssignment(assignment);
      // response.json(rules);
      // FIXME temp using static
      //if (assignment === 'global') return response.json({});
      response.sendStatus(410);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(404);
    }
  }
);
