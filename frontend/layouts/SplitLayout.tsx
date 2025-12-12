import { FC, ReactNode } from "react";
import Split from "react-split";

export const SplitLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Split
      className="container-fluid vh-100 w-100 d-flex flex-row review align-items-stretch"
      sizes={[60, 40]}
      minSize={[400, 320]}
      expandToMin={true}
    >
      {children}
    </Split>
  );
};
