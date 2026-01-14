import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextToSpeech } from "./TextToSpeech";

const meta = {
  component: TextToSpeech,
  title: "component/TextToSpeech",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof TextToSpeech>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "This is a sample text to demonstrate the Text to Speech component.",
    enabled: true,
  },
};
