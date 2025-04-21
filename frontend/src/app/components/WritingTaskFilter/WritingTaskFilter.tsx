import { faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Dispatch,
  FC,
  HTMLProps,
  SetStateAction,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button, FloatingLabel, Form, InputGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import {
  extractKeywords,
  groupByCategory,
  hasKeywords,
  WritingTask,
} from "../../../lib/WritingTask";
import FilterIcon from "../../assets/icons/filter_icon.svg?react";
import { useWritingTasks } from "../../service/writing-task.service";

const sep = ":";
const hasPrefix = (prefix: string, key: string) =>
  key.startsWith(`${prefix}${sep}`) &&
  key.substring(prefix.length + sep.length).length > 0;

type CategoryKeywordsProps = {
  prefix: string;
  title: string;
  keywords: string[];
  activeKeywords: string[];
  toggle: (key: string) => void;
  selectNone: () => void;
  selectAll: () => void;
};

const CategoryKeywords: FC<CategoryKeywordsProps> = ({
  prefix,
  title,
  keywords,
  activeKeywords,
  toggle,
  selectAll,
  selectNone,
}) => {
  const hasCategoryPrefix = useCallback(
    (key: string) => hasPrefix(prefix, key),
    [prefix]
  );
  const [keys, setKeys] = useState(new Set(keywords.filter(hasCategoryPrefix)));
  useEffect(() => {
    setKeys(new Set(keywords.filter(hasCategoryPrefix)));
  }, [keywords, hasCategoryPrefix]);
  const [active, setActive] = useState(
    new Set(activeKeywords.filter(hasCategoryPrefix))
  );
  useEffect(() => {
    setActive(new Set(activeKeywords.filter(hasCategoryPrefix)));
  }, [activeKeywords, hasCategoryPrefix]);
  const [allSelected, setAllSelected] = useState(false);
  useEffect(() => {
    setAllSelected(keys.symmetricDifference(active).size === 0);
  }, [keys, active]);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = active.size > 0 && !allSelected;
    }
  }, [ref, active, allSelected]);
  const id = useId();

  return (
    <section className="my-3">
      <header>
        <Form.Check
          id={`${id}-${prefix}-checkbox-all`}
          type="checkbox"
          label={title}
          className="fs-6 fw-semibold"
          key={`context-all`}
          checked={allSelected}
          ref={ref}
          onChange={() => (allSelected ? selectNone() : selectAll())}
        />
      </header>
      <Form>
        {[...keys].map((key, i) => (
          <Form.Check
            id={`${id}=${prefix}-checkbox-${i}`}
            type="checkbox"
            label={key.substring(`${prefix}${sep}`.length)}
            className="ms-4"
            data-keyword={key}
            key={`${key}-${i}`}
            checked={activeKeywords.includes(key)}
            onChange={() => toggle(key)}
          />
        ))}
      </Form>
    </section>
  );
};

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
      {Object.keys(groupByCategory(keywords))
        .toSorted((a, b) =>
          t(`select_task.${a}`).localeCompare(t(`select_task.${b}`))
        )
        .map((prefix) => (
          <CategoryKeywords
            key={prefix}
            prefix={prefix}
            title={t(`select_task.${prefix}`)}
            keywords={keywords}
            activeKeywords={activeKeywords}
            toggle={toggle}
            selectAll={() => selectAll(prefix)}
            selectNone={() => selectNone(prefix)}
          />
        ))}
    </div>
  );
};
