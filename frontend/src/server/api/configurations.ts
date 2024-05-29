import { Router, Request, Response } from 'express';
import { findAllFiles, findWritingTaskById, storeFile } from '../data/mysql';

export const configurations = Router();

configurations.get('/:fileId', async (request: Request, response: Response) => {
  const fileId = request.params.fileId;
  try {
    const data = await findWritingTaskById(fileId);
    if (data) {
      response.send(data);
    } else {
      response.sendStatus(404);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    response.sendStatus(500);
  }
});

configurations
  .route('')
  .post(async (request: Request, response: Response) => {
    // TODO limit to instructor/administrative roles.
    if (!request.files) {
      response.status(400).send({
        status: false,
        message: 'No file uploaded',
      });
    } else {
      console.log('Processing file upload...');
      // TODO check verse schema

      try {
        const jsonFile = request.files.file;
        if (!(jsonFile instanceof Array)) {
          const jsonObject = jsonFile.data.toString();

          console.log(`Storing: ${jsonFile.name} (${request.body.date})...`);
          const filedata = await storeFile(
            jsonFile.name,
            request.body.date,
            jsonObject
          );
          response.json(filedata);
        } else {
          console.error(
            'Multiple files uploaded, this only supports single file uploads.'
          );
          response.sendStatus(400);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        if (err instanceof SyntaxError) {
          // likely bad json
          response.status(400).send(err.message);
        } else {
          // likely bad db call
          response.sendStatus(500);
        }
      }
    }
  })
  .get(async (_request: Request, response: Response) => {
    try {
      const files = await findAllFiles();
      response.json(files);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      response.sendStatus(500);
    }
  });
