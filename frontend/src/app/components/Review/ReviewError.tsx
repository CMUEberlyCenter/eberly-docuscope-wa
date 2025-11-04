import type { FC } from "react";
import { Alert, type AlertProps } from "react-bootstrap";
import { Translation } from "react-i18next";
import { Optional } from "../../..";
import type { ErrorData } from "../../../lib/ReviewResponse";

/**
 * Component for displaying error content returned from the backend.
 * @param param0.data - The error data to display.
 * @returns
 */
export const ReviewErrorData: FC<
  AlertProps & { data: Optional<ErrorData> }
> = ({ data, variant, ...props }) => (
  <Translation ns="review">
    {(t) => (
      <Alert {...props} variant={variant ?? "danger"}>
        <Alert.Heading>{t("error.header")}</Alert.Heading>
        <p>
          {process.env.NODE_ENV === "production" || !data ? (
            <p>{t("error.content")}</p>
          ) : (
            data.error.message
          )}
        </p>
      </Alert>
    )}
  </Translation>
);
