import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  LinesOfArguments,
  LinesOfArgumentsContext,
} from "#components/Review/LinesOfArguments";
import { getAnalysis } from "#components/ReviewContext/createReviewDataContext";
import { LinesOfArgumentsData, OptionalReviewData } from "#lib/ReviewResponse";
import { isEnabled } from "#lib/WritingTask";
import { FC, useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onLinesOfArguments } from "./Page.telefunc";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<
    OptionalReviewData<LinesOfArgumentsData>
  >(
    () =>
      getAnalysis<LinesOfArgumentsData>(analyses, "lines_of_arguments") ?? null
  );

  const accessGranted =
    settings?.lines_of_arguments &&
    isEnabled(task, "lines_of_arguments") &&
    tool_config.includes("lines_of_arguments");
  useEffect(() => {
    if (!analysis && accessGranted) {
      const handleGetData = async () => {
        setLoading(true);
        try {
          const snapshotData = await onLinesOfArguments(id);
          console.log(`Snapshot data received for id ${id}:`, snapshotData);
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

  // Following is to deny access to the Lines of Arguments tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.lines_of_arguments) {
    return (
      <AccessDeniedReviewTool
        tool="lines_of_arguments"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "lines_of_arguments")) {
    return (
      <AccessDeniedReviewTool
        tool="lines_of_arguments"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("lines_of_arguments")) {
    return (
      <AccessDeniedReviewTool
        tool="lines_of_arguments"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }

  return (
    <LinesOfArgumentsContext value={{ pending: loading, review: analysis }}>
      <LinesOfArguments />
    </LinesOfArgumentsContext>
  );
};
