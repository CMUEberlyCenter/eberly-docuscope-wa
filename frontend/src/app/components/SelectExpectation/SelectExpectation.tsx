import { FC, useCallback, useState } from "react";
import { Button, Modal, type ModalProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import type { Rule } from "../../../lib/WritingTask";
import { WritingTaskRulesTree } from "../WritingTaskRulesTree/WritingTaskRulesTree";

type SelectExpectationProps = ModalProps & {
  /** Callback to execute when the selection changes */
  select?: (rule: Rule) => void;
};
/** Modal dialog component for selecting an expectation. */
const SelectExpectation: FC<SelectExpectationProps> = ({
  onHide,
  select,
  ...props
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Rule | null>(null);
  // need only expectation selection
  const onSelect = useCallback(() => {
    if (select && selected) select(selected);
    if (onHide) onHide();
  }, [select, onHide, selected]);

  return (
    <Modal onHide={onHide} {...props} size="lg" backdrop="static">
      <Modal.Header closeButton className="bg-light">
        {t("expectation.title")}
      </Modal.Header>
      <Modal.Body>
        <WritingTaskRulesTree
          style={{ maxHeight: "70vh" }}
          includeTitle={true}
          select={setSelected}
          leafOnly={true}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onHide}>{t("cancel")}</Button>
        <Button variant="primary" onClick={onSelect} disabled={!selected}>
          {t("select")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default SelectExpectation;
