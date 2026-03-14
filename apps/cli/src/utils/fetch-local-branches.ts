import { execSync } from "child_process";
import { GIT_TIMEOUT_MS } from "@browser-tester/supervisor";

export const fetchLocalBranches = (): string[] => {
  try {
    const output = execSync("git branch --format='%(refname:short)'", {
      encoding: "utf-8",
      timeout: GIT_TIMEOUT_MS,
    }).trim();
    if (!output) return [];
    return output.split("\n").filter(Boolean);
  } catch {
    return [];
  }
};
