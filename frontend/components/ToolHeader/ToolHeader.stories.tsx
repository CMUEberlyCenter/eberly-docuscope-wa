import { ToolHeader } from "./ToolHeader";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  component: ToolHeader,
  title: "component/ToolHeader",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof ToolHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Sample Tool",
    instructionsKey: "sample_tool_instructions",
  },
};
