import { ChangeEvent, FC, useState } from "react";
import { Button, Form, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { isWritingTask, WritingTask } from "../../../lib/WritingTask";
import { useWritingTasks } from "../../service/writing-task.service";
import { Loading } from "../Loading/Loading";
import { WritingTaskInfo } from "../WritingTaskInfo/WritingTaskInfo";

export const DeepLink: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useWritingTasks();
  const [selected, setSelected] = useState<WritingTask | null>(null);
  const [custom, setCustom] = useState<WritingTask | null>(null);
  const [valid, setValid] = useState(true); // Uploaded file validity

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      try {
        const content = await files[0].text();
        const json = JSON.parse(content);
        if (isWritingTask(json)) {
          setValid(true);
          setCustom(json);
          setSelected(json);
        } else {
          setValid(false);
        }
      } catch (err) {
        // expecting JSON parser error.
        // TODO provide error message to invalid text.
        setValid(false);
        console.error(err);
      }
    }
  };

  // const onSubmit = useCallback(async () => {
  //   if (!selected) return;
  //   try {
  //     const resp = await fetch('/deeplink', {
  //       method: 'POST',
  //       body: JSON.stringify(selected)
  //     });
  //     if (!resp.ok) {
  //       throw new Error(await resp.json());
  //     }
  //     // TODO post data for deep link
  //     // writing task
  //     // TODO future: other assignment restrictions on available tools.
  //   } catch (err) {
  //     console.error(err);
  //   }
  // }, [selected]);

  return (
    <main className="h-100 w-100 pt-2">
      {isLoading ? (
        <Loading />
      ) : (
        <div className="d-flex flex-column h-100 w-100 gap-3">
          {/* <header><h4>{t("deeplink")}</h4></header> */}
          <div
            className="d-flex flex-row flex-grow-1 align-items-stretch gap-3 w-100"
            style={{ minHeight: 0 }}
          >
            <ListGroup className="overflow-auto w-100">
              {data?.map((task) => (
                <ListGroup.Item
                  key={task.info.name}
                  active={selected === task}
                  action
                  onClick={() => setSelected(task)}
                >
                  {task.info.name}
                </ListGroup.Item>
              ))}
              {custom && (
                <ListGroup.Item
                  key="custom"
                  active={selected === custom}
                  action
                  onClick={() => setSelected(custom)}
                >
                  {custom?.info.name}
                </ListGroup.Item>
              )}
              <ListGroup.Item
                key="null"
                action
                variant="warning"
                active={!selected}
                onClick={() => setSelected(null)}
              >
                {t("select_task.null")}
              </ListGroup.Item>
            </ListGroup>
            <div className="w-100 overflow-auto">
              <WritingTaskInfo task={selected} />
            </div>
          </div>
          <footer className="d-flex justify-content-between">
            <Form.Group>
              <Form.Control
                type="file"
                onChange={onFileChange}
                isInvalid={!valid}
              />
              <Form.Control.Feedback type="invalid">
                {t("select_task.invalid_upload")}
              </Form.Control.Feedback>
            </Form.Group>
            <Form noValidate method="post">
              <input
                type="hidden"
                name="file"
                value={JSON.stringify(selected)}
                className="d-none"
                readOnly={true}
              />
              <Button variant="dark" type="submit">
                {t("select")}
              </Button>
            </Form>
          </footer>
        </div>
      )}
    </main>
  );
};
