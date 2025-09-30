declare module 'ltijs' {
  export const Provider: {
    setup: (
      key: string,
      db: { url: string; connection: { user?: string; pass?: string } },
      options: {
        devMode?: boolean;
        ltiaas?: boolean;
        cookies?: {
          secure?: boolean;
          sameSite?: 'None' | 'Lax' | 'Strict';
        };
        dynReg?: {
          url: string;
          name: string;
          description?: string;
          logo?: string;
          redirectUris?: string[];
          custom?: Record<string, unknown>;
          autoActivate?: boolean;
        };
      }
    ) => void;
    app: Express;
  };
}
