import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "./+data";
import { Card } from "react-bootstrap";

export const Page: FC = () => {
  const { performance } = useData<Data>();
  return (
    <Card>
      <Card.Header>Performance Data</Card.Header>
      <Card.Body>
        <Card.Text>
          <pre>{JSON.stringify(performance, null, 2)}</pre>
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
