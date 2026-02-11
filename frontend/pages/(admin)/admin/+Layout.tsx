import { FC, ReactNode, useId } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Logo } from "../../../components/Logo/Logo";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation("admin");
  const id = useId();
  return (
    <main className="container-fluid vh-100 w-100 d-flex flex-column align-items-stretch overflow-none">
      <Navbar>
        <Container>
          <Navbar.Brand>
            <Logo /> {t("title")}
          </Navbar.Brand>
          <Navbar.Toggle aria-controls={id} />
          <Navbar.Collapse id={id}>
            <Nav className="me-auto">
              <Nav.Link href="/admin/">{t("home")}</Nav.Link>
              <Nav.Link href="/admin/settings">{t("settings.tab")}</Nav.Link>
              <Nav.Link href="/admin/platforms">{t("platforms.tab")}</Nav.Link>
              <Nav.Link href="/admin/performance">
                {t("performance.tab")}
              </Nav.Link>
              <Nav.Link href="/admin/genlink">{t("genlink.tab")}</Nav.Link>
              <Nav.Link href="/admin/writing_tasks">
                {t("writing_tasks.tab")}
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="flex-grow-1 overflow-auto">{children}</Container>
    </main>
  );
};
