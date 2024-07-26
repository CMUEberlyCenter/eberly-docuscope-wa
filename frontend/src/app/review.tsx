import { StrictMode, Suspense } from "react";
import { Spinner } from "react-bootstrap";
import { createRoot } from "react-dom/client";
import { Review } from "./components/Review/Review";
import "./i18n";
import "./index.scss";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <StrictMode>
      <Suspense
        fallback={
          <Spinner animation="border" role="status" variant="dark">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        }
      >
        <Review />
      </Suspense>
    </StrictMode>
  );
}
