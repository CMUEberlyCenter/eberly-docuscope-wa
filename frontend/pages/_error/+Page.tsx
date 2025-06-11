import type { FC } from "react";
import { usePageContext } from "vike-react/usePageContext";

declare global {
  namespace Vike {
    interface PageContext {
      abortReason?: string | { notAdmin?: true };
      abortStatusCode?: number;
    }
  }
}
const Page: FC = () => {
  const pageContext = usePageContext();
  const { abortReason, abortStatusCode } = pageContext;
  let msg = "An unexpected error occurred.";
  if (typeof abortReason === "object" && abortReason?.notAdmin) {
    msg =
      "You are not an adimistrator and thus do not have permission to access this page.";
  } else if (typeof abortReason === "string") {
    msg = abortReason;
  } else if (abortStatusCode === 403) {
    msg = "You do not have permission to access this page.";
  } else if (abortStatusCode === 404) {
    msg = "The page you are looking for does not exist.";
  } else if (abortStatusCode === 500) {
    msg = "An internal server error occurred. Please try again later.";
  } else if (abortStatusCode === 503) {
    msg = "The service is currently unavailable. Please try again later.";
  } else {
    msg = pageContext.is404
      ? "The page you are looking for does not exist."
      : "An unexpected error occurred. Please try again later.";
  }
  return (
    <div className="alert alert-danger m-5">
      <p>Something went wrong on our end. Please try again later.</p>
      <p>Error details: {msg}</p>
      <p>
        If this error persists, please contact support with the above error
        details.
      </p>
    </div>
  );
};
export default Page;
