import type { FC } from "react";
import { Nav, Navbar } from "react-bootstrap";
import { Logo } from "../Logo/Logo";

export const StageHeader: FC<{ title: string }> = ({ title }) => (
  <header>
    <Navbar className="border-bottom py-0 mb-1 mt-0 d-flex align-items-baseline justify-content-between">
      <Nav>
        <Nav.Item className="active text-primary ms-3">{title}</Nav.Item>
      </Nav>
      <Navbar.Brand>
        <Logo />
      </Navbar.Brand>
    </Navbar>
  </header>
);
