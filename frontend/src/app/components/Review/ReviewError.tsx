import { FC } from "react";
import { Alert, type AlertProps } from "react-bootstrap";
import { Translation } from "react-i18next";
import type { ErrorData } from "../../../lib/ReviewResponse";

export const ReviewError: FC<
  AlertProps & {
    error: Error;
    resetErrorBoundary: () => void;
  }
> = ({ error, variant, ...props }) => (
  <Translation ns={"review"}>
    {(t) => (
      <Alert {...props} variant={variant ?? "danger"}>
        <Alert.Heading>{t("error.header")}</Alert.Heading>
        <p>{t("error.content")}</p>
        {!!error?.message && (
          <p>{t("error.details", { message: error.message })}</p>
        )}
      </Alert>
    )}
  </Translation>
);

export const ReviewErrorData: FC<AlertProps & { data: ErrorData }> = ({
  data,
  variant,
  ...props
}) => (
  <Translation ns="review">
    {(t) => (
      <Alert {...props} variant={variant ?? "danger"}>
        <Alert.Heading>{t("error.header")}</Alert.Heading>
        <p>
          {process.env.NODE_ENV === "production" ? (
            <p>{t("error.content")}</p>
          ) : (
            data.error.message
          )}
        </p>
      </Alert>
    )}
  </Translation>
);
