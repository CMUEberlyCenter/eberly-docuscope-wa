import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  ProminentTopics,
  ProminentTopicsContext,
} from "#components/Review/ProminentTopics";
import { getAnalysis } from "#components/ReviewContext/createReviewDataContext";
import { OptionalReviewData, ProminentTopicsData } from "#lib/ReviewResponse";
import { isEnabled } from "#lib/WritingTask";
import { FC, useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onProminentTopics } from "./Page.telefunc";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<
    OptionalReviewData<ProminentTopicsData>
  >(
    () => getAnalysis<ProminentTopicsData>(analyses, "prominent_topics") ?? null
  );

  const accessGranted =
    settings?.prominent_topics &&
    isEnabled(task, "prominent_topics") &&
    tool_config.includes("prominent_topics");
  useEffect(() => {
    if (!analysis && accessGranted) {
      const handleGetData = async () => {
        setLoading(true);
        try {
          const snapshotData = await onProminentTopics(id);
          console.log(`Snapshot data received for id ${id}:`, snapshotData);
          if ("error" in snapshotData) {
            throw new Error(
              snapshotData.error?.detail ||
                "Unknown error occurred while fetching Prominent Topics data."
            );
          }
          setAnalysis(snapshotData.analysis);
        } catch (error) {
          console.error("Error fetching Prominent Topics data:", error);
        } finally {
          setLoading(false);
        }
      };
      handleGetData();
    }
  }, [analysis, accessGranted, id]);
  // Following is to deny access to the Prominent Topics tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.prominent_topics) {
    return (
      <AccessDeniedReviewTool
        tool="prominent_topics"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "prominent_topics")) {
    return (
      <AccessDeniedReviewTool
        tool="prominent_topics"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("prominent_topics")) {
    return (
      <AccessDeniedReviewTool
        tool="prominent_topics"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }
  return (
    <ProminentTopicsContext value={{ pending: loading, review: analysis }}>
      <ProminentTopics />
    </ProminentTopicsContext>
  );
};
