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
import { usePageContext } from "vike-react/usePageContext";
import { checkReviewResponse } from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";
import { useReviewDispatch } from "./ReviewContext";
import { ReviewDataContext } from "./createReviewDataContext";
import { onGrade } from "./createReviewDataContext.telefunc";

function useOnTopic() {
  const [document] = useFileText();
  const [review, setReview] =
    useState<OptionalReviewData<OnTopicReviewData>>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dispatch = useReviewDispatch();
  const [{ task }] = useWritingTask();
  const { ltik } = usePageContext();

  const mutation = useMutation({
    mutationFn: async (data: { document: string }) => {
      abortControllerRef.current?.abort("canceling previous request");
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
        signal: abortControllerRef.current?.signal,
      });
      checkReviewResponse(response);
      return response.json();
    },
    onSuccess: (data: OnTopicReviewData) => {
      setReview(data);
      if (data.response.html) {
        dispatch({ type: "update", sentences: data.response.html });
      }
      if (ltik) {
        onGrade(ltik, 1.0, { tool: "ontopic" });
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

export const OnTopicDataContext =
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
