import { useMutation } from "@tanstack/react-query";
import classNames from "classnames";
import {
  createContext,
  type Dispatch,
  type FC,
  HTMLProps,
  type ReactNode,
  use,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/esm/Alert";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { Optional } from "../../src";
import {
  Analysis,
  isErrorData,
  OnTopicReviewData,
  OptionalReviewData,
  ReviewTool,
} from "../../src/lib/ReviewResponse";
import { WritingTask } from "../../src/lib/WritingTask";
import {
  checkReviewResponse,
  ReviewErrorData,
} from "../ErrorHandler/ErrorHandler";
import { useFileText } from "../FileUpload/FileTextContext";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";

type ReviewContextState = {
  /** List of paragraph ids to highlight. */
  paragraphs?: string[];
  /** Lists of sentence ids to highlight for each highlighting level */
  sentences?: string[][];
  /** HTML Text to display in the review tool. */
  text?: string;
};
const initialReviewContext: ReviewContextState = {
  paragraphs: [],
  sentences: [],
};

/** Context for review tools. */
const ReviewContext = createContext<ReviewContextState | null>(null);
/** Hook for accessing the review context state. */
export const useReviewContext = () => useContext(ReviewContext);
/** Context for dispatching actions to modify the review tools state. */
const ReviewDispatchContext = createContext<Dispatch<ReviewAction>>(
  () => undefined
);
/**
 * Hook for accessing the dispatch function for review tools.
 * Actions:
 *   - `set`: Set sentences and paragraphs highlighting.
 *     - `sentences`: Array of arrays of sentence ids to highlight.
 *     - `paragraphs`: Array of paragraph ids to highlight.
 *   - `unset`: Unset sentences and paragraphs highlighting.
 *   - `update`: Replace text using sentences parameter.
 *     - `sentences`: New text content (html string).
 *   - `remove`: Nullify text which should then use the default text.
 * @returns Dispatch function for modifying the review state.
 */
export const useReviewDispatch = () => useContext(ReviewDispatchContext);

type ReviewAction =
  | {
      type: "set"; // set highlighting
      sentences: string[][]; // array of arrays of sentence ids
      paragraphs?: string[]; // array of paragraph ids
    }
  | {
      type: "unset"; // unset highlighting
      sentences?: undefined;
      paragraphs?: undefined;
    }
  | {
      type: "update"; // set text content
      sentences: string; // text content
      paragraphs?: undefined;
    }
  | {
      type: "remove";
      sentences?: undefined;
      paragraphs?: undefined;
    };

/** Dispatch function for modifying the review state. */
function reviewReducer(
  review: ReviewContextState,
  { type, sentences, paragraphs }: ReviewAction
) {
  switch (type) {
    case "set": // set sentences and paragraphs highlighting, clobbers existing
      return { ...review, sentences, paragraphs };
    case "unset": // unset sentences and paragraphs highlighting, ignores parameters.
      return { ...review, sentences: [], paragraphs: [] };
    case "update": // replace text using sentences parameter.
      return { ...review, text: sentences };
    case "remove": // nullify text which should then use the default text.
      return { ...review, text: undefined };
    default:
      console.warn(`Unknown action: ${type}`);
      return review;
  }
}

/**
 * A component for providing the contexts for review tools.
 * This is for handling the displayed text and its highlighting.
 * @param param0.chidren the child nodes.
 * @returns
 */
export const ReviewProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [review, dispatch] = useReducer(reviewReducer, initialReviewContext);

  return (
    <ReviewContext.Provider value={review}>
      <ReviewDispatchContext.Provider value={dispatch}>
        {children}
      </ReviewDispatchContext.Provider>
    </ReviewContext.Provider>
  );
};

/**
 * A component that unsets the review state in the current context when
 * mounted and unmounted.
 * @param param0.children Child elements.
 * @returns React component to use in composition with review tools.
 */
export const ReviewReset: FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = use(ReviewDispatchContext);
  // unset sentences so that any previous highlighting is cleared.
  // remove tool specific text data.
  useEffect(() => {
    dispatch({ type: "unset" });
    dispatch({ type: "remove" });
    return () => {
      dispatch({ type: "unset" });
      dispatch({ type: "remove" });
    };
  }, []);
  return children;
};

export type ReviewToolContentProps<T> = HTMLProps<HTMLDivElement> & {
  isPending: boolean;
  review: OptionalReviewData<T>;
};

/** Preview card properties. */
export type PreviewCardProps<T> = HTMLProps<HTMLDivElement> & {
  reviewID?: string;
  analysis?: OptionalReviewData<T>;
};

export const ReviewToolCard: FC<
  ReviewToolContentProps<Analysis> & {
    children: ReactNode;
    title: string;
    instructionsKey: string;
    errorMessage: string;
  }
> = ({
  children,
  className,
  isPending,
  title,
  instructionsKey,
  errorMessage,
  review,
  ...props
}) => {
  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader title={title} instructionsKey={instructionsKey} />
        {isPending || !review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallbackRender={({
              error /*, resetErrorBoundary*/,
            }: FallbackProps) => (
              <Alert variant="danger">
                <p>{errorMessage}</p>
                {error instanceof Error && (
                  <pre className="mt-2">{error.message}</pre>
                )}
                {/* needs onReset <Button variant="primary" onClick={resetErrorBoundary}>Try again</Button> */}
              </Alert>
            )}
            // onReset={(details) => mutation.reset()}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {children}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};

export function useOnTopic() {
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

export function useReview<T extends Analysis>(tool: ReviewTool) {
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

export function useSnapshotReview<T extends Analysis>(
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

export function useSnapshotOnTopic(
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
