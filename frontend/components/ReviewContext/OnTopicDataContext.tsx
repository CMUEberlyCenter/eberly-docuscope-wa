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
import {
  OnTopicReviewData,
  OptionalReviewData,
} from "../../src/lib/ReviewResponse";
import { checkReviewResponse } from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
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
  useEffect(() => {
    if (!document) return;
    // Fetch the review data for Sentences
    dispatch({ type: "remove" });
    mutation.mutate({
      document,
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
  return { review, mutation, setReview, pending: mutation.isPending };
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
  useEffect(() => {
    if (!snapshotID) return;
    if (analysis && analysis.tool === "ontopic") {
      setReview(analysis as OptionalReviewData<OnTopicReviewData>);
      if ("response" in analysis && analysis.response.html) {
        dispatch({ type: "update", sentences: analysis.response.html });
      }
      return;
    }
    mutation.mutate({
      id: snapshotID,
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
  return { review, mutation, setReview, pending: mutation.isPending };
}

const OnTopicDataContext =
  createContext<ReviewDataContext<OnTopicReviewData> | null>(null);

export const useOnTopicData = () => {
  const context = useContext(OnTopicDataContext);
  if (!context) {
    throw new Error("useOnTopicData must be used within a OnTopicDataProvider");
  }
  return context;
};

export const OnTopicDataProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const ontopic = useOnTopic();
  return (
    <OnTopicDataContext.Provider value={ontopic}>
      {children}
    </OnTopicDataContext.Provider>
  );
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
  return (
    <OnTopicDataContext.Provider value={ontopic}>
      {children}
    </OnTopicDataContext.Provider>
  );
};
