import { FC } from "react";
import { Card } from "react-bootstrap";
import { usePageContext } from "vike-react/usePageContext";

export const Page: FC = () => {
  const { settings } = usePageContext();

  return (
    <Card>
      <Card.Header>Settings</Card.Header>
      <Card.Body>
        <h2>Current Global Tool Settings</h2>
        <pre>{JSON.stringify(settings, null, 2)}</pre>
      </Card.Body>
    </Card>
  );
};
