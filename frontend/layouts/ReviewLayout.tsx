import { UserTextView } from "#components/UserTextView/UserTextView";
import { FC, ReactNode } from "react";
import { Translation } from "react-i18next";
import { SplitLayout } from "./SplitLayout";
import { ToolLayout } from "./ToolLayout";

export const ReviewLayout: FC<{ children: ReactNode; user?: ReactNode }> = ({
  children,
  user,
}) => (
  <SplitLayout>
    <UserTextView className="my-1" />
    <Translation ns={"review"}>
      {(t) => (
        <ToolLayout stage={t("title")} user={user}>
          {children}
        </ToolLayout>
      )}
    </Translation>
  </SplitLayout>
);
