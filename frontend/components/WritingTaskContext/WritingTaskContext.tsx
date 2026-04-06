import type { WritingTask } from "#/lib/WritingTask";
import {
  createContext,
  type Dispatch,
  type FC,
  type ReactNode,
  use,
  useReducer,
} from "react";

type WritingTaskContext = {
  /** Current Writing Task Description. */
  task?: WritingTask | null;
  /** Writing Task ID.  If set, that means the task is fixed. */
  taskId?: string | null;
  /** Writing tasks available for selection, only used if taskId is not set. */
  tasks?: WritingTask[];
  /** The username of the current user, only available in an LTI context. */
  username?: string;
  /** The title of the LTI activity inside the LMS's LTI context. */
  ltiActivityTitle?: string;
  /** If true, the task is being used in an LTI context. */
  isLTI?: boolean;
  /** If true, the user is an instructor in the LTI context. */
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
    (state: WritingTaskContext, newState: WritingTaskContext) => {
      const mergedState = { ...state, ...newState };
      if (mergedState.task?.info.id !== state.task?.info.id) {
        if (window.gtag) {
          window.gtag("event", "screen_view", {
            app_name: "myProse",
            screen_name: mergedState.task?.info.id, // Use the task ID as the screen name for analytics.  FIXME: private task ID name conflicts
          });
        } else {
          console.warn(`gtag not available, cannot track writing task change`);
        }
      }
      return mergedState;
    },
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
    <WritingTaskContext value={task}>
      <WritingTaskDispatchContext value={setTask}>
        {children}
      </WritingTaskDispatchContext>
    </WritingTaskContext>
  );
};

/** Hook to access the current writing task. */
export const useWritingTask = () => use(WritingTaskContext);
/** Hook to get the function to set the current writing task. */
export const useSetWritingTask = () => use(WritingTaskDispatchContext);
