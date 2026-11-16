import { describe, expect, it } from "vitest";
import { playgroundSubtitle, SENSITIVE_REVIEW_ADVICE } from "./playground-copy";

describe("playgroundSubtitle", () => {
  it("does not mention running SQL when execute is off", () => {
    expect(playgroundSubtitle(false)).toBe("Generate SQL from natural language");
  });

  it("says Studio can run the SQL when execute is on", () => {
    expect(playgroundSubtitle(true)).toContain("run it through the connection you configured");
  });
});

describe("sensitive-column advice", () => {
  it("does not imply AskDB runs SQL", () => {
    expect(SENSITIVE_REVIEW_ADVICE).toBe("Review carefully before sharing or running this SQL.");
  });
});
