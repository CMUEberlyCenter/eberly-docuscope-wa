import {
  evaluatePasswordStrength,
  type PasswordStrengthLevel
} from "@better-auth-ui/core"
import { useAuth } from "@better-auth-ui/react"

import { cn } from "cn"

/** Fixed segment identities, so the bars keep their own React keys. */
const STRENGTH_SEGMENTS = [1, 2, 3, 4] as const

type FilledLevel = Exclude<PasswordStrengthLevel, "empty">

const segmentColors: Record<FilledLevel, string> = {
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-sky-500",
  strong: "bg-emerald-500"
}

export type PasswordStrengthMeterProps = {
  /** The password as typed. Renders nothing while it is empty. */
  password: string
  className?: string
}

/**
 * Four-segment strength hint shown while someone picks a new password.
 *
 * Renders nothing when `emailAndPassword.strengthMeter` is off or the field is
 * empty. The score never gates submission: your server rules stay the
 * authority on what is acceptable.
 */
export function PasswordStrengthMeter({
  password,
  className
}: PasswordStrengthMeterProps) {
  const { emailAndPassword, localization } = useAuth()

  if (!emailAndPassword?.strengthMeter) return null

  const { score, level } = evaluatePasswordStrength(password, {
    minLength: emailAndPassword.minPasswordLength
  })

  if (level === "empty") return null

  const levelLabels: Record<FilledLevel, string> = {
    weak: localization.auth.passwordWeak,
    fair: localization.auth.passwordFair,
    good: localization.auth.passwordGood,
    strong: localization.auth.passwordStrong
  }

  return (
    <div className={cn("tw:flex tw:flex-col tw:gap-1.5", className)}>
      {/* Decorative: the live region below is what gets announced. */}
      <div aria-hidden="true" className="tw:flex tw:gap-1">
        {STRENGTH_SEGMENTS.map((segment) => (
          <span
            key={segment}
            className={cn(
              "tw:h-1 tw:flex-1 tw:rounded-full tw:bg-muted tw:transition-colors",
              segment <= score && segmentColors[level]
            )}
          />
        ))}
      </div>

      <p aria-live="polite" className="tw:text-muted-foreground tw:text-xs">
        {localization.auth.passwordStrength}:{" "}
        <span className="tw:font-medium tw:text-foreground">
          {levelLabels[level]}
        </span>
      </p>
    </div>
  )
}
