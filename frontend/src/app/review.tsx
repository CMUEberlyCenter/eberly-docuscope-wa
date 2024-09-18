import { StrictMode, Suspense } from "react";
import { Spinner } from "react-bootstrap";
import { createRoot } from "react-dom/client";
import { Review } from "./components/Review/Review";
import "./i18n";
import "./index.scss";
import { ErrorBoundary } from "react-error-boundary";
import { ReviewError } from "./components/Review/ReviewError";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
console.log(
  `Welcome to myProse Review Version: ${__APP_VERSION__} built on ${new Date(__BUILD_DATE__).toLocaleString()}`
);

if (content) {
  createRoot(content).render(
    <StrictMode>
      <ErrorBoundary FallbackComponent={ReviewError}>
        <Suspense
          fallback={
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          }
        >
          <Review />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>
  );
}
