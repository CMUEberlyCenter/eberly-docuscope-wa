import { FC } from "react";
import { Review } from "../../../src/app/components/Review/Review";
import { SplitLayout } from "../../../layouts/SplitLayout";
import { UserTextView } from "../../../src/app/components/UserTextView/UserTextView";

export const Page: FC = () => {
  return <SplitLayout>
    <UserTextView className="my-1"/>
    <Review/>
  </SplitLayout>;
};
