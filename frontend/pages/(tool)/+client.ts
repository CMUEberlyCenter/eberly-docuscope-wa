import { PageContextClient } from "vike/types";
import { onGrade } from "./client.telefunc";

export const client = (pageContext: PageContextClient<{ isLTI: boolean }>) => {
  if (pageContext.data.isLTI) {
    // Grade 0 on app load, grade handles initialization and non-clobbering.
    onGrade(0);
  }
}
