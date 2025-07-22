import type { FC, HTMLProps } from "react";
import AttentionIcon from "../../assets/icons/attention_icon.svg?react";
import classNames from "classnames";
import css from "./AlertIcon.module.scss";

type AlertIconProps = HTMLProps<HTMLDivElement> & {
  message: string;
  show?: boolean;
};
/** Simple alert icon component with a title tooltip. */
export const AlertIcon: FC<AlertIconProps> = ({
  message,
  show,
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
        <AttentionIcon className={css["alert-icon"]} />
        <span className="sr-only visually-hidden">{message}</span>
      </div>
    ) : null}
  </>
);
