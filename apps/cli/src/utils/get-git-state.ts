import type { DiffStats } from "@browser-tester/supervisor";
import {
  getBranchCommits,
  getBranchDiffStats,
  getCurrentBranchName,
  getMainBranchName,
  getUnstagedDiffStats,
} from "@browser-tester/supervisor";

const MAIN_BRANCH_NAMES = ["main", "master"];

export interface GitState {
  currentBranch: string;
  isOnMain: boolean;
  hasUnstagedChanges: boolean;
  hasBranchCommits: boolean;
  diffStats: DiffStats | null;
  branchDiffStats: DiffStats | null;
}

export type TestScope = "unstaged-changes" | "select-commit" | "entire-branch" | "select-branch";

export const getGitState = (): GitState => {
  const cwd = process.cwd();
  const currentBranch = getCurrentBranchName(cwd);
  const isOnMain = MAIN_BRANCH_NAMES.includes(currentBranch);
  const diffStats = getUnstagedDiffStats(cwd);
  const hasUnstagedChanges = diffStats !== null;

  let branchDiffStats: DiffStats | null = null;
  let hasBranchCommits = false;
  if (!isOnMain) {
    const mainBranch = getMainBranchName(cwd);
    if (mainBranch) {
      hasBranchCommits = getBranchCommits(cwd, mainBranch).length > 0;
      branchDiffStats = getBranchDiffStats(cwd, mainBranch);
    }
  }

  return {
    currentBranch,
    isOnMain,
    hasUnstagedChanges,
    hasBranchCommits,
    diffStats,
    branchDiffStats,
  };
};

export const getRecommendedScope = (gitState: GitState): TestScope => {
  if (gitState.isOnMain) {
    return gitState.hasUnstagedChanges ? "unstaged-changes" : "select-commit";
  }
  if (gitState.hasUnstagedChanges) return "unstaged-changes";
  return gitState.hasBranchCommits ? "entire-branch" : "select-branch";
};
