import { ListGroup } from "#components/ui/ListGroup.tsx";
import classNames from "classnames";
import { type FC, type HTMLProps, useId, useMemo, useState } from "react";
import { Modal, type ModalProps } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import { Logo } from "../Logo/Logo";
import { useWritingTask } from "../WritingTaskContext/WritingTaskContext";

/**
 * AboutModal component for displaying information about the application.
 * @example
 * ```tsx
 * <AboutModal show={true} onHide={() => {}} />
 * ```
 * @param props Bootstrap Modal properties.
 */
const AboutModal: FC<ModalProps> = (props) => {
  const { t } = useTranslation();
  const version = __APP_VERSION__;
  const build_date = useMemo(() => new Date(__BUILD_DATE__), []);
  const [{ task }] = useWritingTask();

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
/** About link button component that triggers the About modal. */
export const About: FC<AnchorProps> = ({ className, ...props }) => {
  const [show, setShow] = useState(false);
  const onHide = () => setShow(false);
  const toggle = () => setShow((prev) => !prev);
  const modalId = useId();
  return (
    <Translation>
      {(t) => (
        <div>
          <a
            role="button"
            aria-expanded={show}
            aria-controls={modalId}
            {...props}
            className={classNames(className, "tw:cursor-pointer")}
            onClick={toggle}
          >
            {t("about.title")}
          </a>
          <AboutModal id={modalId} show={show} onHide={onHide} />
        </div>
      )}
    </Translation>
  );
};
