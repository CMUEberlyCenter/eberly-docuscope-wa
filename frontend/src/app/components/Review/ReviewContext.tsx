import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";

export const ReviewContext = createContext<ReviewContextState | null>(null);
export const ReviewDispatchContext = createContext<Dispatch<ReviewAction>>(
  () => undefined
);

type ReviewContextState = {
  sentences: string[][];
};
const initialReviewContext: ReviewContextState = {
  sentences: [],
};

type ReviewAction =
  | {
      type: "set";
      sentences: string[][];
    }
  | {
      type: "unset";
      sentences?: undefined;
    };

/** Dispatch function for modifying the review state. */
function reviewReducer(
  review: ReviewContextState,
  { type, sentences }: ReviewAction
) {
  switch (type) {
    case "set":
      return { sentences };
    case "unset":
      return { sentences: [] };
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
  const dispatch = useContext(ReviewDispatchContext);
  // unset sentences so that any previous highlighting is cleared.
  useEffect(() => {
    dispatch({ type: "unset" });
    return () => dispatch({ type: "unset" });
  }, []);
  return children;
};
