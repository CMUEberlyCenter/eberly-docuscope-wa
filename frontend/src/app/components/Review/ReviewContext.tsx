import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  use,
  useEffect,
  useReducer,
} from "react";

type ReviewContextState = {
  paragraphs?: string[];
  sentences?: string[][];
  text?: string;
};
const initialReviewContext: ReviewContextState = {
  paragraphs: [],
  sentences: [],
};

/** Context for review tools. */
export const ReviewContext = createContext<ReviewContextState | null>(null);
/** Context for dispatching actions to modify the review tools state. */
export const ReviewDispatchContext = createContext<Dispatch<ReviewAction>>(
  () => undefined
);

type ReviewAction =
  | {
      type: "set";
      sentences: string[][];
      paragraphs?: string[];
    }
  | {
      type: "unset";
      sentences?: undefined;
      paragraphs?: undefined;
    }
  | {
      type: "update";
      sentences: string;
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
    case "set":
      return { ...review, sentences, paragraphs };
    case "unset":
      return { ...review, sentences: [], paragraphs: [] };
    case "update":
      return { ...review, text: sentences };
    case "remove":
      return { ...review, text: undefined };
    default:
      console.warn(`Unknown action: ${type}`);
      return review;
  }
}

/**
 * A component for providing the contexts for review tools.
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
