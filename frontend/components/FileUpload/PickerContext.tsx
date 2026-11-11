import {
  DrivePicker,
  DrivePickerDocsView,
} from "@googleworkspace/drive-picker-react";
import { convertToHtml } from "mammoth";
import {
  createContext,
  use,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "vike-react/ClientOnly";
import { useFileImportErrors } from "./FileImportErrors";
import { useFilename, useFileText } from "./FileTextContext";
import { convertOptions } from "./convertOptions";
// import { HtmlGenerator, parse } from "latex.js";

const PickerContext = createContext<(show: boolean) => void>(() => undefined);
export const usePicker = () => use(PickerContext);

export const PickerProvider: FC<{
  children: ReactNode;
  clientId?: string;
  apiKey?: string;
  appId?: string;
}> = ({ children, clientId, apiKey, appId }) => {
  const { t } = useTranslation();
  const filesApiRef = useRef(false);
  const { clearErrors, showError } = useFileImportErrors();
  const [, setText] = useFileText();
  const [, setFilename] = useFilename();
  const [show, setShow] = useState(false);
  const [pickerKey, setPickerKey] = useState(0); // to force re-render of DrivePicker when props change
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const showPicker = (show: boolean) => {
    if (show) {
      setPickerKey((prev) => prev + 1);
    }
    setShow(show);
  };
  return (
    <PickerContext value={showPicker}>
      {children}
      <ClientOnly>
        {show && (
          <DrivePicker
            key={pickerKey}
            client-id={clientId}
            app-id={appId}
            developer-key={apiKey}
            prompt="consent"
            oauth-token={accessToken ?? undefined}
            onOauthResponse={(e) => {
              gapi.client.setToken({ access_token: e.detail.access_token });
              setAccessToken(e.detail.access_token);
            }}
            onPicked={async (e) => {
              const { docs } = e.detail;
              const doc = docs?.at(0);
              if (!doc) {
                console.warn("No document selected");
                return;
              }
              if (!filesApiRef.current) {
                try {
                  await gapi.client.load("drive", "v3");
                  filesApiRef.current = true;
                } catch (error) {
                  showError({
                    type: "error",
                    message: t("editor.gdoc.error.google_drive_api"),
                    error,
                  });
                  console.error("Error loading Drive API:", error);
                  return;
                }
              }
              if (
                !("drive" in gapi.client) ||
                gapi.client.drive === undefined ||
                !filesApiRef.current
              ) {
                console.error("gapi.client.drive is undefined");
                showError({
                  type: "error",
                  message: t("editor.gdoc.error.google_drive_api"),
                  error: new ReferenceError("Google Drive API is not loaded"),
                });
                return;
              }
              clearErrors();
              setFilename(doc.name ?? null);
              if (
                doc.mimeType ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              ) {
                try {
                  // prettier-ignore
                  // @ts-expect-error: gapi.client.drive.files.get does not have a proper TypeScript definition for the responseType option.
                  const res = await gapi.client.drive.files.get({ fileId: doc.id, alt: "media" }, { responseType: "arraybuffer" });
                  const { value, messages } = await convertToHtml(
                    { arrayBuffer: res.body as unknown as ArrayBuffer },
                    convertOptions
                  );
                  if (messages.length) {
                    showError(...messages);
                    console.error(messages);
                  }
                  setText(value);
                } catch (err) {
                  console.error("Error fetching or converting docx file:", err);
                  showError({
                    type: "error",
                    message: t("editor.gdoc.error.docx"),
                    error: err,
                  });
                }
              } else if (
                doc.mimeType === "application/vnd.google-apps.document"
              ) {
                try {
                  const res = await gapi.client.drive.files.export({
                    fileId: doc.id,
                    mimeType: "text/html",
                  });
                  // Extract html body content.
                  if (!res.body) {
                    showError({
                      type: "error",
                      message: t("editor.gdoc.error.gdoc_empty"),
                      error: new Error("Empty response body"),
                    });
                    console.error(
                      "Empty response body when exporting Google Doc"
                    );
                    return;
                  }
                  const parser = new DOMParser();
                  const parsed = parser.parseFromString(res.body, "text/html");
                  setText(parsed.body.innerHTML);
                } catch (err) {
                  console.error("Error fetching or converting gdoc file:", err);
                  showError({
                    type: "error",
                    message: t("editor.gdoc.error.gdoc"),
                    error: err,
                  });
                }
                // } else if (doc.mimeType === "text/x-tex") {
                //   try {
                //     // prettier-ignore
                //     // @ts-expect-error: gapi.client.drive.files.get does not have a proper TypeScript definition for the responseType option.
                //     const content = await gapi.client.drive.files.get({ fileId: doc.id, alt: "media", }, { responseType: "text" });
                //     const generator = new HtmlGenerator({ hyphenate: false });
                //     const doc = parse(content.body, { generator }).htmlDocument();
                //     setText(doc.body.innerHTML);
                //   } catch (err) {
                //     console.error("Error fetching or converting tex file:", err);
                //     showError({
                //       type: "error",
                //       message: t("editor.gdoc.error.tex"),
                //       error: err,
                //     });
                //   }
              } else {
                console.warn("Unsupported file type:", doc.mimeType);
                showError({
                  type: "error",
                  message: t("editor.gdoc.error.unknown_type", {
                    type: doc.mimeType,
                  }),
                  error: new TypeError(doc.mimeType),
                });
              }
              setShow(false);
            }}
            onCanceled={() => setShow(false)}
            multiselect={false}
          >
            <DrivePickerDocsView
              mode="LIST"
              select-multiple={false}
              mime-types={[
                "application/vnd.google-apps.document",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ].join(",")}
            />
          </DrivePicker>
        )}
      </ClientOnly>
    </PickerContext>
  );
};
