import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCREENSHOT_DIRECTORY_PREFIX, SCREENSHOT_OUTPUT_DIRECTORY_PATH } from "../constants.js";

interface BrowserToolResultContentItem {
  type?: unknown;
  data?: unknown;
  mimeType?: unknown;
}

interface BrowserToolResultPayload {
  content?: unknown;
}

interface BrowserImageContent {
  data: string;
  mimeType: string;
}

export interface SavedBrowserImageResult {
  outputDirectoryPath: string;
  outputPath: string;
  resultText: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getBrowserImageContent = (result: string): BrowserImageContent | null => {
  try {
    const parsedValue: unknown = JSON.parse(result);
    if (!isRecord(parsedValue)) return null;

    const payload: BrowserToolResultPayload = parsedValue;
    if (!Array.isArray(payload.content)) return null;

    for (const contentItem of payload.content) {
      if (!isRecord(contentItem)) continue;

      const browserToolResultContentItem: BrowserToolResultContentItem = contentItem;
      if (
        browserToolResultContentItem.type !== "image" ||
        typeof browserToolResultContentItem.data !== "string" ||
        typeof browserToolResultContentItem.mimeType !== "string"
      ) {
        continue;
      }

      return {
        data: browserToolResultContentItem.data,
        mimeType: browserToolResultContentItem.mimeType,
      };
    }

    return null;
  } catch {
    return null;
  }
};

const getImageFileExtension = (mimeType: string): string | null => {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    default:
      return null;
  }
};

export const saveBrowserImageResult = (options: {
  browserAction: string;
  outputDirectoryPath?: string;
  result: string;
}): SavedBrowserImageResult | null => {
  const browserImageContent = getBrowserImageContent(options.result);
  if (!browserImageContent) return null;

  const imageFileExtension = getImageFileExtension(browserImageContent.mimeType);
  if (!imageFileExtension) return null;

  const outputDirectoryPath =
    options.outputDirectoryPath ??
    mkdtempSync(join(SCREENSHOT_OUTPUT_DIRECTORY_PATH, SCREENSHOT_DIRECTORY_PREFIX));
  const outputPath = join(
    outputDirectoryPath,
    `${options.browserAction}-${randomUUID()}.${imageFileExtension}`,
  );

  writeFileSync(outputPath, Buffer.from(browserImageContent.data, "base64"));

  return {
    outputDirectoryPath,
    outputPath,
    resultText: `Screenshot saved to ${outputPath}`,
  };
};
