import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { FC } from "react";
import Alert from "react-bootstrap/esm/Alert";
import { useTranslation } from "react-i18next";

/** Component for displaying access denied messages for a specific review tool. */
export const AccessDeniedReviewTool: FC<{
  /** Id of the review tool. Used to look up the tool's title in the i18n review namespace. */
  tool: string;
  /** Reason for the access denial from the AccessDeniedReason enum. */
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
