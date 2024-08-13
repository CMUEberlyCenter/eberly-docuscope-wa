import { ChangeEvent, FC, useState } from "react";
import { Button, Container, Form, ListGroup, Spinner, Stack } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { isWritingTask, WritingTask } from "../../../lib/WritingTask";
import { useWritingTasks } from "../../service/writing-task.service";
import { WritingTaskInfo } from "../WritingTaskInfo/WritingTaskInfo";

export const DeepLink: FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useWritingTasks();
  const [selected, setSelected] = useState<WritingTask | null>(null)
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
    <Container className="overflow-auto">
      {isLoading ? (
        <Spinner></Spinner>
      ) : (<>
        <Stack direction="horizontal" gap={3}>
          <ListGroup>
            {data?.map(task => (
              <ListGroup.Item key={task.info.name}
                active={selected === task}
                action
                onClick={() => setSelected(task)}>
                {task.info.name}
              </ListGroup.Item>
            )
            )}
            {custom && (
              <ListGroup.Item key="custom"
                action
                active={selected === custom}
                onClick={() => setSelected(custom)}
              >
                {custom.info.name}
              </ListGroup.Item>
            )}
            <ListGroup.Item key="null"
              action
              variant="warning"
              onClick={() => setSelected(null)}
            >
              {t("select_task.null")}
            </ListGroup.Item>
          </ListGroup>
          <WritingTaskInfo task={selected} className="w-50 h-100" />
        </Stack>
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
          <input type="hidden" name="file" value={JSON.stringify(selected)} className="d-none" readOnly={true}/>
          <Button variant="dark" type="submit">
            {t("select")}
          </Button>
        </Form>
      </>
      )}
    </Container>
  )
}