import { faCheckDouble, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Dispatch,
  FC,
  HTMLProps,
  SetStateAction,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import {
  Button,
  ButtonGroup,
  FloatingLabel,
  Form,
  InputGroup,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import {
  extractKeywords,
  hasKeywords,
  WritingTask,
} from "../../../lib/WritingTask";
import FilterIcon from "../../assets/icons/filter_icon.svg?react";
import { useWritingTasks } from "../../service/writing-task.service";

type WritingTaskFilterProps = {
  update?: Dispatch<SetStateAction<WritingTask[]>>;
} & HTMLProps<HTMLDivElement>;

export const WritingTaskFilter: FC<WritingTaskFilterProps> = ({
  update,
  ...props
}) => {
  const { t } = useTranslation();
  const { data, isLoading } = useWritingTasks(); // isLoading should be handled higher up.

  const [keywords, setKeywords] = useState(extractKeywords(data ?? []));
  useEffect(() => {
    setKeywords(extractKeywords(data ?? []));
  }, [data]);

  const [search, setSearch] = useState<string>("");
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);

  useEffect(() => {
    const tasks =
      data
        ?.filter(
          (task) =>
            activeKeywords.length === 0 || hasKeywords(task, activeKeywords)
        )
        .filter((task) => {
          if (!search) return true;
          const term = search.toLowerCase();
          if (
            task.info.keywords?.some((key) => key.toLowerCase().includes(term))
          )
            return true;
          if (task.info.name.includes(term)) return true;
          if (task.rules.name.includes(term)) return true;
          if (task.rules.overview.includes(term)) return true;
          return false;
        }) ?? [];
    update?.(tasks);
  }, [data, activeKeywords, search, update]);

  const selectAll = useCallback(
    (prefix: string) => {
      prefix = `${prefix}:`;
      const keys = keywords.filter((key) => key.startsWith(prefix));
      const other = activeKeywords.filter((key) => !key.startsWith(prefix));
      setActiveKeywords([...other, ...keys]);
    },
    [activeKeywords, keywords]
  );
  const selectNone = useCallback(
    (prefix: string) => {
      prefix = `${prefix}:`;
      setActiveKeywords(
        activeKeywords.filter((key) => !key.startsWith(prefix))
      );
    },
    [activeKeywords, keywords]
  );
  const toggle = useCallback(
    (key: string) =>
      setActiveKeywords(
        activeKeywords.includes(key)
          ? activeKeywords.filter((active) => active !== key)
          : [...activeKeywords, key]
      ),
    [activeKeywords]
  );

  const controlId = useId();

  return (
    <div {...props}>
      <header>
        <h5>
          <FilterIcon className="text-dark" />
          {t("select_task.filters")}
        </h5>
      </header>
      <InputGroup>
        <FloatingLabel label={t("select_task.label")} controlId={controlId}>
          <Form.Control
            placeholder={t("select_task.placeholder")}
            onChange={(evt) => setSearch(evt.target.value)}
            disabled={isLoading}
            value={search}
          />
        </FloatingLabel>
        <Button variant="secondary" onClick={() => setSearch("")}>
          <FontAwesomeIcon icon={faX} />
        </Button>
      </InputGroup>
      <section className="my-3">
        <header className="d-flex gap-3">
          <h6>{t("select_task.context")}</h6>
          <ButtonGroup>
            <Button variant="secondary" onClick={() => selectAll("context")}>
              <FontAwesomeIcon icon={faCheckDouble} />
            </Button>
            <Button variant="secondary" onClick={() => selectNone("context")}>
              <FontAwesomeIcon icon={faX} />
            </Button>
          </ButtonGroup>
        </header>
        <Form>
          {keywords
            .filter(
              (key) =>
                key.startsWith("context:") &&
                key.substring("context:".length).length > 0
            )
            .map((key, i) => (
              <Form.Check
                id={`context-checkbox-${i}`}
                type="checkbox"
                label={key.substring("context:".length)}
                data-keyword={key}
                key={`${key}-${i}`}
                checked={activeKeywords.includes(key)}
                onChange={() => toggle(key)}
              />
            ))}
        </Form>
      </section>
      <section>
        <header className="d-flex gap-3">
          <h6>{t("select_task.mode")}</h6>
          <ButtonGroup>
            <Button variant="secondary" onClick={() => selectAll("mode")}>
              <FontAwesomeIcon icon={faCheckDouble} />
            </Button>
            <Button variant="secondary" onClick={() => selectNone("mode")}>
              <FontAwesomeIcon icon={faX} />
            </Button>
          </ButtonGroup>
        </header>
        <Form>
          {keywords
            .filter(
              (key) =>
                key.startsWith("mode:") &&
                key.substring("mode:".length).length > 0
            )
            .map((key, i) => (
              <Form.Check
                id={`mode-checkbox-${i}`}
                type="checkbox"
                label={key.substring("mode:".length)}
                data-keyword={key}
                key={`${key}-${i}`}
                checked={activeKeywords.includes(key)}
                onChange={() => toggle(key)}
              />
            ))}
        </Form>
      </section>
    </div>
  );
};
