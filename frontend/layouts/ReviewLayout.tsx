import { FC, ReactNode } from "react";
import { Translation } from "react-i18next";
import { Legal } from "../components/Legal/Legal";
import { StageHeader } from "../components/StageHeader/StageHeader";
import { UserTextView } from "../components/UserTextView/UserTextView";
import { SplitLayout } from "./SplitLayout";

export const ReviewLayout: FC<{ children: ReactNode }> = ({ children }) => (
  <SplitLayout>
    <UserTextView className="my-1" />
    <aside className="my-1 border rounded bg-light d-flex flex-column">
      <Translation ns={"review"}>
        {(t) => <StageHeader title={t("title")} />}
      </Translation>
      {children}
      <Legal />
    </aside>
  </SplitLayout>
);
