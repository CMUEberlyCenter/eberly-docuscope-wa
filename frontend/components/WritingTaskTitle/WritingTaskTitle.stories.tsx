import { WritingTaskTitle } from "./WritingTaskTitle";
import type { Meta, StoryObj } from "@storybook/react";
import CoverLetter from "../../test/CoverLetter.json";

const meta = {
  component: WritingTaskTitle,
  title: "component/WritingTaskTitle",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof WritingTaskTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCoverLetterTask: Story = {
  args: {
    task: CoverLetter,
  },
};
