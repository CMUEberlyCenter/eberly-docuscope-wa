// import "@googleworkspace/drive-picker-element";
import { createContext, useContext } from 'react';
// import type { DrivePickerElement } from "@googleworkspace/drive-picker-element";
type PickerCallback = (doc?: google.picker.DocumentObject) => void;
export const PickerContext = createContext<(callback: PickerCallback) => void>(
  () => {}
);
export const usePicker = () => useContext(PickerContext);

/*export const PickerProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // const ref = useRef<DrivePickerElement | null>(null);
  // const clientId = import.meta.env.GOOGLE_CLIENT_ID;
  // const developerKey = import.meta.env.GOOGLE_API_KEY;
  // const appId = import.meta.env.GOOGLE_APP_KEY;
  return (<div>
    <drive-picker ref={ref}
      client-id={clientId}
      app-id={appId}
      ></drive-picker>
    {children}
  </div>);
};*/
