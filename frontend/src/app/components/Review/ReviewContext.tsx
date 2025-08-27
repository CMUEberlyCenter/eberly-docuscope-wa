import {
  createContext,
  type Dispatch,
  type FC,
  type ReactNode,
  use,
  useContext,
  useEffect,
  useReducer,
} from "react";

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
