import React from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <React.StrictMode>
      <h1>TBD</h1>
    </React.StrictMode>
  );
}
