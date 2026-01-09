/* @overview: This is the review tools page. The user reviews a structured writing task with feedback from LLM's. */
import { type FC } from "react";
import { SplitLayout } from "../../../layouts/SplitLayout";
import { Review } from "../../../components/Review/Review";
import { UserTextView } from "../../../components/UserTextView/UserTextView";

const Page: FC = () => {
  return (
    <SplitLayout>
      <UserTextView className="my-1" />
      <Review />
    </SplitLayout>
  );
};
export default Page;
