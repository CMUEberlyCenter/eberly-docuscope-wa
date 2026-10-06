"use client"

import type { UsernameAuthClient } from "@better-auth-ui/core/plugins/username"
import { useAuth, useSession } from "@better-auth-ui/react"
import type { User } from "better-auth"

import { Skeleton } from "#components/ui/skeleton.tsx"
import { cn } from "cn"
import { UserAvatar } from "./user-avatar"

export type UserViewProps = {
  className?: string
  isPending?: boolean
  /**
   * When true, the subtitle line (email when name/username is shown) is hidden.
   * @default false
   */
  hideSubtitle?: boolean
  /** @remarks `User` */
  user?: Partial<User> & {
    username?: string | null
    displayUsername?: string | null
  }
}

/**
 * Render a compact user item with an avatar, a primary label (display username, name, or email), and an optional subtitle (email).
 *
 * @param isPending - If true and no `user` prop is provided, renders a loading skeleton instead of user details
 * @param className - Additional CSS classes applied to the outer container
 * @param hideSubtitle - When true, omits the muted subtitle row under the primary label
 * @param user - Optional user object to display; when omitted the current session user is used
 * @returns A React element showing the user's avatar with their identifying information
 */
export function UserView({
  className,
  isPending,
  hideSubtitle = false,
  user
}: UserViewProps) {
  const { authClient } = useAuth<UsernameAuthClient>()
  const { data: session, isPending: sessionPending } = useSession(authClient, {
    enabled: !user && !isPending
  })

  const resolvedUser = user ?? session?.user

  if ((isPending || sessionPending) && !user) {
    return (
      <div className={cn("tw:flex tw:items-center tw:gap-2 tw:min-w-0", className)}>
        <UserAvatar isPending />

        <div className="tw:grid tw:flex-1 tw:gap-1 tw:text-left tw:text-sm">
          <Skeleton className="tw:h-4 tw:w-24" />

          {!hideSubtitle && <Skeleton className="tw:h-3 tw:w-32" />}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("tw:flex tw:items-center tw:gap-2 tw:min-w-0", className)}>
      <UserAvatar user={resolvedUser as User | undefined} />

      <div className="tw:grid tw:min-w-0 tw:flex-1 tw:text-left tw:text-sm tw:leading-tight">
        <span className="tw:truncate tw:font-medium tw:text-foreground">
          {resolvedUser?.displayUsername ||
            resolvedUser?.name ||
            resolvedUser?.email}
        </span>

        {!hideSubtitle &&
          (resolvedUser?.displayUsername || resolvedUser?.name) && (
            <span className="tw:text-muted-foreground tw:truncate tw:text-xs">
              {resolvedUser?.email}
            </span>
          )}
      </div>
    </div>
  )
}
