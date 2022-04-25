import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from "react";
import TabTitle from "./TabTitle";

it("TabTitle", () => {
  render(<TabTitle/>);
  expect(screen.getByRole('heading').textContent).toBe('');
});

it("TabTitle with text", () => {
  render(<TabTitle>Title</TabTitle>);
  expect(screen.getByRole('heading').textContent).toBe('Title');
})
