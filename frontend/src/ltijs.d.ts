declare module 'ltijs' {
  import { Express, NextFunction, Request, Response } from 'express';
  type Context = {
    id: string;
    label?: string;
    title?: string;
    type?: string[]; // ContextType
  };
  export interface PlatformContext {
    context: Context;
    contextId: string;
    deploymentId?: string;
    endpoint?: {
      scope?: string[];
      lineitem?: string; // id
      lineitems?: string; // URL
    };
    launchPresentation?: {
      // in deeplinking token
      locale?: string;
    };
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
    guid: string;
    contact_email?: string;
    description?: string;
    name?: string;
    url?: string;
    product_family_code?: string;
    version?: string;
  }
  export interface UserInfo {
    given_name?: string;
    family_name?: string;
    middle_name?: string;
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
    custom?: Record<string, JSONValue>;
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

  interface AccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  }

  /** flags for the getLineItems method */
  interface GetLineItemsOptions {
    /** Filters line items based on the resourceLinkId of the resource that originated the request */
    resourceLinkId?: boolean;
    /** Filters line items based on the resourceId */
    resourceId?: string;
    /** Filters line items based on the tag */
    tag?: string;
    /** Sets a maximum number of line items to be returned */
    limit?: number;
    /** Filters line items based on the id */
    id?: string;
    /** Filters line items based on the label */
    label?: string;
    /** Retrieves line items from a specific URL. Usually retrieved from the `next` link header of a previous request. */
    url?: string;
  }

  interface LineItem {
    id?: string; // optional in request but required in response.
    /** The label is a short string with a human readable text for the line item. It MUST be specified and not blank when posted by the tool. A platform must always include the label. */
    label: string;
    /** The maximum score for this line item. Maximum score MUST be a numeric non-null value, strictly greater than 0. */
    scoreMaximum: number; // Must be greater than zero.
    /**
     * A line item MAY be attached to a resource link by including a 'resourceLinkId'
     * in the payload. The resource link MUST exist in the context where the line item
     * is created, and MUST be a link owned by the same tool. If not, the line item
     * creation MUST fail with a response code of Not Found 404.
     *
     * The platform MAY remove the line items attached to a resource link if the
     * resource link itself is removed.
     */
    resourceLinkId?: string;
    /**
     * A tool MAY identify which of its resources the line item is attached to by
     * including a non blank value for resourceId in the payload.
     * This value is a string. For example, resourceId can be 'quiz-231' or any other
     * resource identifier uniquely identifying a resource in a given context.
     *
     * Multiple line items can share the same resourceId within a given context.
     * resourceId must be preserved when a context is copied if the line items are
     * included in the copy.
     *
     * If no resourceId is defined for a lineitem, the platform may omit this attribute,
     * or include it with a blank or null value.
     */
    resourceId?: string;
    /**
     * A tool MAY further qualify a line item by setting a value to tag. The attribute
     * is a string. For example, one assignment resource may have 2 line items, one with
     * tag as 'grade' and the other tagged as 'originality'.
     *
     * Multiple line items can share the same tag within a given context. tag must be
     * preserved when a context is copied if the line items are included in the copy.
     *
     * If no tag is defined for a lineitem, the platform may omit this attribute, or
     * include it with a blank or null value.
     */
    tag?: string;
    /** A tool MAY specify the initial start time submissions for this line item can be made by learners. The initial value may subsequently be changed within the platform. */
    startDateTime?: string; // ISO8601
    /** A tool MAY specify the initial end time submissions for this line item can be made by learners. The initial value may subsequently be changed within the platform. */
    endDateTime?: string; // ISO8601
    /** A tool MAY specify to the platform if it wishes the grades to be released or not. A platform can decide how to handle this, as the platform owns its gradebook behavior. */
    gradesReleased?: boolean;
    [key: string]: JsonValue; // Custom properties, key must be a fully qualified URL, value must be valid JSON.
  }
  export interface Score {
    timeStamp?: string; // ISO8601 Required in spec but added by function
    scoreGiven?: number; // Must be a numeric value, greater than or equal to 0, and can be greater than or equal to the scoreMaximum of the line item.
    scoreMaximum?: number; // Required in spec but can be derived in submitScore function
    comment?: string;
    activityProgress?:
      | 'Initialized'
      | 'Started'
      | 'InProgress'
      | 'Submitted'
      | 'Completed';
    gradingProgress?:
      | 'FullyGraded'
      | 'Pending'
      | 'PendingManual'
      | 'Failed'
      | 'NotReady';
    userId?: string; // Required in request but added by function
    scoringUserId?: string;
    submission?: {
      startedAt: string; // ISO8601
      submittedAt: string; // ISO8601
    };
    [key: string]: JsonValue; // Custom properties, key must be a fully qualified URL, value must be valid JSON.
  }
  export interface GradeService {
    getLineItems(
      token: IdToken,
      options?: GetLineItemsOptions,
      accessToken?: AccessToken
    ): Promise<{ lineItems: LineItem[] }>; // TODO finish typing output...
    createLineItem(
      token: IdToken,
      lineItem: LineItem,
      options?: { resourceLinkId?: boolean },
      accessToken?: AccessToken
    ): Promise<LineItem>;
    getLineItemById(
      token: IdToken,
      lineItemId: string,
      accessToken?: AccessToken
    ): Promise<LineItem>;
    updateLineItemById(
      token: IdToken,
      lineItemId: string,
      lineItem: Partial<LineItem>
    ): Promise<LineItem>;
    deleteLineItemById(token: IdToken, lineItemId: string): Promise<boolean>;
    submitScore(
      token: IdToken,
      lineItemId: string,
      score: Score
    ): Promise<Score>;
    getScores(
      token: IdToken,
      lineItemId: string,
      options?: { userId?: string; limit?: number; url?: string }
    ): Promise<{ scores: Score[] }>;
  }

  export interface NameAndRolesService {
    getMembers(
      token: IdToken,
      options?: {
        role?: string;
        limit?: number;
        pages?: number;
        resourceLinkId?: boolean;
        url?: string;
      }
    ): Promise<{
      id: string;
      context: Context;
      members: UserInfo &
        {
          status?: string; // 'Active' | 'Inactive'
          lis_person_sourcedid?: string;
          roles: string[];
        }[];
    }>;
  }

  type SyncOrAsync<T> = T | Promise<T>;
  type ExpressCallbackReturnType = SyncOrAsync<Response | void>;
  interface ExpressCallback {
    (
      req: Request,
      res: Response,
      next: NextFunction
    ): ExpressCallbackReturnType;
  }
  interface OnConnectCallback {
    (
      token: IdToken,
      req: Request,
      res: Response,
      next: NextFunction
    ): ExpressCallbackReturnType;
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
    authorizationServer?: string;
    kid?: string;
  };

  export interface Platform {
    platformId: () => Promise<string | boolean>;
    platformName(name?: string): Promise<string | boolean>;
    platformUrl(url?: string): Promise<string | boolean>;
    platformActive(active?: boolean): Promise<boolean>;
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
    Grade: GradeService;
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
    getPlatformById(id: string): Promise<Platform | false>;
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
        openid_configuration: string | ParsedQs | (string | ParsedQs)[],
        registration_token: string | ParsedQs | (string | ParsedQs)[],
        custom?: Record<string, unknown>
      ): Promise<string>;
    };
  }
  declare const defaultProvider: Provider;
  export = { Provider: defaultProvider };
}
