import cors from 'cors';
import type { Request, Response } from 'express';
import express, { urlencoded } from 'express';
import helmet from 'helmet';
import type {
  ExpressHttpHandlerOptions,
  HttpHandler,
  HttpRequestParameters,
  HttpResponse,
  RouteHandler,
  SslOptions,
} from 'ltijs';
import { HttpMethod } from 'ltijs';
import type { Server } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import { createServer as createHttpsServer } from 'node:https';

class ExpressHttpResponse implements HttpResponse {
  constructor(private readonly res: Response) {}

  status(code: number): HttpResponse {
    this.res.status(code);
    return this;
  }

  redirect(url: string): void {
    this.res.redirect(url);
  }

  html(content: string): void {
    this.res.type('html').send(content);
  }

  json(body: unknown): void {
    this.res.json(body);
  }
}

type ExpressHttpHandlerOptionsWithDeeplink = ExpressHttpHandlerOptions & {
  deeplinkUrl?: string;
};

export class MyExpressHttpHandler implements HttpHandler {
  private readonly port: number;
  private readonly ssl: SslOptions | undefined;
  private server: Server | HttpsServer | undefined;

  public readonly app = express();

  constructor({
    port,
    ssl,
    cors: corsOptions,
    deeplinkUrl,
  }: ExpressHttpHandlerOptionsWithDeeplink) {
    this.port = port;
    this.ssl = ssl;
    this.app.use(helmet({ frameguard: false, contentSecurityPolicy: false }));
    if (corsOptions !== false) {
      const corsMiddleware = cors({
        origin: true,
        credentials: true,
        ...corsOptions,
      });
      this.app.use(corsMiddleware);
      this.app.options('*splat', corsMiddleware);
    }

    // Setup body parsing for deeplink route to handle application/x-www-form-urlencoded content type
    if (deeplinkUrl) {
      this.app.use(deeplinkUrl, urlencoded({ extended: true }));
    }
  }

  public registerRoute(
    path: string,
    methods: HttpMethod[],
    handler: RouteHandler
  ): void {
    const adapter = this.buildAdapter(handler);
    for (const method of methods)
      this.app[this.toExpressMethod(method)](
        path,
        express.json(),
        express.urlencoded({ extended: false }),
        adapter
      );
  }

  public async listen(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server =
        this.ssl === undefined
          ? this.app.listen(this.port)
          : createHttpsServer(this.ssl, this.app).listen(this.port);
      this.server.once('listening', () => {
        resolve();
      });
      this.server.once('error', (error: Error) => {
        reject(error);
      });
    });
  }

  public async close(): Promise<void> {
    if (this.server === undefined) return;
    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private buildAdapter(
    handler: RouteHandler
  ): (req: Request, res: Response) => Promise<void> {
    return async (req, res) => {
      const request = this.buildRequestParameters(req);
      const response = new ExpressHttpResponse(res);
      await handler(request, response);
    };
  }

  private buildRequestParameters(req: Request): HttpRequestParameters {
    return {
      method: req.method,
      path: req.path,
      query: req.query as Record<string, string | string[]>,
      body: (req.body as Record<string, unknown> | undefined) ?? {},
      headers: req.headers as Record<string, string | string[]>,
    };
  }

  private toExpressMethod(
    method: HttpMethod
  ): 'get' | 'post' | 'put' | 'delete' | 'all' {
    const EXPRESS_METHOD_BY_HTTP_METHOD: Record<
      HttpMethod,
      'get' | 'post' | 'put' | 'delete' | 'all'
    > = {
      [HttpMethod.Get]: 'get',
      [HttpMethod.Post]: 'post',
      [HttpMethod.Put]: 'put',
      [HttpMethod.Delete]: 'delete',
      [HttpMethod.All]: 'all',
    };
    return EXPRESS_METHOD_BY_HTTP_METHOD[method];
  }
}
