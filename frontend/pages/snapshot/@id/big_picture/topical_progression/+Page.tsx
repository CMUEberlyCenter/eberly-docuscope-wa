import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool";
import { TopicalProgression } from "#components/Review/TopicalProgression";
import { getAnalysis } from "#components/ReviewContext/createReviewDataContext";
import { OnTopicDataContext } from "#components/ReviewContext/OnTopicDataContext";
import { useReviewDispatch } from "#components/ReviewContext/ReviewContext";
import { OnTopicReviewData, OptionalReviewData } from "#lib/ReviewResponse";
import { isEnabled } from "#lib/WritingTask";
import { FC, useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onTopicalProgression } from "./Page.telefunc";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<
    OptionalReviewData<OnTopicReviewData>
  >(() => getAnalysis<OnTopicReviewData>(analyses, "ontopic") ?? null);
  const dispatch = useReviewDispatch();

  const accessGranted =
    settings?.term_matrix &&
    isEnabled(task, "term_matrix") &&
    tool_config.includes("term_matrix");
  useEffect(() => {
    if (!analysis && accessGranted) {
      const handleGetData = async () => {
        setLoading(true);
        try {
          const snapshotData = await onTopicalProgression(id);
          if ("error" in snapshotData) {
            throw new Error(
              snapshotData.error?.detail ||
                "Unknown error occurred while fetching Lines of Arguments data."
            );
          }
          setAnalysis(snapshotData.analysis);
        } catch (error) {
          console.error("Error fetching Lines of Arguments data:", error);
        } finally {
          setLoading(false);
        }
      };
      handleGetData();
    }
  }, [analysis, accessGranted, id]);
  useEffect(() => {
    if (analysis && "response" in analysis && analysis.response.html) {
      // Update the review context with the onTopic tagged sentences
      console.log("update sentences.");
      dispatch({ type: "update", sentences: analysis.response.html });
    }
  }, [analysis, dispatch]);
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
    <OnTopicDataContext value={{ pending: loading, review: analysis }}>
      <TopicalProgression />
    </OnTopicDataContext>
  );
};
