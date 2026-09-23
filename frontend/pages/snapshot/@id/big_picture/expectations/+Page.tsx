import { AccessDeniedReason } from "#/lib/AccessDeniedReason";
import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  Expectations,
  ExpectationSnapshotProvider,
} from "#components/Review/Expectations";
import { isExpectationsData } from "#lib/ReviewResponse";
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
  const accessDeniedReason = (() => {
    if (!settings?.expectations) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "expectations")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("expectations")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  // Following is to deny access to the Expectations tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool tool="expectations" reason={accessDeniedReason} />
    );
  }

  return (
    <ExpectationSnapshotProvider
      snapshotID={id}
      analysis={analyses.filter(isExpectationsData)}
      task={task}
    >
      <Expectations />
    </ExpectationSnapshotProvider>
  );
};
