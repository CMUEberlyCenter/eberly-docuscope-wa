import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Explicitly tell tailwind-merge to treat 'tw' as the root prefix modifier
const customTwMerge = extendTailwindMerge({
  prefix: "tw",
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
