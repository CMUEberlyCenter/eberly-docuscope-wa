import { viewPaths } from "@better-auth-ui/core";
import { organizationPlugin } from "@better-auth-ui/core/plugins/organization";
import { redirect, render } from "vike/abort";
import { PageContextServer } from "vike/types";

const validSettingsPaths = new Set([
  ...Object.values(viewPaths.settings),
  ...Object.values(organizationPlugin().viewPaths.settings ?? {})
])

export const guard = async ({ auth, routeParams, urlPathname }: PageContextServer) => {
  if (!auth?.user) {
    const searchParams = new URLSearchParams({ redirectTo: urlPathname })
    throw redirect(`/auth/sign-in?${searchParams.toString()}`);
  }
  if (!validSettingsPaths.has(routeParams.view)) {
    throw render(404, { message: `Invalid settings view: ${routeParams.view}` });
  }
}
