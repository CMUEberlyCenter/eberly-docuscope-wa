import type { Meta, StoryObj } from "@storybook/react-vite";
import { StageHeader } from "./StageHeader";

const meta = {
  component: StageHeader,
  title: "component/StageHeader",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof StageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Stage Title",
  },
};
