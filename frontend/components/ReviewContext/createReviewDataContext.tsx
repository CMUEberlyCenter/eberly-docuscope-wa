import { useMutation } from "@tanstack/react-query";
import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Optional } from "../../src";
import {
  Analysis,
  OptionalReviewData,
  ReviewTool,
} from "../../src/lib/ReviewResponse";
import { WritingTask } from "../../src/lib/WritingTask";
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

  // When the document or writing task changes, fetch a new review
  useEffect(() => {
    if (!document) return;
    mutation.mutate({
      document,
      writing_task,
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
  return { review, mutation, setReview, pending: mutation.isPending };
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
  useEffect(() => {
    if (!snapshotID) return;
    if (analysis && analysis.tool === tool) {
      setReview(analysis as OptionalReviewData<T>);
      return;
    }
    mutation.mutate({
      id: snapshotID,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [snapshotID, analysis]);
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);
  return { review, mutation, setReview, pending: mutation.isPending };
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
  const useReviewDataContext = () => {
    const ctx = useContext(Context);
    if (!ctx) {
      throw new Error(
        "useReviewContext must be used within a ReviewProvider or SnapshotProvider"
      );
    }
    return ctx;
  };

  const ReviewDataProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { review, pending } = useReview<T>(tool);
    return (
      <Context.Provider value={{ review, pending }}>
        {children}
      </Context.Provider>
    );
  };

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
    return (
      <Context.Provider value={{ review, pending }}>
        {children}
      </Context.Provider>
    );
  };
  return { ReviewDataProvider, SnapshotDataProvider, useReviewDataContext };
}
