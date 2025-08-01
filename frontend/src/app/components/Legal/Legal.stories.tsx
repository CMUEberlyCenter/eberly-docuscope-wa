import { Legal } from "./Legal";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  component: Legal,
  title: "component/Legal",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof Legal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
