import { FC, HTMLProps, useState } from "react";
import { ListGroup, Modal, ModalProps } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
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
          {t("about.title")} <Logo />
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
              {t("about.project_link_title")}
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
          <dt>{t("about.acknowledgements.title")}</dt>
          <dd>{t("about.acknowledgements.content")}</dd>
        </dl>
        <p>
          <a href="https://cmu.edu/" target="_blank" rel="noreferrer noopener">
            {t("about.cmu")}
          </a>
        </p>
        <p>
          <a
            href="https://www.cmu.edu/simon/"
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("about.simon")}
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
    <Translation>
      {(t) => (
        <>
          <a
            style={{ fontSize: "small" }}
            className="btn btn-link py-0 m-0 px-1"
            onClick={toggle}
          >
            {t("about.title")}
          </a>
          <AboutModal show={show} onHide={onHide} />
        </>
      )}
    </Translation>
  );
};
