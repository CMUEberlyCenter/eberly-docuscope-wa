declare module 'ltijs' {
  import { Express, NextFunction, Request, Response } from 'express';
  export interface PlatformContext {
    context: {
      id: string;
      label?: string;
      title?: string;
      type?: string[]; // ContextType
    };
    contextId: string;
    deploymentId?: string;
    path: string;
    resource: {
      title?: string;
      description?: string;
      id: string;
    };
    roles: string[];
    user: string;
    targetLinkUri: string;
    messageType?: string; // MessageType
    version?: string; // LTI version
    custom?: { [key: string]: string };
  }
  export interface PlatformInfo {
    product_family_code: string;
    version: string;
    guid: string;
    name: string;
    description: string;
  }
  export interface UserInfo {
    given_name?: string;
    family_name?: string;
    name?: string;
    email?: string;
  }
  export type IdToken = {
    iss: string;
    user: string;
    userInfo?: UserInfo;
    platformInfo?: PlatformInfo;
    clientId: string;
    platformId: string;
    deploymentId: string;
    platformContext: PlatformContext;
  };

  type IconProps = {
    url: string; // URL
    width: number; // int
    height: number; // int
  };

  type WindowProps = {
    targetName?: string;
    width?: number; // int
    height?: number; // int
    windowFeatures?: string; // comma-separated list
  };
  type StartEndDate = {
    startDateTime?: string; // ISO8601
    endDateTime?: string; // ISO8601
  };
  type LTI_Link = {
    type: 'link';
    url: string; // URL
    title?: string;
    text?: string;
    icon?: IconProps;
    thumbnail?: IconProps;
    embed?: string; // HTML fragment
    window?: WindowProps;
    iframe?: {
      src: string; // URL
      width?: number; // int
      height?: number; // int
    };
  };
  type LTI_ResourceLink = {
    type: 'ltiResourceLink';
    url?: string; // URL
    title?: string;
    text?: string;
    icon?: IconProps;
    thumbnail?: IconProps;
    window?: WindowProps;
    iframe?: {
      width?: number;
      height?: number;
    };
    custom?: Record<string, unknown>;
    lineItem?: {
      label?: string;
      scoreMaximum: number;
      resourceId?: string;
      tag?: string;
      gradesReleased?: boolean;
    };
    available?: StartEndDate;
    submission?: StartEndDate;
  };
  type LTI_File = {
    type: 'file';
    url: string; // URL
    title?: string;
    text?: string;
    icon?: IconProps;
    thumbnail?: IconProps;
    expiresAt?: string; // ISO8901
  };
  type LTI_HTMLFragment = {
    type: 'html';
    html: string; // HTML
    title?: string;
    text?: string;
  };
  type LTI_Image = {
    type: 'image';
    url: string; // URL
    title?: string;
    text?: string;
    icon?: IconProps;
    thumbnail?: IconProps;
    width?: number; // int
    height?: number; // int
  };
  export type ContentItem =
    | LTI_Link
    | LTI_ResourceLink
    | LTI_File
    | LTI_HTMLFragment
    | LTI_Image;

  export interface DeepLinkingMessageOptions {
    message?: string;
    errmessage?: string;
    log?: string;
    errlog?: string;
  }
  export interface DeepLinkingService {
    createDeepLinkingForm(
      token: IdToken,
      contentItems: ContentItem[],
      options?: DeepLinkingMessageOptions
    ): Promise<string | false>;
    createDeepLinkingMessage(
      token: IdToken,
      contentItems: ContentItem[],
      options?: DeepLinkingMessageOptions
    ): Promise<string | false>;
  }

  interface ExpressCallback {
    (req: Request, res: Response, next?: NextFunction): Response | void | Promise<Response | void>;
  }
  interface OnConnectCallback {
    (
      token: IdToken,
      req: Request,
      res: Response,
      next?: NextFunction
    ): Response | void | Promise<Response | void>;
  }
  interface OnConnectOptions {
    sessionTimeout?: (request: Request, response: Response) => Response;
    invalidToken?: (request: Request, response: Response) => Response;
  }

  type JWK_SET = {
    method: 'JWK_SET';
    key: string; // URL
  };
  type JWK_KEY = {
    method: 'JWK_KEY';
    key: string; // stringified json
  };
  type RSA_KEY = {
    method: 'RSA_KEY';
    key: string; // Public key.
  };
  export type PlatformConfig = {
    url: string;
    clientId: string;
    name: string;
    authenticationEndpoint: string;
    accesstokenEndpoint: string;
    authConfig: JWK_SET | JWK_KEY | RSA_KEY;
    authenticationServer?: string;
  };

  export interface Platform {
    platformId: () => Promise<string | boolean>;
    platformName(name?: string): Promise<string | boolean>;
    platformUrl(url?: string): Promise<string | boolean>;
    platformActive(): Promise<boolean>;
    // platformClientId(clientId?: string): Promise<string | boolean>;
    // platformKid(): string;
    // platformPublicKey(): Promise<string | false>;
    // platformPrivateKey(): Promise<string | false>;
    // platformAuthConfig(method: string, key: string): Promise<{ method: string, key: string } | boolean>;
    // platformAuthenticationEndpoint(authenticationEndpoint?: string): Promise<string | boolean>;
    // platformAccessTokenEndpoint(accesstokenEndpoint?: string): Promise<string | boolean>;
  }

  declare class Provider {
    app: Express;

    // Database: Database;
    // Grade: GradeService;
    DeepLinking: DeepLinkingService;
    // NameAndRoles: NameAndRolesService;

    setup(
      encryptionKey: string,
      database: {
        url: string;
        // plugin?: object;
        debug?: boolean;
        connection?: { user?: string; pass?: string };
      },
      options: {
        appRoute?: string; // '/'
        loginRoute?: string; // '/login'
        keysetRoute?: string; // '/keys'
        dynRegRoute?: string; // '/register'
        https?: boolean; // false
        ssl?: { key: string; cert: string };
        staticPath?: string;
        cors?: boolean;
        serverAddon?(app: Express): void;
        cookies?: {
          secure?: boolean;
          sameSite?: 'None' | 'Lax' | 'Strict' | string;
          domain?: string;
        };
        devMode?: boolean;
        tokenMaxAge?: number; // secondes, default 10
        dynReg?: {
          url: string;
          name: string;
          logo?: string;
          description?: string;
          redirectUris?: string[];
          custom?: Record<string, unknown>;
          autoActivate?: boolean;
          useDeepLinking?: boolean;
        };
        ltiaas?: boolean;
      }
    ): Provider;
    deploy(options?: {
      port?: number;
      silent?: boolean;
      serverless?: boolean;
    }): Promise<true>;
    close(options?: { silent?: boolean }): Promise<true>;
    onConnect(cb: OnConnectCallback, options?: OnConnectOptions): true;
    onDeepLinking(cb: OnConnectCallback, options?: OnConnectOptions): true;
    onDynamicRegistration(cb: ExpressCallback): Promise<true>;
    // onSessionTimeout: (cb: Express.Application.Router.HandlerArgument) => true;
    // onInvalidToken: (cb: Express.Application.Router.HandlerArgument) => true;
    // onUnregisteredPlatform: (cb: Express.Application.Router.HandlerArgument) => true;
    // onInactivePlatform: (cb: Express.Application.Router.HandlerArgument) => true;
    appRoute(): string;
    loginRoute(): string;
    keysetRoute(): string;
    dynRegRoute(): string;
    whitelist(
      ...routes: (string | RegExp | { route: string; method: string })[]
    ): string[];
    registerPlatform(platform: PlatformConfig): Promise<unknown | false>;
    // getPlatrform
    // getPlatformById
    // updatePlatformById
    deletePlatform(url: string, clientId: string): Promise<boolean>;
    deletePlatformById(id: string): Promise<boolean>;
    getAllPlatforms(): Promise<Platform[]>;
    redirect(
      res: Response,
      path: string,
      options?: { newResource?: boolean; query?: Record<string, undefined> }
    ): Promise<void>;
    DynamicRegistration: {
      register(
        openid_configuration: string,
        registration_token: string,
        custom?: Record<string, unknown>
      ): Promise<string>;
    };
  }
  declare const defaultProvider: Provider;
  export = { Provider: defaultProvider };
}
