import { Alert } from "react-bootstrap";
import { ErrorBoundary, getErrorMessage } from "react-error-boundary";
import { useTranslation } from "react-i18next";

export const TelefuncErrorBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { t } = useTranslation("review");
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => (
        <Alert className="m-3">
          <Alert.Heading>{t("error.header")}</Alert.Heading>
          <p>{t("error.content")}</p>
          <p>
            {t("error.details", {
              message: getErrorMessage(error),
            })}
          </p>
        </Alert>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
