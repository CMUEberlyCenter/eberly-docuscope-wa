/**
 * @file About.stories.tsx
 * @description Storybook configuration for the About component.
 * @see About.tsx
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { About } from "./About";

const meta = {
  component: About,
  title: "component/About",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof About>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
