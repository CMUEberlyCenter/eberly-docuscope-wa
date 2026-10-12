import { UserButton } from "#components/auth/user/user-button.tsx";
import { Logo } from "#components/Logo/Logo";
import { FC, ReactNode, useId } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { usePageContext } from "vike-react/usePageContext";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation("admin");
  const id = useId();
  const { urlPathname } = usePageContext();
  // pageContext.urlParsed.pathname
  return (
    <main className="container-fluid vh-100 w-100 d-flex flex-column align-items-stretch overflow-none">
      <Navbar>
        <div className="tw:flex tw:flex-row tw:px-12 tw:w-full">
          <Navbar.Brand>
            <Logo /> {t("title")}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls={id} />
          <Navbar.Collapse id={id}>
            <Nav
              className="me-auto flex-wrap"
              variant="underline"
              defaultActiveKey={"home"}
            >
              <Nav.Link
                active={urlPathname === "/admin/"}
                href="/admin/"
                eventKey={"home"}
              >
                {t("home")}
              </Nav.Link>
              <Nav.Link
                active={urlPathname === "/admin/settings"}
                href="/admin/settings"
              >
                {t("settings.tab")}
              </Nav.Link>
              <Nav.Link
                active={urlPathname === "/admin/platforms"}
                href="/admin/platforms"
              >
                {t("platforms.tab")}
              </Nav.Link>
              <Nav.Link
                active={urlPathname === "/admin/performance"}
                href="/admin/performance"
              >
                {t("performance.tab")}
              </Nav.Link>
              <Nav.Link
                active={urlPathname === "/admin/genlink"}
                href="/admin/genlink"
              >
                {t("genlink.tab")}
              </Nav.Link>
              <Nav.Link
                active={urlPathname === "/admin/writing_tasks"}
                href="/admin/writing_tasks"
              >
                {t("writing_tasks.tab")}
              </Nav.Link>
              <Nav.Link
                active={urlPathname === "/admin/users"}
                href="/admin/users"
              >
                {t("users.tab")}
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
          <div>
            <UserButton className="rounded" />
          </div>
        </div>
      </Navbar>
      <Container className="flex-grow-1 overflow-auto">{children}</Container>
    </main>
  );
};
