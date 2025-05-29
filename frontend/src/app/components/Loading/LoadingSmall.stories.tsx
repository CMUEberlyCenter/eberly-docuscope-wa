import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingSmall } from "./LoadingSmall";

const meta = {
  component: LoadingSmall,
  tags: ["autodocs"],
  title: "component/LoadingSmall",
  excludeStories: /.*Data$/,
} satisfies Meta<typeof LoadingSmall>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
