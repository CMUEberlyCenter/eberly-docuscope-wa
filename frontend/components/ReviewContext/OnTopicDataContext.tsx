import { OnTopicReviewData, OptionalReviewData } from "#/lib/ReviewResponse";
import { userLanguage } from "#/lib/languageCode";
import { useMutation } from "@tanstack/react-query";
import {
  createContext,
  FC,
  ReactNode,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { checkReviewResponse } from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { useReviewDispatch } from "./ReviewContext";
import {
  getAnalysis,
  ReviewDataContext,
  SnapshotProviderProps,
} from "./createReviewDataContext";

function useOnTopic() {
  const [document] = useFileText();
  const [review, setReview] =
    useState<OptionalReviewData<OnTopicReviewData>>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dispatch = useReviewDispatch();
  const { task } = useWritingTask();

  const mutation = useMutation({
    mutationFn: async (data: { document: string }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("canceling previous request");
      }
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/review/ontopic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": userLanguage(task),
        },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: OnTopicReviewData) => {
      setReview(data);
      if (data.response.html) {
        dispatch({ type: "update", sentences: data.response.html });
      }
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
    onError: (error) => {
      console.error("Error fetching Sentences review:", error);
      setReview({ tool: "ontopic", error });
    },
  });
  const [pending, startTransition] = useTransition();
  const update = useEffectEvent((document: string) => {
    dispatch({ type: "remove" });
    mutation.mutate({ document });
  });
  useEffect(() => {
    if (!document) return;
    // Fetch the review data for Sentences
    startTransition(() => {
      update(document);
    });
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [document]);
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);
  return {
    review,
    mutation,
    setReview,
    pending: mutation.isPending || pending,
  };
}

function useSnapshotOnTopic(
  snapshotID: string | undefined,
  analysis: OptionalReviewData<OnTopicReviewData>
) {
  const [review, setReview] =
    useState<OptionalReviewData<OnTopicReviewData>>(analysis);
  const dispatch = useReviewDispatch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      const { id } = data;
      if (
        abortControllerRef.current &&
        abortControllerRef.current.signal.aborted === false
      ) {
        abortControllerRef.current.abort("canceling previous request");
      }
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/snapshot/${id}/ontopic`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // language unnecessary for snapshot reviews since they should already be
          // localized based on the snapshot's writing task's user_lang.
        },
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: OnTopicReviewData) => {
      setReview(data);
      if (data.response.html) {
        dispatch({ type: "update", sentences: data.response.html });
      }
    },
    onError: (error) => {
      setReview({ tool: "ontopic", error });
      console.error(`Error fetching Ontopic review:`, error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  const [pending, startTransition] = useTransition();
  const triggerMutation = useEffectEvent((id: string) => {
    mutation.mutate({ id });
  });
  const triggerDispatch = useEffectEvent(
    (analysis: OptionalReviewData<OnTopicReviewData>) => {
      if (analysis && "response" in analysis && analysis.response.html) {
        dispatch({ type: "update", sentences: analysis.response.html });
      }
    }
  );
  useEffect(() => {
    if (!snapshotID) return;
    if (analysis && analysis.tool === "ontopic") {
      startTransition(() => {
        triggerDispatch(analysis);
      });
      return;
    }
    startTransition(() => {
      triggerMutation(snapshotID);
    });
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [snapshotID, analysis]);
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);
  return {
    review,
    mutation,
    setReview,
    pending: mutation.isPending || pending,
  };
}

const OnTopicDataContext =
  createContext<ReviewDataContext<OnTopicReviewData> | null>(null);

export const useOnTopicData = () => {
  const context = use(OnTopicDataContext);
  if (!context) {
    throw new Error("useOnTopicData must be used within a OnTopicDataProvider");
  }
  return context;
};

export const OnTopicDataProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const ontopic = useOnTopic();
  return <OnTopicDataContext value={ontopic}>{children}</OnTopicDataContext>;
};
export const OnTopicSnapshotProvider: FC<SnapshotProviderProps> = ({
  children,
  snapshotId,
  analyses,
}) => {
  const ontopic = useSnapshotOnTopic(
    snapshotId,
    getAnalysis<OnTopicReviewData>(analyses, "ontopic")
  );
  return <OnTopicDataContext value={ontopic}>{children}</OnTopicDataContext>;
};
