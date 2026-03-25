import { useEffect, type FC } from "react";
import { useTranslation } from "react-i18next";
import { usePageContext } from "vike-react/usePageContext";

export const Page: FC = () => {
  const pageContext = usePageContext();
  const { t } = useTranslation("error");
  // const t = (s: string, opt?: Record<string, string>) => opt ? `${s} ${JSON.stringify(opt)}` : s; // Temporary until translations are added
  const { abortReason, abortStatusCode, is404 } = pageContext;
  useEffect(() => {
    console.error(
      `Error page rendered with status code ${abortStatusCode} and reason:`,
      abortReason,
      `is404: ${is404}`
    );
  }, [abortReason, abortStatusCode, is404]);

  if (is404) {
    return (
      <div className="alert m-5">
        <h4 className="alert-heading text-center">
          404
        </h4>
        <p className="alert-body text-center">{t("not_found")}</p>
      </div>
    );
  }
  let msg = t("unexpected_error");
  if (typeof abortReason === "object" && abortReason?.notAdmin) {
    msg = t("forbidden");
  } else if (abortStatusCode === 401) {
    msg = t("unauthorized");
  } else if (abortStatusCode === 403) {
    msg = t("forbidden");
  } else if (abortStatusCode === 404 || is404) {
    msg = t("not_found");
  } else if (abortStatusCode === 500) {
    msg = t("internal_server_error");
  } else if (abortStatusCode === 503) {
    msg = t("service_unavailable");
  } else if (typeof abortReason === "string") {
    msg = abortReason;
  }
  return (
    <div className="alert alert-danger m-5">
      <h4 className="alert-heading">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"
          viewBox="0 0 16 16"
          role="img"
          aria-label={t("label")}
          width={24}
          height={24}
          fill="currentColor"
        >
          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
        </svg>
        {t("introduction")}
      </h4>
      <p>{t("details", { details: msg })}</p>
      <p>{t("instructions")}</p>
    </div>
  );
};
