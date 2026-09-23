import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { FC } from "react";
import Alert from "react-bootstrap/esm/Alert";
import { useTranslation } from "react-i18next";

export const AccessDeniedReviewTool: FC<{
  tool: string;
  reason: AccessDeniedReason;
}> = ({ tool, reason }) => {
  const { t } = useTranslation("review");
  if (reason === AccessDeniedReason.SERVER_DENY) {
    return (
      <Alert variant="danger" className="m-3">
        {t("error.server_deny", { tool: t(`${tool}.title`) })}
      </Alert>
    );
  }
  if (
    reason === AccessDeniedReason.WRITING_TASK_DENY ||
    reason === AccessDeniedReason.SNAPSHOT_CONFIG_DENY
  ) {
    return (
      <Alert variant="danger" className="m-3">
        {t("error.writing_task_deny", { tool: t(`${tool}.title`) })}
      </Alert>
    );
  }
  return null;
};
