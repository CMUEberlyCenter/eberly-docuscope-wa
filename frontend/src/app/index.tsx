import { StrictMode, Suspense } from "react";
import { Spinner } from "react-bootstrap";
import { createRoot } from "react-dom/client";
import CustomEditor from "./components/Editor/CustomEditor";
import "./i18n";
import "./index.scss";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
console.log(
  `Welcome to myProse Version: ${__APP_VERSION__} built on ${new Date(__BUILD_DATE__).toLocaleString()}`
);

if (content) {
  createRoot(content).render(
    <StrictMode>
      {/* TODO Use placeholder instead of spinner for loading */}
      <Suspense
        fallback={
          <Spinner animation="border" role="status" variant="dark">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        }
      >
        <CustomEditor />
      </Suspense>
    </StrictMode>
  );
}
