import type { FC } from "react";
import { Nav, Navbar } from "react-bootstrap";
import { Logo } from "../Logo/Logo";

/**
 * Header component for displaying the stage title and logo.
 * ```tsx
 * <StageHeader title="Review" />
 * ```
 */
export const StageHeader: FC<{
  /** The title of the stage. */
  title: string;
  /** Optional user profile button. */
  user?: React.ReactNode;
}> = ({ title, user }) => (
  <header>
    <Navbar
      className="border-bottom py-1 mb-1 mt-0 d-flex align-items-baseline justify-content-between"
      style={{ height: 48 }}
    >
      <Nav>
        <Nav.Item
          className="active text-primary ms-3"
          style={{ fontWeight: 600 }}
        >
          {title}
        </Nav.Item>
      </Nav>
      <Navbar.Brand>
        <Logo />
      </Navbar.Brand>
      {user && (
        <Nav>
          <Nav.Item className="me-3">{user}</Nav.Item>
        </Nav>
      )}
    </Navbar>
  </header>
);
