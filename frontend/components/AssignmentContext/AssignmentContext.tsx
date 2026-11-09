import { createContext, Dispatch, FC, ReactNode, use, useReducer } from "react";

type AssignmentContext = {
  activityTitle?: string;
};

const AssignmentContext = createContext<
  [AssignmentContext, Dispatch<AssignmentContext>]
>([{}, () => {}]);

/** Hook to access the current assignment context and its setter function. */
export const useAssignmentContext = () => use(AssignmentContext);

/** Context provider component for the assignment context. */
export const AssignmentProvider: FC<{
  children: ReactNode;
  initial?: AssignmentContext;
}> = ({ children, initial }) => {
  const [assignment, setAssignment] = useReducer(
    (state: AssignmentContext, newState: AssignmentContext) => ({
      ...state,
      ...newState,
    }),
    {
      activityTitle: undefined,
      ...initial,
    }
  );
  return (
    <AssignmentContext value={[assignment, setAssignment]}>
      {children}
    </AssignmentContext>
  );
};
