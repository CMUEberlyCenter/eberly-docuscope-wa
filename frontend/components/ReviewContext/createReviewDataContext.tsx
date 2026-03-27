import { Optional } from "#/index";
import { userLanguage } from "#/lib/languageCode";
import { Analysis, OptionalReviewData, ReviewTool } from "#/lib/ReviewResponse";
import { WritingTask } from "#/lib/WritingTask";
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

function useReview<T extends Analysis>(tool: ReviewTool) {
  const [document] = useFileText();
  const { task: writing_task } = useWritingTask();
  const [review, setReview] = useState<OptionalReviewData<T>>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dispatch = useReviewDispatch();

  const mutation = useMutation({
    mutationFn: async (data: {
      document: string;
      writing_task: Optional<WritingTask>;
    }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("canceling previous request");
      }
      abortControllerRef.current = new AbortController();
      dispatch({ type: "unset" }); // probably not needed, but just in case
      dispatch({ type: "remove" }); // fix for #225 - second import not refreshing view.
      const response = await fetch(`/api/v2/review/${tool}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": userLanguage(data.writing_task),
        },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: ({ input, data }: { input: string; data: T }) => {
      dispatch({ type: "unset" });
      dispatch({ type: "update", sentences: input });
      // check if isErrorData? - should be handled in component
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool, error });
      console.error(`Error fetching ${tool} review:`, error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const [pending, startTransition] = useTransition();
  const triggerMutation = useEffectEvent(
    (document: string, writing_task: Optional<WritingTask>) => {
      mutation.mutate({ document, writing_task });
    }
  );

  // When the document or writing task changes, fetch a new review
  useEffect(() => {
    if (!document) return;
    startTransition(() => {
      triggerMutation(document, writing_task);
    });
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [document, writing_task]);
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

function useSnapshotReview<T extends Analysis>(
  tool: ReviewTool,
  snapshotID: string | undefined,
  analysis: OptionalReviewData<T>
) {
  const [review, setReview] = useState<OptionalReviewData<T>>(analysis);
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
      const response = await fetch(`/api/v2/snapshot/${id}/${tool}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // language should be determined server side by snapshot's writing task's user_lang.
        },
        signal: abortControllerRef.current.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: T) => {
      dispatch({ type: "unset" });
      // dispatch({ type: "update", sentences:  });
      setReview(data);
    },
    onError: (error) => {
      setReview({ tool, error });
      console.error(`Error fetching ${tool} review:`, error);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });
  const triggerMutation = useEffectEvent((id: string) => {
    mutation.mutate({ id });
  });
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!snapshotID) return;
    startTransition(() => {
      triggerMutation(snapshotID);
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [snapshotID]);
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

export type ReviewDataContext<T extends Analysis> = {
  review: OptionalReviewData<T>;
  pending: boolean;
};
export type SnapshotProviderProps = {
  children: ReactNode;
  snapshotId: string;
  analyses?: Analysis[];
};

export function getAnalysis<T extends Analysis>(
  analyses: Analysis[] | undefined,
  tool: ReviewTool
): OptionalReviewData<T> {
  return analyses?.find((a) => a.tool === tool) as OptionalReviewData<T>;
}

export function createReviewDataContext<T extends Analysis>(tool: ReviewTool) {
  const Context = createContext<ReviewDataContext<T> | null>(null);
  // eslint-disable-next-line @eslint-react/component-hook-factories
  const useReviewDataContext = () => {
    const ctx = use(Context);
    if (!ctx) {
      throw new Error(
        "useReviewContext must be used within a ReviewProvider or SnapshotProvider"
      );
    }
    return ctx;
  };

  // eslint-disable-next-line @eslint-react/component-hook-factories
  const ReviewDataProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { review, pending } = useReview<T>(tool);
    return <Context value={{ review, pending }}>{children}</Context>;
  };

  // eslint-disable-next-line @eslint-react/component-hook-factories
  const SnapshotDataProvider: FC<SnapshotProviderProps> = ({
    children,
    snapshotId,
    analyses,
  }) => {
    const { review, pending } = useSnapshotReview<T>(
      tool,
      snapshotId,
      getAnalysis<T>(analyses, tool)
    );
    return <Context value={{ review, pending }}>{children}</Context>;
  };
  return { ReviewDataProvider, SnapshotDataProvider, useReviewDataContext };
}
