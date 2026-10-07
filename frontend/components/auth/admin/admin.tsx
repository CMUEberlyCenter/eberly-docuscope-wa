import type { AdminView } from "@better-auth-ui/core";
import { useAuth, useAuthenticate, useAuthPlugin } from "@better-auth-ui/react";
import { ShieldAlertIcon, UsersIcon } from "lucide-react";

import { Button } from "#components/ui/button.tsx";
import { adminPlugin } from "#lib/auth/admin-plugin.ts";
import { cn } from "cn";

import { AdminUsers } from "./admin-users";

export type AdminProps = {
  className?: string;
  hideNav?: boolean;
  path?: string;
  view?: AdminView | string;
};

/** Render a finite, static administration route and plugin-contributed tabs. */
export function Admin({ className, hideNav, path, view }: AdminProps) {
  const { authClient, basePaths, plugins, viewPaths } = useAuth();
  const { localization } = useAuthPlugin(adminPlugin);
  useAuthenticate(authClient);

  if (!view && !path) {
    throw new Error(
      "[Better Auth UI] Either `view` or `path` must be provided"
    );
  }

  const contributedTabs = plugins.flatMap((plugin) => plugin.adminTabs ?? []);
  const currentView =
    view ??
    (viewPaths.admin.users === path ? "users" : undefined) ??
    contributedTabs.find((tab) => tab.path === path)?.id;
  const contributedView = contributedTabs.find((tab) => tab.id === currentView);

  return (
    <div className={cn("tw:flex tw:w-full tw:flex-col tw:gap-6", className)}>
      {!hideNav && (
        <nav
          aria-label={localization.admin}
          className="tw:flex tw:gap-1 tw:border-b"
        >
          <Button
            aria-current={currentView === "users" ? "page" : undefined}
            className="tw:rounded-b-none"
            render={<a href={`${basePaths.admin}/${viewPaths.admin.users}`} />}
            variant={currentView === "users" ? "secondary" : "ghost"}
          >
            <UsersIcon />
            {localization.users}
          </Button>

          {contributedTabs.map((tab) => (
            <Button
              key={`${tab.id}-${tab.path}`}
              aria-current={currentView === tab.id ? "page" : undefined}
              className="tw:rounded-b-none"
              render={<a href={`${basePaths.admin}/${tab.path}`} />}
              variant={currentView === tab.id ? "secondary" : "ghost"}
            >
              {tab.label}
            </Button>
          ))}
        </nav>
      )}

      {currentView === "users" ? (
        <AdminUsers />
      ) : contributedView ? (
        <contributedView.component />
      ) : (
        <div className="tw:flex tw:min-h-64 tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:rounded-lg tw:border tw:border-dashed tw:p-8 tw:text-center">
          <ShieldAlertIcon className="tw:size-8 tw:text-muted-foreground" />
          <div className="tw:flex tw:flex-col tw:gap-1">
            <h2 className="tw:font-medium">{localization.unknownView}</h2>
            <p className="tw:max-w-md tw:text-sm tw:text-muted-foreground">
              {localization.unknownViewDescription} &quot;{path ?? view}&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
