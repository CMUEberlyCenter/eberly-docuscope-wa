/*
  This component is a provider that wraps around file upload related contexts.

  Because of drive-picker-element, this provider must be in a +Layout file so that
  HTMLElement is defined.
*/
import {
  type FC,
  type ReactNode,
} from "react";
import { FileImportErrorProvider } from "./FileImportErrors";
import { FileTextProvider } from "./FileTextContext";
import { FileUploadProvider } from "./FileUploadContext";
import { PickerProvider } from "./PickerContext";

type Props = {
  children: ReactNode;
  clientId?: string;
  apiKey?: string;
  appId?: string;
};
/**
 * @component
 * Provider that wraps around file upload related contexts.
 * @param param0.children - The children to render inside the provider.
 * @param param0.clientId - The Google API client ID.
 * @param param0.apiKey - The Google API key.
 * @param param0.appId - The Google App ID.
 * @returns
 */
export const ImportProvider: FC<Props> = ({ children, clientId, apiKey, appId }) => {
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
