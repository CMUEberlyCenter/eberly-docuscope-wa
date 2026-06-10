/*
  This component is a provider that wraps around file upload related contexts.

  Because of drive-picker-element, this provider must be in a +Layout file so that
  HTMLElement is defined.
*/
import { type FC, type ReactNode } from "react";
import { FileImportErrorProvider } from "./FileImportErrors";
import { FileTextProvider } from "./FileTextContext";
import { FileUploadProvider } from "./FileUploadContext";
import { PickerProvider } from "./PickerContext";

type Props = {
  /** The children to render inside the provider. */
  children: ReactNode;
  /** The Google API client ID. */
  clientId?: string;
  /** The Google API key. */
  apiKey?: string;
  /** The Google App ID. */
  appId?: string;
};
/**
 * @component
 * Provider that wraps around file upload related contexts.
 */
export const ImportProvider: FC<Props> = ({
  children,
  clientId,
  apiKey,
  appId,
}) => {
  return (
    <FileImportErrorProvider>
      <FileTextProvider>
        <FileUploadProvider>
          <PickerProvider clientId={clientId} apiKey={apiKey} appId={appId}>
            {children}
          </PickerProvider>
        </FileUploadProvider>
      </FileTextProvider>
    </FileImportErrorProvider>
  );
};
