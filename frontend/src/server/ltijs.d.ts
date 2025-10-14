declare module 'ltijs' {
  export const Provider: {
    setup: (
      key: string,
      db: {
        url: string;
        // plugin?: object;
        debug?: boolean;
        connection?: { user?: string; pass?: string }
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
    ) => void;
    deploy(options?: {
      port?: number;
      silent?: boolean;
      serverless?: boolean;
    }): Promise<true>;
    close(options?: {
      silent?: boolean;
    }): Promise<true>;
    onConnect(cb: (token: any, req: any, res: any) => Promise<any>): true;
    onDeepLinking(cb: (token: any, req: any, res: any) => Promise<any>): true;
    onDynamicRegistration(cb: any): Promise<true>;
    // onSessionTimeout: (cb: Express.Application.Router.HandlerArgument) => true;
    // onInvalidToken: (cb: Express.Application.Router.HandlerArgument) => true;
    // onUnregisteredPlatform: (cb: Express.Application.Router.HandlerArgument) => true;
    // onInactivePlatform: (cb: Express.Application.Router.HandlerArgument) => true;
    appRoute(): string;
    loginRoute(): string;
    keysetRoute(): string;
    dynRegRoute(): string;
    whitelist(...routes: (string|RegExp)[]): string[];
    registerPlatform(platform: {
      url: string;
      name: string;
      clientId: string;
      authenticationEndpoint: string;
      accesstokenEndpoint: string;
      authConfig?: {
        method: 'JWK_SET' | 'JWK_KEY' | 'RSA_KEY';
        key?: string;
      };
      authenticationServer?: string;
    }): Promise<unknown | false>;
    // getPlatrform
    // getPlatformById
    // updatePlatformById
    deletePlatform(url: string, clientId: string): Promise<boolean>;
    deletePlatformById(id: string): Promise<boolean>;
    getAllPlatforms(): Promise<{ platformId: () => Promise<string>; platformName: () => Promise<string>; platformUrl: () => Promise<string>; platformActive: () => Promise<boolean>; }[]>;
    redirect(res: any, path: string, options?: { newResource?: boolean; query?: Record<string, undefined> }): Promise<void>;
    app: Express;
    DeepLinking: {
      createDeepLinkingForm(token: any, items: Record<string, any>): Promise<string>;
    };
    DynamicRegistration: {
      register(openid_configuration: any, registration_token: any, custom?: Record<string, unknown>): Promise<string>;
    }
  };
}
