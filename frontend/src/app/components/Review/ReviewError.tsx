import type { FC } from "react";
import { Alert, type AlertProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Optional } from "../../..";
import type { ErrorData } from "../../../lib/ReviewResponse";

export class InputTooLargeError extends Error {}
export class ServiceUnavailableError extends Error {}
export function checkReviewResponse(response: Response): Optional<ErrorData> {
  if (!response.ok) {
    switch (response.status) {
      case 413:
        throw new InputTooLargeError("TOO_LARGE");
      case 502:
      case 503:
      case 504:
        throw new ServiceUnavailableError("SERVICE_UNAVAILABLE");
      default:
        throw new Error("UNKNOWN_ERROR", { cause: response.statusText });
    }
  }
  return null;
}

/**
 * Component for displaying error content returned from the backend.
 * @param param0.data - The error data to display.
 * @returns
 */
export const ReviewErrorData: FC<
  AlertProps & { data: Optional<ErrorData> }
> = ({ data, variant, ...props }) => {
  const { t } = useTranslation("review");
  if (data?.error instanceof InputTooLargeError) {
    return (
      <Alert {...props} variant={variant ?? "danger"}>
        <Alert.Heading>{t("error.header")}</Alert.Heading>
        <p>{t("error.too_large")}</p>
      </Alert>
    );
  }
  if (data?.error instanceof ServiceUnavailableError) {
    return (
      <Alert {...props} variant={variant ?? "warning"}>
        <Alert.Heading>{t("error.header")}</Alert.Heading>
        <p>{t("error.service_unavailable")}</p>
      </Alert>
    );
  }
  return (
    <Alert {...props} variant={variant ?? "danger"}>
      <Alert.Heading>{t("error.header")}</Alert.Heading>
      <p>
        {process.env.NODE_ENV === "production" || !data
          ? t("error.content")
          : data.error.message}
      </p>
    </Alert>
  );
};
