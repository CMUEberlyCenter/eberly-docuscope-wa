import { PageContextServer } from "vike/types";

export function title(pageContext: PageContextServer) {
  return pageContext.t?.("genlink.title", "myProse Link Generator") ?? "myProse Link Generator";
}
