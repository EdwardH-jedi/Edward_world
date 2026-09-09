import { describe, expect, it } from "vitest";
import { getPortfolioEntryView } from "@/lib/game/portfolio-entry";

describe("explicit portfolio entry", () => {
  it.each(["", "?other=index", "?view=", "?view=unknown", "?view=INDEX"])(
    "retains the fresh opening for %s",
    (query) => expect(getPortfolioEntryView(new URLSearchParams(query))).toBe("intro"),
  );

  it("opens the professional Index on a document return or refresh", () => {
    expect(getPortfolioEntryView(new URLSearchParams("?view=index"))).toBe("index");
  });

  it("restores the world after leaving Index", () => {
    expect(getPortfolioEntryView(new URLSearchParams("?view=world"))).toBe("world");
  });

  it("does not let unrelated query parameters change an explicit destination", () => {
    expect(getPortfolioEntryView(new URLSearchParams("?from=details&view=index"))).toBe("index");
  });

  it.each(["?view=index&view=world", "?view=index&view=index"])(
    "treats an ambiguous repeated destination as a fresh visit: %s",
    (query) => expect(getPortfolioEntryView(new URLSearchParams(query))).toBe("intro"),
  );
});
