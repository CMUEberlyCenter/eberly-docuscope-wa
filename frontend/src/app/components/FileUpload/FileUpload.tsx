import { type ChangeEvent, type FC, useState } from "react";
import { Button, Form, Modal, type ModalProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";

type FileUploadProps = ModalProps & {
  onFile?: (file: File) => void;
};
export const FileUpload: FC<FileUploadProps> = ({
  show,
  onHide,
  onFile,
  ...props
}) => {
  const { t } = useTranslation();
  const [valid, setValid] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setFile(null);
    const files = event.target.files;
    if (!files) return;
    if (files.length !== 1) {
      setValid(false);
      return;
    }
    setFile(files[0]);
  };
  return (
    <Modal show={show} onHide={onHide} {...props}>
      <Modal.Header closeButton>{t("editor.upload.title")}</Modal.Header>
      <Modal.Body>
        <Form noValidate>
          <Form.Group>
            <Form.Control
              type="file"
              isInvalid={!valid}
              onChange={onFileChange}
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <Form.Control.Feedback type="invalid">
              {t("editor.upload.error.fail")}
            </Form.Control.Feedback>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={() => {
            if (file) {
              onFile?.(file);
            }
            onHide?.();
          }}
        >
          {t("editor.upload.open")}
        </Button>
        <Button variant="secondary" onClick={onHide}>
          {t("cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
