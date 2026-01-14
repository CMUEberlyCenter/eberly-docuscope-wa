import type { Meta, StoryObj } from "@storybook/react-vite";
import CoverLetter from "../../test/CoverLetter.json";
import { WritingTaskRulesTree } from "./WritingTaskRulesTree";

const meta = {
  component: WritingTaskRulesTree,
  title: "component/WritingTaskRulesTree",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof WritingTaskRulesTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCoverLetterTask: Story = {
  args: {
    task: CoverLetter,
  },
};

export const WithCoverLetterTaskAndTitle: Story = {
  args: {
    task: CoverLetter,
    includeTitle: true,
  },
};

export const LeafOnlySelection: Story = {
  args: {
    task: CoverLetter,
    leafOnly: true,
  },
};
