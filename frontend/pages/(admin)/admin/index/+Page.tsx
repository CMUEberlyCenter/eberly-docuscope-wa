import { FC } from "react";
import { Card } from "react-bootstrap";

export const Page: FC = () => {
  return (
    <Card>
      <Card.Header>Admin Dashboard</Card.Header>
      <Card.Body>
        <Card.Text>
          Welcome to the admin dashboard. Use the navigation to manage
          platforms, users, and settings.
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
