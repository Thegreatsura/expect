import { Match, Predicate } from "effect";
import cliTruncate from "cli-truncate";
import { TESTING_TOOL_TEXT_CHAR_LIMIT } from "../constants";

export interface FormattedToolCall {
  name: string;
  args: string;
}

interface ToolInput {
  url?: string;
  code?: string;
  mode?: string;
  type?: string;
  method?: string;
  fullPage?: boolean;
  headed?: boolean;
  waitUntil?: string;
  resourceType?: string;
  clear?: boolean;
}

const parseInput = (raw: unknown): ToolInput => {
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Predicate.isObject(parsed)) return parsed as ToolInput;
    } catch {
      return {};
    }
  }
  if (Predicate.isObject(raw)) return raw as ToolInput;
  return {};
};

const normalizeName = (toolName: string): string => {
  const match = toolName.match(/^mcp__.+__(.+)$/);
  return match ? match[1] : toolName;
};

export const formatToolCall = (toolName: string, rawInput: unknown): FormattedToolCall => {
  const name = normalizeName(toolName);
  const input = parseInput(rawInput);

  const args: string = Match.value(name).pipe(
    Match.when("open", () => (input.url ? `"${input.url}"` : "")),
    Match.when("screenshot", () => {
      const mode = input.mode ?? "screenshot";
      return mode === "screenshot" ? "" : mode;
    }),
    Match.when("playwright", () => cliTruncate(input.code ?? "", TESTING_TOOL_TEXT_CHAR_LIMIT)),
    Match.when("console_logs", () => (input.type ? `type: "${input.type}"` : "")),
    Match.when("network_requests", () => {
      const parts: string[] = [];
      if (input.method) parts.push(input.method);
      if (input.url) parts.push(`"${input.url}"`);
      return parts.join(", ");
    }),
    Match.when("performance_metrics", () => ""),
    Match.when("close", () => ""),
    Match.orElse(() => summarizeInput(input)),
  );

  return { name, args };
};

const summarizeInput = (input: ToolInput): string => {
  const values = Object.values(input).filter(
    (value) => typeof value === "string" && value.length > 0,
  );
  if (values.length === 0) return "";
  return cliTruncate(values.join(", "), TESTING_TOOL_TEXT_CHAR_LIMIT);
};
