"use client";

import {
  getReauthenticationSignInURL,
  isReauthenticationSignInURL,
} from "@better-auth-ui/core";
import { useAuth, useSignOut } from "@better-auth-ui/react";
import { useSyncExternalStore } from "react";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert.tsx";
import { Button } from "#components/ui/button.tsx";
import { Spinner } from "#components/ui/spinner.tsx";
import { cn } from "cn";

const subscribeToLocation = () => () => undefined;

function useIsReauthenticationSignIn() {
  return useSyncExternalStore(
    subscribeToLocation,
    () => isReauthenticationSignInURL(new URL(window.location.href)),
    () => false
  );
}

export type ReauthenticationActionProps = {
  className?: string;
  showTitle?: boolean;
};

export function ReauthenticationAction({
  className,
  showTitle = true,
}: ReauthenticationActionProps) {
  const auth = useAuth();
  const signOut = useSignOut(auth.authClient);

  const handleReauthentication = () => {
    const signInURL = getReauthenticationSignInURL(
      new URL(window.location.href),
      `${auth.basePaths.auth}/${auth.viewPaths.auth.signIn}`
    );
    signOut.mutate(undefined, {
      onSuccess: () => auth.navigate({ to: signInURL }),
    });
  };

  return (
    <div
      className={cn(
        "tw:flex tw:flex-col tw:items-start tw:gap-3 tw:p-4",
        className
      )}
    >
      <div className="tw:flex tw:flex-col tw:gap-1">
        {showTitle ? (
          <h3 className="tw:text-sm tw:font-medium">
            {auth.localization.settings.reauthenticationTitle}
          </h3>
        ) : null}
        <p className="tw:text-sm tw:text-muted-foreground">
          {auth.localization.settings.reauthenticationDescription}
        </p>
      </div>
      <Button
        disabled={signOut.isPending}
        onClick={handleReauthentication}
        size="sm"
      >
        {signOut.isPending ? <Spinner data-icon="inline-start" /> : null}
        {auth.localization.settings.reauthenticationAction}
      </Button>
    </div>
  );
}

export function ReauthenticationNotice() {
  const auth = useAuth();
  const isReauthenticationSignIn = useIsReauthenticationSignIn();
  if (!isReauthenticationSignIn) return null;

  return (
    <Alert className="tw:mx-4 tw:w-auto tw:group-data-[size=sm]/card:mx-3">
      <AlertTitle>
        {auth.localization.settings.reauthenticationTitle}
      </AlertTitle>
      <AlertDescription>
        {auth.localization.settings.reauthenticationDescription}
      </AlertDescription>
    </Alert>
  );
}
