import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import { Sentences } from "#components/Review/Sentences";
import { OnTopicDataContext } from "#components/ReviewContext/OnTopicDataContext";
import { useReviewDispatch } from "#components/ReviewContext/ReviewContext";
import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { isEnabled } from "#lib/WritingTask";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FC, useEffect } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onSentenceClarity } from "./Page.telefunc";

export const Page: FC = () => {
  const { task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const dispatch = useReviewDispatch();

  const accessDeniedReason = (() => {
    if (!settings?.sentence_density) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "sentence_density")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("sentence_density")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  const result = useSuspenseQuery({
    queryKey: ["sentence_clarity", id],
    queryFn: async () => {
      const analysis = await onSentenceClarity(id);
      if ("error" in analysis) {
        throw new Error(
          analysis.error?.detail ||
            "Unknown error occurred while fetching Lines of Arguments data."
        );
      }
      return analysis;
    },
  });
  useEffect(() => {
    const { analysis } = result.data ?? {};
    if (analysis && "response" in analysis && analysis.response.html) {
      // Update the review context with the onTopic tagged sentences
      dispatch({ type: "update", sentences: analysis.response.html });
    }
    return () => {
      dispatch({ type: "remove" });
    };
  }, [result, dispatch]);
  // Following is to deny access to the Sentences tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool tool="sentences" reason={accessDeniedReason} />
    );
  }
  return (
    <OnTopicDataContext
      value={{ pending: result.isLoading, review: result.data?.analysis }}
    >
      <Sentences />
    </OnTopicDataContext>
  );
};
