import React from "react";
import TabTitle from "./TabTitle";
import '@testing-library/jest-dom';
import {render, screen} from '@testing-library/react'

it("TabTitle", () => {
  render(<TabTitle/>);
  expect(screen.getByRole('heading').textContent).toBe('');
});

it("TabTitle with text", () => {
  render(<TabTitle>Title</TabTitle>);
  expect(screen.getByRole('heading').textContent).toBe('Title');
})
