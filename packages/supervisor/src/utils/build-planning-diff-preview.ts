import { PLANNER_DIFF_BLOCK_LIMIT, PLANNER_DIFF_PREVIEW_CHAR_LIMIT } from "../constants.js";
import type { ChangedFile } from "../types.js";

const extractSummarySection = (diffPreview: string): string => {
  const firstDiffBlockIndex = diffPreview.indexOf("\ndiff --git ");
  if (firstDiffBlockIndex === -1) return diffPreview.trim();
  return diffPreview.slice(0, firstDiffBlockIndex).trim();
};

const splitDiffBlocks = (diffPreview: string): string[] => {
  const firstDiffBlockIndex = diffPreview.indexOf("diff --git ");
  if (firstDiffBlockIndex === -1) return [];

  const diffBody = diffPreview.slice(firstDiffBlockIndex);
  return diffBody
    .split("\ndiff --git ")
    .filter(Boolean)
    .map((block, index) => (index === 0 ? block.trim() : `diff --git ${block}`.trim()));
};

const extractDiffPath = (diffBlock: string): string | null => {
  const firstLine = diffBlock.split("\n")[0] ?? "";
  const diffPathMatch = firstLine.match(/^diff --git a\/(.+?) b\/(.+)$/);
  return diffPathMatch?.[2] ?? diffPathMatch?.[1] ?? null;
};

const trimPlanningDiffPreview = (diffPreview: string): string => {
  if (diffPreview.length <= PLANNER_DIFF_PREVIEW_CHAR_LIMIT) return diffPreview;
  return `${diffPreview.slice(0, PLANNER_DIFF_PREVIEW_CHAR_LIMIT)}\n...truncated...`;
};

export const buildPlanningDiffPreview = (
  diffPreview: string,
  prioritizedFiles: ChangedFile[],
): string => {
  if (!diffPreview) return "No diff preview available";

  const diffBlocksByPath = new Map(
    splitDiffBlocks(diffPreview)
      .map((diffBlock) => [extractDiffPath(diffBlock), diffBlock] as const)
      .filter(
        (entry): entry is readonly [string, string] =>
          Boolean(entry[0]) && typeof entry[1] === "string",
      ),
  );

  const relevantDiffBlocks = prioritizedFiles
    .map((changedFile) => diffBlocksByPath.get(changedFile.path))
    .filter((diffBlock): diffBlock is string => Boolean(diffBlock))
    .slice(0, PLANNER_DIFF_BLOCK_LIMIT);

  if (relevantDiffBlocks.length === 0) return trimPlanningDiffPreview(diffPreview);

  const summarySection = extractSummarySection(diffPreview);
  return trimPlanningDiffPreview(
    [summarySection, ...relevantDiffBlocks].filter(Boolean).join("\n\n"),
  );
};
