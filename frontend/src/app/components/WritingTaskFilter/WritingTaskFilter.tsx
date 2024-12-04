import {
  Dispatch,
  FC,
  HTMLProps,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { keywordsByCategory } from "../../../lib/WritingTask";
import FilterIcon from "../../assets/icons/filter_icon.svg?react";
import { useWritingTasks } from "../../service/writing-task.service";

type WritingTaskFilterProps = {
  update?: Dispatch<SetStateAction<string[]>>;
} & HTMLProps<HTMLDivElement>;

export const WritingTaskFilter: FC<WritingTaskFilterProps> = ({
  update,
  ...props
}) => {
  const { t } = useTranslation();
  const { data } = useWritingTasks(); // isLoading should be handled higher up.

  const [keywords, setKeywords] = useState(keywordsByCategory(data ?? []));
  useEffect(() => {
    setKeywords(keywordsByCategory(data ?? []));
  }, [data]);

  const [category, setCategory] = useState("ALL");
  const [categoryKeywords, setCategoryKeywords] = useState<string[]>([]);
  useEffect(() => {
    setCategoryKeywords(keywords[category] ?? []);
    setActiveKeywords(category === "ALL" ? [] : (keywords[category] ?? []));
  }, [category, keywords]);

  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const indeterminateRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (indeterminateRef.current) {
      const active = new Set(activeKeywords);
      const keys = new Set(categoryKeywords);
      indeterminateRef.current.indeterminate =
        !active.isSupersetOf(keys) && active.intersection(keys).size > 0;
    }
  }, [activeKeywords, categoryKeywords]);
  useEffect(() => {
    update?.(activeKeywords);
  }, [activeKeywords, update]);

  return (
    <div {...props}>
      <div className="d-flex align-items-center gap-1 mb-2">
        <FilterIcon className="text-dark" />
        <Form.Select
          aria-label={t("select_task.select")}
          value={category}
          onChange={(evt) => setCategory(evt.target.value)}
        >
          {Object.entries(keywords).map(([key]) => (
            <option value={key} key={key}>
              {key === "ALL"
                ? t("select_task.all_category")
                : key.replace(/^\w+:\s*/, "")}
            </option>
          ))}
        </Form.Select>
      </div>
      <Form>
        <Form.Check
          ref={indeterminateRef}
          type="checkbox"
          label={t("select_task.select_all")}
          checked={new Set(activeKeywords).isSupersetOf(
            new Set(categoryKeywords)
          )}
          onChange={() =>
            setActiveKeywords(
              new Set(activeKeywords).isSupersetOf(new Set(categoryKeywords))
                ? []
                : categoryKeywords
            )
          }
        />
        <hr />
        {categoryKeywords.map((key, i) => (
          <Form.Check
            type="checkbox"
            label={key}
            key={`${key}-${i}`}
            checked={activeKeywords.includes(key)}
            onChange={() =>
              setActiveKeywords(
                activeKeywords.includes(key)
                  ? activeKeywords.filter((active) => active !== key)
                  : [...activeKeywords, key]
              )
            }
          />
        ))}
      </Form>
    </div>
  );
};
