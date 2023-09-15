/* @fileoverview A modal for opting-in/out of scribe features */
import * as React from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import {
  enableScribe,
  showScribeOption,
  useScribe,
  useShowScribeOption,
} from '../../service/scribe.service';

export const ScribeOption = () => {
  const show = useShowScribeOption();
  const scribe = useScribe();
  const handleChange = () => enableScribe(!scribe);
  return (
    <Modal show={show} onHide={() => showScribeOption(false)} scrollable>
      <Modal.Header closeButton>A.I. Scribe</Modal.Header>
      <Modal.Body>
        <p>
          The A.I. Scribe extension uses ChatGPT. If you use use any of the
          scribe tools then your text is sent to ChatGPT for analysis. There are
          two factors to consider before you use these extensions:
        </p>
        <ol>
          <li>Any submitted text is collected by OpenAI.</li>
          <li>ChatGPT text is (debatably) not copyrightable.</li>
        </ol>
        <p>
          See{' '}
          <a href="https://openai.com/policies/terms-of-use">
            OpenAI&apos;s Terms of Use
          </a>{' '}
          for more information.
        </p>
        <p>
          Use the toggle button below to enable or disable these extensions. If
          disabled, none of your text will be submitted to ChatGPT.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Form className="mx-auto">
          <Form.Check
            onChange={handleChange}
            type="checkbox"
            checked={scribe}
            label={'Enable A.I. Scribe and ChatGPT'}
          ></Form.Check>
        </Form>
        <Button onClick={() => showScribeOption(false)} color="secondary">
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
