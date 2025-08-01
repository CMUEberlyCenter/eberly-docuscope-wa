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

/** Generate File Not Found message. */
export const FileNotFound = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/404',
  title: 'Not Found',
  detail: err instanceof Error ? err.message : err,
  status: 404,
  instance,
});

/** Generate Forbidden message. */
export const Forbidden = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/403',
  title: 'Forbidden',
  detail: err instanceof Error ? err.message : err,
  status: 403,
  instance,
});

/** Generate Internal Server Error message. */
export const InternalServerError = (
  err: Error | string | unknown,
  instance?: string
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
});

export class BadRequestError extends Error {}

/** Generate Bad Request message. */
export const BadRequest = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/400',
  title: 'Bad Request',
  detail: err instanceof Error ? err.message : err,
  status: 400,
  instance,
});

/** Generate Unauthorized message. */
export const Unauthorized = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/401',
  title: 'Unauthorized',
  detail: err instanceof Error ? err.message : err,
  status: 401,
  instance,
});

export class UnprocessableContentError extends Error {
  validation: unknown = undefined;
  constructor(
    validation?: unknown,
    ...params: ConstructorParameters<typeof Error>
  ) {
    super(...params);
    this.validation = validation;
  }
}

/** Generate Unprocessable Content message. */
export const UnprocessableContent = (
  err: Error | string,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/422',
  title: 'Unprocessable Content',
  detail: err instanceof Error ? err.message : err,
  status: 422,
  instance,
  errors: err instanceof UnprocessableContentError ? err.validation : undefined,
});
