import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  LogicalFlow,
  LogicalFlowContext,
} from "#components/Review/LogicalFlow";
import { getAnalysis } from "#components/ReviewContext/createReviewDataContext";
import { LogicalFlowData, OptionalReviewData } from "#lib/ReviewResponse";
import { isEnabled } from "#lib/WritingTask";
import { FC, useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onLogicalFlow } from "./Page.telefunc";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<OptionalReviewData<LogicalFlowData>>(
    () => getAnalysis<LogicalFlowData>(analyses, "logical_flow") ?? null
  );

  const accessGranted =
    settings?.logical_flow &&
    isEnabled(task, "logical_flow") &&
    tool_config.includes("logical_flow");
  useEffect(() => {
    if (!analysis && accessGranted) {
      const handleGetData = async () => {
        setLoading(true);
        try {
          const snapshotData = await onLogicalFlow(id);
          console.log(`Snapshot data received for id ${id}:`, snapshotData);
          if ("error" in snapshotData) {
            throw new Error(
              snapshotData.error?.detail ||
                "Unknown error occurred while fetching Logical Flow data."
            );
          }
          setAnalysis(snapshotData.analysis);
        } catch (error) {
          console.error("Error fetching Logical Flow data:", error);
        } finally {
          setLoading(false);
        }
      };
      handleGetData();
    }
  }, [analysis, accessGranted, id]);

  // Following is to deny access to the Logical Flow tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.logical_flow) {
    return (
      <AccessDeniedReviewTool
        tool="logical_flow"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "logical_flow")) {
    return (
      <AccessDeniedReviewTool
        tool="logical_flow"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("logical_flow")) {
    return (
      <AccessDeniedReviewTool
        tool="logical_flow"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }

  return (
    <LogicalFlowContext value={{ pending: loading, review: analysis }}>
      <LogicalFlow />
    </LogicalFlowContext>
  );
};
