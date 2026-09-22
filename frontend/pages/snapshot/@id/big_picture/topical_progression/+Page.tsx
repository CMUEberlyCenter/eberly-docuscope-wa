import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool.js";
import {
  TopicalProgression,
  OrganizationSnapshotProvider,
} from "#components/Review/TopicalProgression.js";
import { isEnabled } from "#lib/WritingTask";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  // Following is to deny access to the Topical Progression tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.term_matrix) {
    return (
      <AccessDeniedReviewTool
        tool="organization"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "term_matrix")) {
    return (
      <AccessDeniedReviewTool
        tool="organization"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("term_matrix")) {
    return (
      <AccessDeniedReviewTool
        tool="organization"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }
  return (
    <OrganizationSnapshotProvider snapshotId={id} analyses={analyses}>
      <TopicalProgression />
    </OrganizationSnapshotProvider>
  );
};
