import { FC, ReactNode, useId } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { Logo } from "../../../src/app/components/Logo/Logo";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const id = useId();
  return (
    <main className="container-fluid vh-100 w-100 d-flex flex-column align-items-stretch overflow-none">
      <Navbar>
        <Container>
          <Navbar.Brand href="/">
            <Logo /> Admin Dashboard
          </Navbar.Brand>
          <Navbar.Toggle aria-controls={id} />
          <Navbar.Collapse id={id}>
            <Nav className="me-auto">
              <Nav.Link href="/admin/">Home</Nav.Link>
              <Nav.Link href="/admin/settings">Settings</Nav.Link>
              <Nav.Link href="/admin/platforms">Platforms</Nav.Link>
              <Nav.Link href="/admin/performance">Performance</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="flex-grow-1 overflow-auto">{children}</Container>
    </main>
  );
};
