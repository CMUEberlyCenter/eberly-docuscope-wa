import AttentionIcon from "#assets/icons/attention_icon.svg?react";
import classNames from "classnames";
import type { FC, HTMLProps } from "react";

type AlertIconProps = {
  /** Message to display for screen readers. */
  message: string;
  /** Show the alert icon. */
  show?: boolean;
} & HTMLProps<HTMLDivElement>;
/**
 * Simple alert icon component with a title tooltip.
 * ```tsx
 * <AlertIcon message="This is an alert" />
 * ```
 */
export const AlertIcon: FC<AlertIconProps> = ({
  message,
  show = true,
  className,
  ...props
}) => (
  <>
    {show ? (
      <div
        role="alert"
        {...props}
        className={classNames(className, "text-warning")}
        title={message}
      >
        <AttentionIcon className="tw:size-16" />
        <span className="tw:sr-only visually-hidden">{message}</span>
      </div>
    ) : null}
  </>
);
