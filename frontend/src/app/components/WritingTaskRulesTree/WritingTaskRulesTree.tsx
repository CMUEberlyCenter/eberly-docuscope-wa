import classnames from "classnames";
import { FC, HTMLProps, useCallback, useEffect, useId, useState } from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Rule } from "../../../lib/WritingTask";
import { useWritingTask } from "../../service/writing-task.service";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";
import "./WritingTaskRulesTree.scss";

type RuleTreeProps = HTMLProps<HTMLDivElement> & {
  /** Callback for when rule selection changes. */
  select?: (rule: Rule | null) => void;
  /** If true, only allow selecting leaf nodes. */
  leafOnly?: boolean;
  /** If true, include the title of the outline. */
  includeTitle?: boolean;
};
/**
 * Component for displaying the currently outline with a sidebar for displaying
 * details about a selected rule or general information if nothing is selected.
 */
export const WritingTaskRulesTree: FC<RuleTreeProps> = ({
  includeTitle,
  select,
  leafOnly,
  className,
  ...props
}) => {
  const { t } = useTranslation();
  const writingTask = useWritingTask();
  const [selected, setSelected] = useState<Rule | null>(null);
  const onSelect = useCallback(
    (rule: Rule) => {
      if (!leafOnly) {
        setSelected(rule === selected ? null : rule);
      }
    },
    [leafOnly, selected]
  );
  const onSelectLeaf = useCallback(
    (rule: Rule) => setSelected(rule === selected ? null : rule),
    [selected]
  );
  useEffect(() => {
    if (select) {
      select(selected);
    }
  }, [select, selected]);
  const cn = classnames(
    className,
    "d-flex flex-row align-items-stretch gap-3 position-relative"
  );
  const id = useId();
  return (
    <div {...props} className={cn}>
      <div className="d-flex flex-column align-items-start writing-task-tree h-0 w-100 overflow-auto">
        {includeTitle && <WritingTaskTitle />}
        {writingTask?.rules.rules.map((rule, i) => (
          <div key={`${id}-${i}`} aria-expanded="true">
            <ButtonGroup aria-selected={selected === rule}>
              <Button
                size="sm"
                variant="none"
                active={selected === rule}
                className="expand-toggle py-0"
                onClick={(e) => {
                  const p = e.currentTarget.closest("[aria-expanded]");
                  p?.setAttribute(
                    "aria-expanded",
                    p.getAttribute("aria-expanded") === "true"
                      ? "false"
                      : "true"
                  );
                }}
              >
                <i className="fa-solid fa-caret-down flex-shrink-0"></i>
              </Button>
              {leafOnly || !rule.description ? (
                <div className="fw-bold flex-grow-1 outline-section text-nowrap">
                  {rule.name}
                </div>
              ) : (
                <Button
                  className="py-0 ps-1 text-start text-nowrap"
                  variant="none"
                  active={selected === rule}
                  onClick={() => onSelect(rule)}
                >
                  <span className="outline-section fw-bold">{rule.name}</span>
                </Button>
              )}
            </ButtonGroup>
            <div className="expanded">
              <ul>
                {rule.children.map((cluster) => (
                  <li
                    key={cluster.name}
                    aria-selected={selected === cluster}
                    className={classnames("hover")}
                  >
                    <Button
                      variant="none"
                      active={selected === cluster}
                      className="py-0 text-nowrap text-start"
                      onClick={() => {
                        onSelectLeaf(cluster);
                      }}
                    >
                      {cluster.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <div className="container-fluid rounded bg-light p-3 h-0 w-100 overflow-auto">
        {!selected && (
          <>
            <h5>
              {writingTask?.info.name}{" "}
              <span className="text-muted">{t("details.overview")}</span>
            </h5>
            <p>{writingTask?.rules.overview}</p>
          </>
        )}
        {selected && (
          <>
            <h6>{t("details.about")}</h6>
            <h5>{selected.name}</h5>
            <div dangerouslySetInnerHTML={{ __html: selected.description }} />
          </>
        )}
      </div>
    </div>
  );
};
