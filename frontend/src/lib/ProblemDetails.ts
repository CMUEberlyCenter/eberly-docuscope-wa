import {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from '@anthropic-ai/sdk';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../server/logger';

/* Type declaration for RFC-9457 problem details */
type ProblemDetails<Details = string> = {
  type?: string; // URI
  title?: string; // Human readable identifier, should match title from type page
  status?: number; // HTTP status code
  detail?: Details;
  instance?: string; // identifier for specific error
  // additional are allowable
  [key: string]: unknown;
};

/** File Not Found Error */
export class FileNotFoundError extends Error {}
/** Generate File Not Found message. */
const fileNotFound = (
  err: Error | string,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/404',
  title: 'Not Found',
  detail: err instanceof Error ? err.message : err,
  status: 404,
  instance,
  ...extensions,
});

/** Forbidden Error */
export class ForbiddenError extends Error {}
/** Generate Forbidden message. */
const forbidden = (
  err: Error | string,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/403',
  title: 'Forbidden',
  detail: err instanceof Error ? err.message : err,
  status: 403,
  instance,
  ...extensions,
});

/** Generate Internal Server Error message. */
const internalServerError = (
  err: Error | string | unknown,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/500',
  title: 'Internal Server Error',
  status: 500,
  detail:
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unknown error type!',
  error: err,
  instance,
  ...extensions,
});

export class BadRequestError extends Error {}

/** Generate Bad Request message. */
export const badRequest = (
  err: Error | string,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/400',
  title: 'Bad Request',
  detail: err instanceof Error ? err.message : err,
  status: 400,
  instance,
  ...extensions,
});

/** Generate Unauthorized message. */
const unauthorized = (
  err: Error | string,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/401',
  title: 'Unauthorized',
  detail: err instanceof Error ? err.message : err,
  status: 401,
  instance,
  ...extensions,
});

const contentTooLarge = (
  err: Error | string,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/413',
  title: 'Content Too Large',
  detail: err instanceof Error ? err.message : err,
  status: 413,
  instance,
  ...extensions,
});

export class UnprocessableContentError extends Error {
  validation: unknown[] = [];
  constructor(
    validation?: unknown[],
    ...params: ConstructorParameters<typeof Error>
  ) {
    super(...params);
    this.validation = validation ?? [];
  }
}

/** Generate Unprocessable Content message. */
const unprocessableContent = (
  err: Error | string,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/422',
  title: 'Unprocessable Content',
  detail: err instanceof Error ? err.message : err,
  status: 422,
  instance,
  errors: err instanceof UnprocessableContentError ? err.validation : undefined,
  ...extensions,
});

export class GatewayError extends Error {}

const badGateway = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/502',
  title: 'Bad Gateway',
  detail: err instanceof Error ? err.message : err,
  status: 502,
  instance,
  errors: err instanceof APIError ? err.error?.response?.status : undefined,
});

const gatewayTimeout = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/504',
  title: 'Gateway Timeout',
  detail: err instanceof Error ? err.message : err,
  status: 504,
  instance,
});

export class ServiceUnavailableError extends Error {}
const serviceUnavailable = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/503',
  title: 'Service Unavailable',
  detail: err instanceof Error ? err.message : err,
  status: 503,
  instance,
});

export class ChatStopError extends Error {}

export const errorToProblemDetails = (
  err: Error | string | unknown,
  instance?: string,
  extensions?: { [key: string]: unknown }
): ProblemDetails => {
  if (err instanceof BadRequestError) {
    return badRequest(err, instance, extensions);
  }
  if (err instanceof ForbiddenError) {
    return forbidden(err, instance, extensions);
  }
  if (err instanceof FileNotFoundError) {
    return fileNotFound(err, instance, extensions);
  }
  if (err instanceof ReferenceError) {
    return fileNotFound(err, instance, extensions);
  }
  if (err instanceof SyntaxError) {
    return unprocessableContent(err, instance, extensions);
  }
  if (err instanceof UnprocessableContentError) {
    return unprocessableContent(err, instance, extensions);
  }
  if (err instanceof GatewayError) {
    return badGateway(err, instance);
  }
  if (err instanceof APIUserAbortError) {
    return badGateway(err, instance);
  }
  if (err instanceof APIConnectionTimeoutError) {
    return gatewayTimeout(err, instance);
  }
  if (err instanceof ServiceUnavailableError) {
    return serviceUnavailable(err, instance);
  }
  if (err instanceof APIError) {
    if (err.error?.response?.status === 400) {
      return serviceUnavailable(err, instance);
    }
    if (err.error?.response?.status === 413) {
      return contentTooLarge(err, instance);
    }
    // https://docs.claude.com/en/api/errors
    // 401 authentication_error
    // 403 permission_error
    // 404 not_found_error
    // 429 rate_limit_error
    // 500 api_error
    // 529 overloaded_error
    return serviceUnavailable(err, instance);
  }
  if (err instanceof ChatStopError) {
    return serviceUnavailable(err, instance);
  }
  logger.error(
    `Unhandled error: ${err instanceof Error ? err.message : err}`,
    err
  );
  return internalServerError(err, instance, extensions);
};
export type ErrorDetails = ReturnType<typeof errorToProblemDetails>;

/** Express error handling middleware */
export const handleError = (
  err: Error,
  _req: Request,
  response: Response,
  _next: NextFunction
) => {
  // Log the error for debugging purposes.
  logger.error(`Error occurred: ${err.message}`, err);
  const details = errorToProblemDetails(err);
  response.status(details.status || 500).json(details);
};

// Export for testing purposes only.
if (process.env.NODE_ENV === 'test') {
  module.exports._testOnly = {
    fileNotFound,
    unauthorized,
    unprocessableContent,
  };
}
