import { describe, expect, it } from "vitest";
import { extractJsonObject } from "../src/json.js";

describe("extractJsonObject", () => {
  it("extracts JSON from a fenced code block", () => {
    const input = [
      "Here is your plan:",
      "```json",
      '{"title":"Plan","steps":[]}',
      "```",
      "Extra commentary after the block.",
    ].join("\n");

    expect(extractJsonObject(input)).toBe('{"title":"Plan","steps":[]}');
  });

  it("extracts the first balanced object when trailing text includes braces", () => {
    const input =
      '{"title":"Plan","message":"Use {braces} safely","steps":[]}\nAdditional notes {ignored}';

    expect(extractJsonObject(input)).toBe(
      '{"title":"Plan","message":"Use {braces} safely","steps":[]}',
    );
  });

  it("normalizes escaped json extracted from a fenced block", () => {
    const input = '```json\\n{\\n  \\"title\\": \\"Plan\\",\\n  \\"steps\\": []\\n}\\n```';

    expect(extractJsonObject(input)).toBe('{\n  "title": "Plan",\n  "steps": []\n}');
  });
});
