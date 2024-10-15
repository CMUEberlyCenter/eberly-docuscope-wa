import React from "react";
import { createRoot } from "react-dom/client";
import { GenerateLink } from "./components/GenerateLink/GenerateLink";
import "./i18n";
import "./index.scss";
// import "./index.css";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <React.StrictMode>
      <GenerateLink />
    </React.StrictMode>
  );
}
