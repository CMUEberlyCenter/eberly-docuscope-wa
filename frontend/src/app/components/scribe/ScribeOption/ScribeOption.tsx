/* @fileoverview A modal for opting-in/out of scribe features */
import { Button, Form, Modal } from "react-bootstrap";
import {
  downloadHistory,
  enableScribe,
  hideScribeOption,
  useScribe,
  useShowScribeOption,
} from "../../../service/scribe.service";

// export const ScribeOption = ({show, onHide}: {show: boolean, onHide: () => void}) => {
export const ScribeOption = () => {
  const scribe = useScribe();
  const show = useShowScribeOption();
  const onHide = () => hideScribeOption();
  const handleChange = () => enableScribe(!scribe);

  return (
    <Modal show={show} onHide={onHide} scrollable>
      <Modal.Header closeButton>myScribe</Modal.Header>
      <Modal.Body>
        <p>
          Some of the tools included in myScribe use the OpenAI API to analyze
          your text. If you utilize any of these tools, your text will be sent
          to OpenAI for analysis. However, your text will not be used to train
          OpenAI models or enhance OpenAI&apos;s service offerings.
        </p>
        <p>
          You should also consider that texts generated using myScribe is
          (debatably) not copyrightable.
        </p>
        <p>
          See{" "}
          <a href="https://openai.com/policies/business-terms">
            OpenAI&apos;s Terms of Use
          </a>{" "}
          and <a href="https://openai.com/security">Security & Privacy</a> for
          more information.
        </p>
        <p>
          Use the toggle button below to enable or disable these tools that use
          OpenAI API. If disabled, none of your text will be submitted to
          OpenAI.
        </p>
        {/* <p>
          The myScribe extension uses ChatGPT. If you use use any of the scribe
          tools then your text is sent to ChatGPT for analysis. There are two
          factors to consider before you use these extensions:
        </p>
        <ol>
          <li>Any submitted text is collected by OpenAI.</li>
          <li>ChatGPT text is (debatably) not copyrightable.</li>
        </ol>
        <p>
          See{" "}
          <a href="https://openai.com/policies/terms-of-use">
            OpenAI&apos;s Terms of Use
          </a>{" "}
          for more information.
        </p>
        <p>
          Use the toggle button below to enable or disable these extensions. If
          disabled, none of your text will be submitted to ChatGPT.
        </p> */}
        <p>
          A log of interactions with this extension is stored in your
          browser&apos;s session cache. This information is not collected by
          this system and will be automatically deleted if you close this
          application and the browser it runs in. Instructors might ask for this
          information and it is available from this link:
          <Button variant="link" onClick={downloadHistory}>
            Export History
          </Button>
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Form className="mx-auto">
          <Form.Check
            onChange={handleChange}
            type="checkbox"
            checked={scribe}
            label={"Enable myScribe"}
          ></Form.Check>
        </Form>
        <Button onClick={onHide} color="secondary">
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
