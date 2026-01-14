import classNames from "classnames";
import { type FC, type HTMLProps, useState } from "react";
import { ListGroup, Modal, type ModalProps } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import { Logo } from "../Logo/Logo";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";

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

/**
 * AboutModal component for displaying information about the application.
 * @param props Bootstrap Modal properties.
 * @returns
 */
const AboutModal: FC<ModalProps> = (props) => {
  const { t } = useTranslation();
  const version = __APP_VERSION__;
  const build_date = new Date(__BUILD_DATE__);
  // const template_info = use(templatesInfo);
  const { task } = useWritingTask();

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
/** About component that triggers the About modal. */
export const About: FC<AnchorProps> = ({ className, style, ...props }) => {
  const [show, setShow] = useState(false);
  const onHide = () => setShow(false);
  const toggle = () => setShow(!show);
  return (
    <Translation>
      {(t) => (
        <>
          <a
            {...props}
            style={{ ...style, fontSize: "small" }}
            className={classNames(className, "btn btn-link py-0 m-0 px-1")}
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
