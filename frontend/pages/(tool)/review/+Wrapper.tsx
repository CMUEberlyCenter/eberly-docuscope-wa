import type { FC, ReactNode } from "react";
import { ReviewProvider } from "../../../src/app/components/Review/ReviewContext";

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return <ReviewProvider>{children}</ReviewProvider>;
};
export default Wrapper;
