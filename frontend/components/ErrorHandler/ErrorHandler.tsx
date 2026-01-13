import type { FC } from "react";
import { Alert, type AlertProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Optional } from "../../src";
import type { ErrorData } from "../../src/lib/ReviewResponse";
import { ToolResult } from "../../src/app/lib/ToolResults";

class InputTooLargeError extends Error {}
class ServiceUnavailableError extends Error {}

/**
 * Checks the HTTP response for errors and returns the corresponding error data.
 * @param response HTTP response object.
 * @returns null.
 * @throws InputTooLargeError if the response status is 413.
 * @throws ServiceUnavailableError if the response status is 502, 503, or 504.
 * @throws Error for other non-OK responses.
 */
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
 * Component for displaying tool errors.
 * @param param0.tool - The tool result containing error information.
 * @returns
 */
export const ToolErrorHandler: FC<{ tool: ToolResult }> = ({ tool }) => {
  const { t } = useTranslation();
  if (!tool.error) {
    return null;
  }
  if (tool.error instanceof InputTooLargeError) {
    return <Alert variant="warning">{t("error.input_too_large_error")}</Alert>;
  }
  if (tool.error instanceof ServiceUnavailableError) {
    return <Alert variant="warning">{t("error.service_unavailable")}</Alert>;
  }
  return (
    <Alert variant="warning">
      {t("error.unknown_error")}: {tool.error.message}
    </Alert>
  );
};

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
