import { ReviewProvider } from "#components/ReviewContext/ReviewContext";
import type { FC, ReactNode } from "react";

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return <ReviewProvider>{children}</ReviewProvider>;
};
export default Wrapper;
