import React from "react";
import { ListGroup } from "react-bootstrap";
import { createRoot } from "react-dom/client";
import "./index.scss";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <React.StrictMode>
      <h1>TBD</h1>
      {/* <!-- TODO limit tool availability based on writing task/settings --> */}
      <ListGroup>
        <ListGroup.Item>Sentence Density Chart</ListGroup.Item>
        <ListGroup.Item>
          Logical Progression Issues
          {/* global-coherence */}
        </ListGroup.Item>
        <ListGroup.Item>List of Key Ideas</ListGroup.Item>
        <ListGroup.Item>Lines of Arguments</ListGroup.Item>
        <ListGroup.Item>Reader Expectations</ListGroup.Item>
        <ListGroup.Item>
          Organization (Term Matrix)
          {/* Coherence */}
        </ListGroup.Item>
      </ListGroup>
    </React.StrictMode>
  );
}
