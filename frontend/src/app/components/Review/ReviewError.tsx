import type { FC } from "react";
import { Alert, type AlertProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Optional } from "../../..";
import type { ErrorData } from "../../../lib/ReviewResponse";

export function checkReviewResponse(response: Response): Optional<ErrorData> {
  if (!response.ok) {
    switch (response.status) {
      case 413:
        throw new Error("TOO_LARGE", { cause: "TOO_LARGE" });
      case 502:
      case 503:
      case 504:
        throw new Error("SERVICE_UNAVAILABLE", {
          cause: "SERVICE_UNAVAILABLE",
        });
      default:
        throw new Error("UNKNOWN_ERROR", { cause: "UNKNOWN_ERROR" });
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
  switch (data?.error?.cause) {
    case "TOO_LARGE":
      return (
        <Alert {...props} variant={variant ?? "danger"}>
          <Alert.Heading>{t("error.header")}</Alert.Heading>
          <p>{t("error.too_large")}</p>
        </Alert>
      );
    case "SERVICE_UNAVAILABLE":
      return (
        <Alert {...props} variant={variant ?? "warning"}>
          <Alert.Heading>{t("error.header")}</Alert.Heading>
          <p>{t("error.service_unavailable")}</p>
        </Alert>
      );
    default:
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
  }
};
