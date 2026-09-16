import { describe, expect, test } from 'vitest';
import {
  badRequest,
  BadRequestError,
  errorToProblemDetails,
  FileNotFoundError,
  UnprocessableContentError,
} from './ProblemDetails';

describe('ProblemDetails', async () => {
  const { fileNotFound, unauthorized, unprocessableContent } = (
    (await import('./ProblemDetails')) as typeof import('./ProblemDetails') & {
      _testOnly: {
        fileNotFound: typeof errorToProblemDetails;
        unauthorized: typeof errorToProblemDetails;
        unprocessableContent: typeof errorToProblemDetails;
      };
    }
  )._testOnly;
  test('given Error when FileNotFound then detail is Error message', () => {
    const msg = 'TEST';
    const src = 'FileNotFoundTest';
    const fnf = errorToProblemDetails(new FileNotFoundError(msg), src);
    expect(fnf.status).toBe(404);
    expect(fnf.title).toBe('Not Found');
    expect(fnf.type?.endsWith('404')).toBeTruthy();
    expect(fnf.detail).toBe(msg);
    expect(fnf.instance).toBe(src);
  });
  test('given string when FileNotFound then detail is string', () => {
    const msg = 'STRING_TEST';
    const fnfs = fileNotFound(msg);
    expect(fnfs.status).toBe(404);
    expect(fnfs.detail).toBe(msg);
    expect(fnfs.instance).toBeUndefined();
  });
  test('given Error when InternalServerError then detail is error message', () => {
    const msg = 'TEST';
    const src = 'InternalServerErrorTest';
    const ise = errorToProblemDetails(new Error(msg), src);
    expect(ise.status).toBe(500);
    expect(ise.title).toBe('Internal Server Error');
    expect(ise.type?.endsWith('500')).toBeTruthy();
    expect(ise.detail).toBe(msg);
    expect(ise.instance).toBe(src);
    expect(ise.error).toBeInstanceOf(Error);
  });
  test('given string when InternalServerError then detail is string', () => {
    const msg = 'STRING_TEST';
    const ises = errorToProblemDetails(msg);
    expect(ises.detail).toBe(msg);
    expect(ises.instance).toBeUndefined();
    expect(ises.error).toBe(msg);
  });
  test('given other when InternalServerError then detail is "Unknown error type!"', () => {
    const iseu = errorToProblemDetails({});
    expect(iseu.detail).toBe('Unknown error type!');
  });
  test('given Error when BadRequest then detail is error message', () => {
    const msg = 'TEST';
    const src = 'BadRequestTest';
    const br = errorToProblemDetails(new BadRequestError(msg), src);
    expect(br.status).toBe(400);
    expect(br.title).toBe('Bad Request');
    expect(br.type?.endsWith('400')).toBeTruthy();
    expect(br.detail).toBe(msg);
    expect(br.instance).toBe(src);
  });
  test('given string when BadRequest the detail is string', () => {
    const msg = 'STRING_TEST';
    const br = badRequest(msg);
    expect(br.detail).toBe(msg);
  });
  test('given Error when Unauthorized then detail is error message', () => {
    const msg = 'TEST';
    const src = 'UnauthrizedTest';
    const auth = unauthorized(new Error(msg), src);
    expect(auth.status).toBe(401);
    expect(auth.title).toBe('Unauthorized');
    expect(auth.type?.endsWith('401')).toBeTruthy();
    expect(auth.instance).toBe(src);
    expect(auth.detail).toBe(msg);
  });
  test('given string when Unauthorized then detail is string', () => {
    const msg = 'STRING_TEST';
    const auth = unauthorized(msg);
    expect(auth.detail).toBe(msg);
    expect(auth.instance).toBeUndefined();
  });
  test('when UnprocessableContentError', () => {
    const valid = ['INVALID'];
    const msg = 'TEST';
    expect(new UnprocessableContentError().validation).toEqual([]);
    expect(new UnprocessableContentError(valid).validation).toBe(valid);
    expect(new UnprocessableContentError(valid, msg).message).toBe(msg);
  });
  test('given UnprocessableContentError when UnprocessableContent then detail and errors', () => {
    const msg = 'TEST';
    const valid = ['err0', 'err1'];
    const err = new UnprocessableContentError(valid, msg);
    const src = 'UNPROCESSABLE_TEST';
    const content = errorToProblemDetails(err, src);
    expect(content.status).toBe(422);
    expect(content.title).toBe('Unprocessable Content');
    expect(content.type?.endsWith('422')).toBeTruthy();
    expect(content.detail).toBe(msg);
    expect(content.instance).toBe(src);
    expect(content.errors).toEqual(valid);
  });
  test('given Error when UnprocessableConent then detail and no errors', () => {
    const msg = 'TEST';
    const err = new SyntaxError(msg);
    const content = errorToProblemDetails(err);
    expect(content.detail).toBe(msg);
    expect(content.errors).toBeUndefined();
    expect(content.instance).toBeUndefined();
  });
  test('given string when UnprocessableContent then detail is string', () => {
    const msg = 'TEST_STRING';
    const content = unprocessableContent(msg);
    expect(content.detail).toBe(msg);
  });
});
