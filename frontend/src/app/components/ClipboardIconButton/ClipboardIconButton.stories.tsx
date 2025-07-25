import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClipboardIconButton } from "./ClipboardIconButton";

const meta = {
  component: ClipboardIconButton,
  title: "component/ClipboardIconButton",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof ClipboardIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
