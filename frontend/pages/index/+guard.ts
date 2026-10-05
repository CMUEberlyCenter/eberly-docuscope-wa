import { redirect } from "vike/abort";

export const guard = async () => {
  throw redirect('/draft');
}
