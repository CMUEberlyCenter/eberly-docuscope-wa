import {
  createContext,
  type Dispatch,
  type FC,
  type ReactNode,
  useContext,
  useReducer,
} from "react";
import type { WritingTask } from "../../src/lib/WritingTask";

type WritingTaskContext = {
  task?: WritingTask | null;
  taskId?: string | null;
  username?: string;
  ltiActivityTitle?: string;
  isLTI?: boolean;
  isInstructor?: boolean;
};
const WritingTaskContext = createContext<WritingTaskContext>({});
const WritingTaskDispatchContext = createContext<Dispatch<WritingTaskContext>>(
  () => {}
);

/**
 * Context provider component for the writing task context.
 * Access the writing task using `useWritingTask` and
 * the setter function using `useSetWritingTask`.
 */
export const WritingTaskProvider: FC<{
  children: ReactNode;
  initial?: WritingTaskContext;
}> = ({ children, initial }) => {
  const [task, setTask] = useReducer(
    (state: WritingTaskContext, newState: WritingTaskContext) => ({
      ...state,
      ...newState,
    }),
    {
      task: undefined,
      taskId: undefined,
      username: undefined,
      ltiActivityTitle: undefined,
      isLTI: false,
      isInstructor: false,
      ...initial,
    }
  );
  return (
    <WritingTaskContext.Provider value={task}>
      <WritingTaskDispatchContext.Provider value={setTask}>
        {children}
      </WritingTaskDispatchContext.Provider>
    </WritingTaskContext.Provider>
  );
};

/** Hook to access the current writing task. */
export const useWritingTask = () => useContext(WritingTaskContext);
/** Hook to get the function to set the current writing task. */
export const useSetWritingTask = () => useContext(WritingTaskDispatchContext);
