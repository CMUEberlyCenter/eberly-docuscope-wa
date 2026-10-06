import classNames from "classnames";
import { HTMLAttributes } from "react";

const ListItem = ({
  action,
  active,
  variant = "primary",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  action?: boolean;
  active?: boolean;
  variant?: string;
}) => (
  /* Need button if action is true for accessibility reasons. */
  /* Need to support variants for warning, danger, and other states. */
  <div
    role={action ? "button" : undefined}
    aria-expanded={active ? "true" : action ? "false" : undefined}
    className={classNames(
      "tw:border-b tw:border-slate-200 tw:px-4 tw:py-3 tw:last:border-b-0",
      {
        "tw:cursor-pointer": action,
        "tw:hover:bg-slate-50": action && !active && variant !== "warning",
        "tw:bg-primary-700": active && variant === "primary",
        "tw:hover:bg-primary-700": active && active && variant === "primary",
        "tw:text-white": active && ["primary", "warning"].includes(variant),
        "tw:bg-amber-100": variant === "warning" && !active,
        // "tw:text-amber-800": variant === "warning",
        "tw:bg-red-700": variant === "warning" && active,
        // "tw:text-white": variant === "warning" && active,
        "tw:hover:bg-amber-200": variant === "warning",
      },
      className
    )}
    {...props}
  />
);
export const ListGroup = Object.assign(
  ({
    className,
    variant,
    ...props
  }: HTMLAttributes<HTMLDivElement> & { variant?: string }) => (
    <div
      className={classNames(
        {
          "tw:border": variant !== "flush",
          "tw:border-slate-200": variant !== "flush",
          "tw:rounded-lg": variant !== "flush",
        },
        "tw:overflow-hidden",
        className
      )}
      {...props}
    />
  ),
  { Item: ListItem }
);
