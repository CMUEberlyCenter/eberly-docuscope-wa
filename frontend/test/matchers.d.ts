import { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { expect } from "bun:test";

declare module "bun:test" {
  interface Matchers<T> extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchers<E,R> extends TestingLibraryMatchers<E,R> {}
}
