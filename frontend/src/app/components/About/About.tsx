import { FC, HTMLProps, useState } from "react";
import { ListGroup, Modal, ModalProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useWritingTask } from "../../service/writing-task.service";
import { Logo } from "../Logo/Logo";

// type PromptInfo = { saved_at: string };
// async function fetchTemplateInfo() {
//   const response = await fetch("/api/v2/scribe/templates/info");
//   if (!response.ok) {
//     console.error("Failed to fetch template info.", response);
//     return null;
//   }
//   return response.json() as Promise<PromptInfo>;
// }

// const templatesInfo = fetchTemplateInfo();

export const AboutModal: FC<ModalProps> = (props) => {
  const { t } = useTranslation();
  const version = __APP_VERSION__;
  const build_date = new Date(__BUILD_DATE__);
  // const template_info = use(templatesInfo);
  const task = useWritingTask();

  return (
    <Modal {...props}>
      <Modal.Header closeButton className="py-1">
        <Modal.Title>
          About <Logo />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <span></span>
        <dl>
          <dt>{t("about.overview")}</dt>
          <dd>
            <a
              href="https://www.cmu.edu/dietrich/english/research-and-publications/myprose.html"
              target="_blank"
              rel="noreferrer noopener"
            >
              Future of Writing
            </a>
          </dd>
          <dt>{t("about.build")}</dt>
          <dd>
            {t("about.version", { version, date: build_date.toLocaleString() })}
          </dd>
          {/* <dt>{t("about.template")}</dt>
          <dd>
            <Suspense fallback={<LoadingSmall />}>
              {template_info
                ? t("about.templates", {
                    date: new Date(template_info.saved_at).toLocaleString(),
                  })
                : null}
            </Suspense>
          </dd> */}
          {task && (
            <>
              <dt>{t("about.task")}</dt>
              <dd>
                <ListGroup>
                  <ListGroup.Item>
                    {t("about.task_name", { name: task.info.name })}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    {t("select_task.version", {
                      version: task?.info.version ?? "-",
                    })}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    {t("select_task.copyright", {
                      copyright: task?.info.copyright ?? "-",
                    })}
                  </ListGroup.Item>
                </ListGroup>
              </dd>
            </>
          )}
          <dt>Acknowledgements:</dt>
          <dd>
            This project was partially funded by the A.W. Mellon Foundation,
            Carnegie Mellon’s Simon Initiative Seed Grant and Berkman Faculty
            Development Fund.
          </dd>
        </dl>
        <p>
          <a href="https://cmu.edu/" target="_blank" rel="noreferrer noopener">
            Carnegie Mellon University
          </a>
        </p>
        <p>
          <a
            href="https://www.cmu.edu/simon/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Simon Initiative
          </a>
        </p>
      </Modal.Body>
    </Modal>
  );
};

type AnchorProps = HTMLProps<HTMLAnchorElement>;
export const About: FC<AnchorProps> = () => {
  const [show, setShow] = useState(false);
  const onHide = () => setShow(false);
  const toggle = () => setShow(!show);
  return (
    <>
      <a
        style={{ fontSize: "small" }}
        className="btn btn-link py-0 m-0 px-1"
        onClick={toggle}
      >
        About
      </a>
      <AboutModal show={show} onHide={onHide} />
    </>
  );
};
