import { IdToken } from 'ltijs';

export type TelefuncContext = {
  user?: string | null;
  isAdmin: boolean;
  token?: IdToken;
};
