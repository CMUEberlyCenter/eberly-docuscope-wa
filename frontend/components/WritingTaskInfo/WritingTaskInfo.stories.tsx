import type { Meta, StoryObj } from "@storybook/react-vite";
import CoverLetter from "../../test/CoverLetter.json";
import { WritingTaskInfo } from "./WritingTaskInfo";

const meta = {
  component: WritingTaskInfo,
  title: "component/WritingTaskInfo",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof WritingTaskInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    task: CoverLetter,
  },
};
