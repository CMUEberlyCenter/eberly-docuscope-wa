import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  LogicalFlow,
  LogicalFlowContext,
} from "#components/Review/LogicalFlow";
import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { isEnabled } from "#lib/WritingTask";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onLogicalFlow } from "./Page.telefunc";

export const Page: FC = () => {
  const { task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();

  const accessDeniedReason = (() => {
    if (!settings?.logical_flow) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "logical_flow")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("logical_flow")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  const result = useSuspenseQuery({
    queryKey: ["logical_flow", id],
    queryFn: async () => {
      const analysis = await onLogicalFlow(id);
      if ("error" in analysis) {
        // TODO: this should be handled...
        // in particular, forbidden errors which should be posted to AccessDeniedReviewTool.
        throw new Error(
          analysis.error.detail ||
            "Unknown error occurred while fetching Lines of Arguments data."
        );
      }
      return analysis;
    },
  });

  // Following is to deny access to the Logical Flow tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool tool="logical_flow" reason={accessDeniedReason} />
    );
  }

  return (
    <LogicalFlowContext
      value={{ pending: result.isLoading, review: result.data?.analysis }}
    >
      <LogicalFlow />
    </LogicalFlowContext>
  );
};
