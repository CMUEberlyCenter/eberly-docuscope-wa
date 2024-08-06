/* Type declaration for RFC-9457 problem details */
export type ProblemDetails<Details = string> = {
  type?: string; // URI
  title?: string; // Human readable identifier, should match title from type page
  status?: number; // HTTP status code
  detail?: Details;
  instance?: string; // identifier for specific error
  // additional are allowable
  [key: string]: unknown;
};

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

export const InternalServerError = (
  err: Error,
  instance?: string
): ProblemDetails => ({
  type: 'https://developer.mozilla.org/docs/Web/HTTP/Status/500',
  title: 'Internal Server Error',
  status: 500,
  detail: err.message,
  error: err,
  instance,
});

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
