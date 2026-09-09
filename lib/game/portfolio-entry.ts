export type PortfolioEntryView = "intro" | "world" | "index";

/** Only an explicit, recognized entry bypasses the opening sequence. */
export function getPortfolioEntryView(
  searchParams: Pick<URLSearchParams, "getAll">,
): PortfolioEntryView {
  const views = searchParams.getAll("view");
  if (views.length !== 1) return "intro";
  return views[0] === "index" || views[0] === "world" ? views[0] : "intro";
}
