import classnames from "classnames";
import { FC, HTMLProps, useCallback, useEffect, useId, useState } from "react";
import { Button } from "react-bootstrap";
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
            {/* TODO?: add some indicator of sub-tree selection possibly only on non-expanded. */}
            <div className={classnames("d-flex")}>
              <Button
                size="sm"
                variant="none"
                className="expand-toggle"
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
              <div
                aria-selected={selected === rule}
                className={classnames(
                  "fw-bold",
                  "flex-grow-1",
                  select && !leafOnly ? "pointer" : "",
                  selected === rule ? "text-bg-dark" : ""
                )}
                onClick={() => onSelect(rule)}
              >
                {rule.name}
              </div>
            </div>
            <div className="expanded">
              <ul>
                {rule.children.map((cluster) => (
                  <li
                    key={cluster.name}
                    className={classnames(
                      "pointer",
                      selected === cluster ? "text-bg-dark" : ""
                    )}
                    aria-selected={selected === cluster}
                    onClick={() => onSelectLeaf(cluster)}
                  >
                    {cluster.name}
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
