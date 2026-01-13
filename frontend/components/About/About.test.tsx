// import { cleanup } from "@testing-library/react";
// import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { About } from "./About"; // react 19 use pattern causes error in tests as location.href is not set.
import { act } from "react";

describe("About", () => {
  test("link creation", async () => {
    render(<About />);
    const title = screen.getByText(/about.title/)
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
