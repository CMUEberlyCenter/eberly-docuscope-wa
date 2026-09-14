import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { About } from "./About";

describe("About", () => {

  beforeAll(() => {
    vi.stubGlobal("__APP_VERSION__", "TEST");
    vi.stubGlobal("__BUILD_DATE__", new Date().toISOString());
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test("link creation", async () => {
    render(<About />);
    const title = screen.getByText(/about.title/);
    expect(title).toBeInTheDocument();
    const null_link = screen.queryByText(/about.project_link_title/);
    expect(null_link).not.toBeInTheDocument();

    // modal needs to be opened to test further
    act(() => {
      title.click();
    });

    const project_link = screen.getByText(/about.project_link_title/);
    expect(project_link).toBeInTheDocument();
    expect(project_link).toHaveAttribute(
      "href",
      "https://www.cmu.edu/dietrich/english/research-and-publications/myprose.html"
    );
    const build = screen.getByText(/about.build/);
    expect(build).toBeInTheDocument();
  });
});
