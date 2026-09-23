import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  LinesOfArguments,
  LinesOfArgumentsContext,
} from "#components/Review/LinesOfArguments";
import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { isEnabled } from "#lib/WritingTask";
import { useSuspenseQuery } from "@tanstack/react-query";
import { withFallback } from "vike-react-query";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onLinesOfArguments } from "./Page.telefunc";

export const Page = withFallback(() => {
  const { task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();

  const accessDeniedReason = (() => {
    if (!settings?.lines_of_arguments) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "lines_of_arguments")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("lines_of_arguments")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  const result = useSuspenseQuery({
    queryKey: ["lines_of_arguments", id],
    queryFn: async () => {
      const analysis = await onLinesOfArguments(id);
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

  // Following is to deny access to the Lines of Arguments tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool
        tool="lines_of_arguments"
        reason={accessDeniedReason}
      />
    );
  }
  return (
    <LinesOfArgumentsContext
      value={{ pending: result.isLoading, review: result.data?.analysis }}
    >
      <LinesOfArguments />
    </LinesOfArgumentsContext>
  );
});
