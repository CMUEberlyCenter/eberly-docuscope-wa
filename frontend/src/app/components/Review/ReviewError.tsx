import { FC } from "react";
import { Alert } from "react-bootstrap";
import { Translation } from "react-i18next";
import { ErrorData } from "../../../lib/ReviewResponse";

export const ReviewError: FC<{
  error: Error;
  resetErrorBoundary: () => void;
}> = ({ error }) => (
  <Translation ns={"review"}>
    {(t) => (
      <Alert variant="danger">
        <Alert.Heading>{t("error.header")}</Alert.Heading>
        <p>{t("error.content")}</p>
        {!!error?.message && (
          <p>{t("error.details", { message: error.message })}</p>
        )}
      </Alert>
    )}
  </Translation>
);

export const ReviewErrorData: FC<{ data: ErrorData }> = ({ data }) => (
  <Translation ns="review">
    {(t) => (
      <Alert variant="danger">
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
