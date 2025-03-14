import { describe, expect, test } from 'vitest';
import {
  BadRequest,
  FileNotFound,
  InternalServerError,
  Unauthorized,
  UnprocessableContent,
  UnprocessableContentError,
} from './ProblemDetails';

describe('ProblemDetails', () => {
  test('given Error when FileNotFound then detail is Error message', () => {
    const msg = 'TEST';
    const src = 'FileNotFoundTest';
    const fnf = FileNotFound(new Error(msg), src);
    expect(fnf.status).toBe(404);
    expect(fnf.title).toBe('Not Found');
    expect(fnf.type?.endsWith('404')).toBeTruthy();
    expect(fnf.detail).toBe(msg);
    expect(fnf.instance).toBe(src);
  });
  test('given string when FileNotFound then detail is string', () => {
    const msg = 'STRING_TEST';
    const fnfs = FileNotFound(msg);
    expect(fnfs.status).toBe(404);
    expect(fnfs.detail).toBe(msg);
    expect(fnfs.instance).toBeUndefined();
  });
  test('given Error when InternalServerError then detail is error message', () => {
    const msg = 'TEST';
    const src = 'InternalServerErrorTest';
    const ise = InternalServerError(new Error(msg), src);
    expect(ise.status).toBe(500);
    expect(ise.title).toBe('Internal Server Error');
    expect(ise.type?.endsWith('500')).toBeTruthy();
    expect(ise.detail).toBe(msg);
    expect(ise.instance).toBe(src);
    expect(ise.error).toBeInstanceOf(Error);
  });
  test('given string when InternalServerError then detail is string', () => {
    const msg = 'STRING_TEST';
    const ises = InternalServerError(msg);
    expect(ises.detail).toBe(msg);
    expect(ises.instance).toBeUndefined();
    expect(ises.error).toBe(msg);
  });
  test('given other when InternalServerError then detail is "Unknown error type!"', () => {
    const iseu = InternalServerError({});
    expect(iseu.detail).toBe('Unknown error type!');
  });
  test('given Error when BadRequest then detail is error message', () => {
    const msg = 'TEST';
    const src = 'BadRequestTest';
    const br = BadRequest(new Error(msg), src);
    expect(br.status).toBe(400);
    expect(br.title).toBe('Bad Request');
    expect(br.type?.endsWith('400')).toBeTruthy();
    expect(br.detail).toBe(msg);
    expect(br.instance).toBe(src);
  });
  test('given string when BadRequest the detail is string', () => {
    const msg = 'STRING_TEST';
    const br = BadRequest(msg);
    expect(br.detail).toBe(msg);
  });
  test('given Error when Unauthorized then detail is error message', () => {
    const msg = 'TEST';
    const src = 'UnauthrizedTest';
    const auth = Unauthorized(new Error(msg), src);
    expect(auth.status).toBe(401);
    expect(auth.title).toBe('Unauthorized');
    expect(auth.type?.endsWith('401')).toBeTruthy();
    expect(auth.instance).toBe(src);
    expect(auth.detail).toBe(msg);
  });
  test('given string when Unauthorized then detail is string', () => {
    const msg = 'STRING_TEST';
    const auth = Unauthorized(msg);
    expect(auth.detail).toBe(msg);
    expect(auth.instance).toBeUndefined();
  });
  test('when UnprocessableContentError', () => {
    const valid = 'INVALID';
    const msg = 'TEST';
    expect(new UnprocessableContentError().validation).toBeUndefined();
    expect(new UnprocessableContentError(valid).validation).toBe(valid);
    expect(new UnprocessableContentError(valid, msg).message).toBe(msg);
  });
  test('given UnprocessableContentError when UnprocessableContent then detail and errors', () => {
    const msg = 'TEST';
    const valid = ['err0', 'err1'];
    const err = new UnprocessableContentError(valid, msg);
    const src = 'UNPROCESSABLE_TEST';
    const content = UnprocessableContent(err, src);
    expect(content.status).toBe(422);
    expect(content.title).toBe('Unprocessable Content');
    expect(content.type?.endsWith('422')).toBeTruthy();
    expect(content.detail).toBe(msg);
    expect(content.instance).toBe(src);
    expect(content.errors).toEqual(valid);
  });
  test('given Error when UnprocessableConent then detail and no errors', () => {
    const msg = 'TEST';
    const err = new Error(msg);
    const content = UnprocessableContent(err);
    expect(content.detail).toBe(msg);
    expect(content.errors).toBeUndefined();
    expect(content.instance).toBeUndefined();
  });
  test('given string when UnprocessableContent then detail is string', () => {
    const msg = 'TEST_STRING';
    const content = UnprocessableContent(msg);
    expect(content.detail).toBe(msg);
  });
});
