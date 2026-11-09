import { createContext, Dispatch, FC, ReactNode, use, useReducer } from "react";

type UserContext = {
  username?: string;
  email?: string;
  name?: string;
};

const UserContext = createContext<[UserContext, Dispatch<UserContext>]>([
  {},
  () => {},
]);

/** Hook to access the current user context and its setter function. */
export const useUserContext = () => use(UserContext);

/** Context provider component for the user context. */
export const UserProvider: FC<{
  children: ReactNode;
  initial?: UserContext;
}> = ({ children, initial }) => {
  const [user, setUser] = useReducer(
    (state: UserContext, newState: UserContext) => ({ ...state, ...newState }),
    {
      username: undefined,
      email: undefined,
      name: undefined,
      ...initial,
    }
  );
  return <UserContext value={[user, setUser]}>{children}</UserContext>;
};
