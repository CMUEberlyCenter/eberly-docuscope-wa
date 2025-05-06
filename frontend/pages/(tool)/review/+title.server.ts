import type { PageContextServer } from "vike/types";

export function title(pageContext: PageContextServer) {
  return pageContext.t?.("document.title", { ns: 'review', defaultValue: "myProse Editor"}) ?? "myProse Editor";
}
