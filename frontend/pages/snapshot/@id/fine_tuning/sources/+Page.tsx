import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool";
import { Sources, SourcesContext } from "#components/Review/Sources";
import { getAnalysis } from "#components/ReviewContext/createReviewDataContext";
import { OptionalReviewData, SourcesData } from "#lib/ReviewResponse";
import { isEnabled } from "#lib/WritingTask";
import { FC, useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onSources } from "./Page.telefunc";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<OptionalReviewData<SourcesData>>(
    () => getAnalysis<SourcesData>(analyses, "sources") ?? null
  );
  const accessGranted =
    settings?.sources &&
    isEnabled(task, "sources") &&
    tool_config.includes("sources");
  useEffect(() => {
    if (!analysis && accessGranted) {
      const handleGetData = async () => {
        setLoading(true);
        try {
          const snapshotData = await onSources(id);
          console.log(`Snapshot data received for id ${id}:`, snapshotData);
          if ("error" in snapshotData) {
            throw new Error(
              snapshotData.error?.detail ||
                "Unknown error occurred while fetching Sources data."
            );
          }
          setAnalysis(snapshotData.analysis);
        } catch (error) {
          console.error("Error fetching Sources data:", error);
        } finally {
          setLoading(false);
        }
      };
      handleGetData();
    }
  }, [analysis, accessGranted, id]);

  // Following is to deny access to the Sources tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.sources) {
    return (
      <AccessDeniedReviewTool
        tool="sources"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "sources")) {
    return (
      <AccessDeniedReviewTool
        tool="sources"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("sources")) {
    return (
      <AccessDeniedReviewTool
        tool="sources"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }
  return (
    <SourcesContext value={{ pending: loading, review: analysis }}>
      <Sources />
    </SourcesContext>
  );
};
