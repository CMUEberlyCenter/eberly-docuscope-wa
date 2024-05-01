import { Request, Response, Router } from "express";
import { updateMetrics, updateResponseAvg } from "../prometheus";
import { ONTOPIC_URL } from "../settings";

export const ontopic = Router();

ontopic.post('/', async (request: Request, response: Response) => {
  updateMetrics();
  const url = new URL(
    'api/v1/ontopic',
    ONTOPIC_URL
  );

  const startDate = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(request.body),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(
        `Bad response from ontopic: ${res.status} - ${res.statusText}`
      );
    }
    const ret = await res.json();
    updateResponseAvg(Date.now() - startDate);

    response.json({
      status: 'success',
      data: ret,
    });
  } catch (err) {
    console.error(err);
    response.sendStatus(500);
  }
});
