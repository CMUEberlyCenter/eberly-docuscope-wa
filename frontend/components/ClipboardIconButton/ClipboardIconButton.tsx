import type { FC } from "react";
import { Button, type ButtonProps } from "react-bootstrap";
import { Translation } from "react-i18next";
import ClipboardIcon from "../../assets/icons/clipboard_icon.svg?react";
import classNames from "classnames";

/**
 * ClipboardIconButton component for displaying a button with a clipboard icon.
 */
export const ClipboardIconButton: FC<ButtonProps> = ({
  className,
  ...props
}) => (
  <Translation>
    {(t) => (
      <Button
        {...props}
        variant="icon"
        className={classNames("text-primary", className)}
      >
        <ClipboardIcon />
        <span className="visually-hidden sr-only">{t("clipboard")}</span>
      </Button>
    )}
  </Translation>
);
