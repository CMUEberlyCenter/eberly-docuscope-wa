import { Subscribe } from "@react-rxjs/core";
import * as React from "react";
import { Modal } from "react-bootstrap";
import { VERSION } from "../../service/application.service";
import { showAbout, useShowAbout } from "../../service/help.service";
import { rule$, useRules } from "../../service/rules.service";
import { ScribeAvailable } from "../../service/scribe.service";

export const About = () => {
  const show = useShowAbout();
  const rules = useRules();

  return (
    <Modal show={show} onHide={() => showAbout(false)} scrollable>
      <Modal.Header closeButton>About DocuScope Write &amp; Audit</Modal.Header>
      <Modal.Body>
        <p>
          {ScribeAvailable ? (
            <>
              <a href="https://www.cmu.edu/corecompetencies/communication/resources-and-tools/docuscope/index.html">
                DocuScope Write & Audit
              </a>{" "}
              is an environment for structuring writing tasks through
              visualization. It includes panels for visualizing reader
              expectations and textual coherence. It has recently been updated
              to accommodate generative A.I. through a notes-to-prose feature.
            </>
          ) : (
            <>
              DocuScope is a text analysis environment with a suite of
              interactive visualization tools for corpus-based rhetorical
              analysis. The DocuScope Project began in 1998 as a result of
              collaboration between David Kaufer and Suguru Ishizaki at Carnegie
              Mellon University. David created what we call the generic
              (default) dictionary, consisting of over 40 million linguistic
              patterns of English classified into over 100 categories of
              rhetorical effects.
            </>
          )}
        </p>

        <hr />

        <h2>Application Information</h2>
        <ul>
          <li>Application version: {VERSION}</li>
          {/* <li>Build date: {new Date(BUILT_ON).toLocaleString()}</li> */}
        </ul>

        <hr />

        <h2>Expectations Details</h2>
        <Subscribe source$={rule$} fallback={<p>Loading...</p>}>
          <ul>
            <li>Name: {rules?.info.name ?? "unassigned"}</li>
            <li>Version: {rules?.info.version ?? "0.0.0"}</li>
            <li>Author: {rules?.info.author ?? "unassigned"}</li>
            <li>Copyright: {rules?.info.copyright ?? ""}</li>
            <li>Saved: {rules?.info.saved ?? "true"}</li>
          </ul>
        </Subscribe>
      </Modal.Body>
    </Modal>
  );
};
