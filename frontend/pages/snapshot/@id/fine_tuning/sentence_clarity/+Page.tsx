import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool.js";
import {
  Sentences,
  SentencesSnapshotProvider,
} from "#components/Review/Sentences";
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
  // Following is to deny access to the Sentences tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.sentence_density) {
    return (
      <AccessDeniedReviewTool
        tool="sentences"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "sentence_density")) {
    return (
      <AccessDeniedReviewTool
        tool="sentences"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("sentence_density")) {
    return (
      <AccessDeniedReviewTool
        tool="sentences"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }
  return (
    <SentencesSnapshotProvider snapshotId={id} analyses={analyses}>
      <Sentences />
    </SentencesSnapshotProvider>
  );
};
