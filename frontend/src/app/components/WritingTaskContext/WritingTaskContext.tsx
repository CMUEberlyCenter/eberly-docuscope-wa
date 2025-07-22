import {
  createContext,
  type Dispatch,
  type FC,
  type ReactNode,
  useContext,
  useReducer,
} from "react";
import type { WritingTask } from "../../../lib/WritingTask";

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

export const WritingTaskProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
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

export const useWritingTask = () => useContext(WritingTaskContext);
export const useSetWritingTask = () => useContext(WritingTaskDispatchContext);
