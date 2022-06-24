import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from 'msw/node';
import {rest} from 'msw'
import { FAKE_COMMON_DICTIONARY } from "./fake-common-dictionary";

export const restHandlers = [
  rest.get(/settings.json$/, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({}))
  }),
  rest.get('https://docuscope.eberly.cmu.edu/common_dictionary',
  (req, res, ctx) => res(ctx.status(200), ctx.json(FAKE_COMMON_DICTIONARY))),
]
export const server = setupServer(...restHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
