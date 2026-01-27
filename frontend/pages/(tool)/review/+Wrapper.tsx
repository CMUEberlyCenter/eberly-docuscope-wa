import type { FC, ReactNode } from "react";
import { ReviewProvider } from "../../../components/ReviewContext/ReviewContext";

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return <ReviewProvider>{children}</ReviewProvider>;
};
export default Wrapper;
