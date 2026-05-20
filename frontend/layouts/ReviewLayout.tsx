import { UserTextView } from "#components/UserTextView/UserTextView";
import { FC, ReactNode } from "react";
import { Translation } from "react-i18next";
import { SplitLayout } from "./SplitLayout";
import { ToolLayout } from "./ToolLayout";

export const ReviewLayout: FC<{ children: ReactNode }> = ({ children }) => (
  <SplitLayout>
    <UserTextView className="my-1" />
    <Translation ns={"review"}>
      {(t) => <ToolLayout stage={t("title")}>{children}</ToolLayout>}
    </Translation>
  </SplitLayout>
);
