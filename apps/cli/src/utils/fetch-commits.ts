import { execSync } from "child_process";
import type { CommitSummary } from "@browser-tester/supervisor";
import { GIT_TIMEOUT_MS } from "@browser-tester/supervisor";
import { COMMIT_LIMIT } from "../constants.js";

export interface Commit extends CommitSummary {
  author: string;
  relativeDate: string;
}

const FIELD_SEPARATOR = "---FIELD---";

export const fetchCommits = (limit: number = COMMIT_LIMIT): Commit[] => {
  try {
    const format = ["%H", "%h", "%s", "%an", "%cr"].join(FIELD_SEPARATOR);
    const output = execSync(`git log --format="${format}" -n ${limit}`, {
      encoding: "utf-8",
      timeout: GIT_TIMEOUT_MS,
    }).trim();

    if (!output) return [];

    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, subject, author, relativeDate] = line.split(FIELD_SEPARATOR);
        return { hash, shortHash, subject, author, relativeDate };
      });
  } catch {
    return [];
  }
};
