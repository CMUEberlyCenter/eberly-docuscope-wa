import { FC } from "react";
import { Alert } from "react-bootstrap";

export const DisabledAlert: FC = () => (
  <Alert variant="warning">
    The myScribe feature is currently disabled. Click &apos;myScribe&apos; in
    the &apos;Help&apos; menu to enable it.
  </Alert>
);
