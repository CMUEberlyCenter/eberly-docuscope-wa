import { render } from 'vike/abort';
import type { PageContext } from 'vike/types';
// import { auth } from "../../../src/utils/auth";

export async function guard(pageContext: PageContext) {
  // const data = await auth.api.userHasPermission({ body:{
  //   // userId: pageContext.user?.id ?? "",
  //   role: "admin",
  //   permission: { user: ["create", "list", "set-role", "set-password", "update", "delete", "ban"] },
  // }})
  // console.log("Guard data:", data);
  if (!pageContext.user) {
    throw render(401, 'Unauthorized');
  }
  return;
}
