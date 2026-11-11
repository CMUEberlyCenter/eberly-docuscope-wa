/* @overview: This is the review tools page. The user reviews a structured writing task with feedback from LLM's. */
import { ExpectationFetchProvider } from "#components/Review/Expectations.tsx";
import { Review } from "#components/Review/Review";
import { type FC } from "react";
import { onExpectation } from "./Page.telefunc";

const Page: FC = () => (
  <ExpectationFetchProvider fetchFunction={onExpectation}>
    <Review />
  </ExpectationFetchProvider>
);
export default Page;
