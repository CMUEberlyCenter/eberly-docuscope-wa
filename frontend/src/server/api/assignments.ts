import { Request, Response, Router } from 'express';
import change_proposal from '../../../public/expectations/change_proposal.json'; // FIXME Temp load from file.
import { findFileIdByAssignment, updateAssignment } from '../data/data';
import { ConfigurationData } from '../../lib/Configuration';

export const assignments = Router();

const changeProposal = change_proposal as ConfigurationData;

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

assignments.get(
  '/:assignment/file_id',
  async (request: Request, response: Response) => {
    const { assignment } = request.params;
    try {
      const data = await findFileIdByAssignment(assignment);
      if (data) {
        response.json(data);
      } else {
        response.sendStatus(404);
      }
    } catch (err) {
      console.error(err);
      response.sendStatus(500);
    }
  }
);

assignments.get(
  '/:assignment/configuration',
  async (request: Request, response: Response) => {
    // not currently used, but will be useful for deep-linking.
    const { assignment } = request.params;
    try {
      // const rules = await findFileByAssignment(assignment);
      // response.json(rules);
      // FIXME temp using static
      if (assignment === 'global') return response.json(changeProposal);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(404);
    }
  }
);
