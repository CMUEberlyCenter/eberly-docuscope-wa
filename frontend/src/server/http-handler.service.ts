import { enhance, UniversalHandler } from '@universal-middleware/core';
import type {
  HttpHandler,
  HttpRequestParameters,
  HttpResponse,
  RouteHandler,
} from 'ltijs';
import { HttpMethod } from 'ltijs';
import { logger } from './logger';

class UniversalHttpResponse implements HttpResponse {
  #status = 200;
  #url: string | undefined;
  #contentType: 'redirect' | 'html' | 'json' | undefined;
  #content: string | undefined;
  #body: unknown;
  constructor() {}

  status(code: number): HttpResponse {
    this.#status = code;
    return this;
  }

  redirect(url: string): void {
    this.#url = url;
    this.#contentType = 'redirect';
  }

  html(content: string): void {
    this.#content = content;
    this.#contentType = 'html';
  }

  json(body: unknown): void {
    this.#body = body;
    this.#contentType = 'json';
  }

  finish(): Response {
    switch (this.#contentType) {
      case 'redirect':
        return Response.redirect(this.#url!, this.#status);
      case 'html':
        return new Response(this.#content, {
          status: this.#status,
          headers: { 'Content-Type': 'text/html' },
        });
      case 'json':
        return Response.json(this.#body, { status: this.#status });
      default:
        return new Response(null, { status: this.#status });
    }
  }
}

export class UniversalHttpHandler implements HttpHandler {
  public routes: UniversalHandler[] = [];

  constructor() {} // TODO inject dependencies if needed (eg) logger

  public registerRoute(
    path: string,
    methods: HttpMethod[],
    handler: RouteHandler
  ): void {
    logger.info(`Registering route: ${methods.join(', ')} ${path}`);
    const enhancedHandler = enhance(
      async (request, _context, _runtime) => {
        const url = new URL(request.url);
        const query: Record<string, string | string[]> = {};
        url.searchParams.forEach((value, key) => {
          if (query[key]) {
            if (Array.isArray(query[key])) {
              (query[key] as string[]).push(value);
            } else {
              query[key] = [query[key] as string, value];
            }
          } else {
            query[key] = value;
          }
        });
        let body: Record<string, unknown> = {};
        switch (request.headers.get('content-type')) {
          case 'application/json':
            body = await request.clone().json();
            break;
          case 'application/x-www-form-urlencoded':
          case 'multipart/form-data':
            const formData = await request.clone().formData();
            body = Object.fromEntries(formData.entries());
            break;
          default:
            body = {};
        }
        const req: HttpRequestParameters = {
          method: request.method,
          path: url.pathname,
          query: query,
          body: body,
          headers: Object.fromEntries(request.headers),
        };
        const response = new UniversalHttpResponse();
        await handler(req, response);
        return response.finish();
      },
      {
        name: `myprose:express-handler-${methods.join('-')}-${path}`,
        path,
        method: methods.includes(HttpMethod.All)
          ? ['GET', 'POST', 'PUT', 'DELETE']
          : (methods.map((method) => method.toUpperCase()) as (
              'GET' | 'POST' | 'PUT' | 'DELETE'
            )[]),
      }
    ) satisfies UniversalHandler;
    this.routes.push(enhancedHandler);
  }

  public async listen(): Promise<void> {
    // Placeholder to satisfy the interface, since the server is started elsewhere
  }

  public async close(): Promise<void> {
    return Promise.resolve(); // Placeholder to satisfy the interface, since the server is closed elsewhere
  }
}
